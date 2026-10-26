import {
  createAgentSession,
  ModelRuntime,
  SessionManager,
} from "@earendil-works/pi-coding-agent";
import { appendFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { HarnessConfig } from "../config/schema.js";
import type { ExecutionRequest, ExecutionResult, ModelCandidate } from "../domain/types.js";
import { withLmStudioModel } from "../providers/lmstudio.js";
import { redact } from "../security/redaction.js";
import { nowUtc, safeError, writeJson } from "../utils/core.js";
import type { Executor } from "./types.js";

const resultKeys = ["taskId", "outcome", "summary", "changedFiles", "claimedChecks", "decisions", "blockers", "suggestedFollowUps"];
const resultOutcomes = new Set(["ready_for_verification", "changes_requested", "blocked", "failed"]);
const outcomeAliases = new Map([
  ["needs_changes", "changes_requested"],
  ["revisions_requested", "changes_requested"],
]);
const MAX_RAW_RESPONSE_CHARS = 64_000;

export function localApiFor(candidate: ModelCandidate): "openai-completions" | "openai-responses" {
  return candidate.family === "gpt-oss" || candidate.modelId.includes("gpt-oss")
    ? "openai-responses"
    : "openai-completions";
}

export function lastAssistantOutput(messages: readonly unknown[], preferredText?: string): string | undefined {
  if (preferredText?.trim()) return preferredText.trim();
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const value = messages[index];
    if (!value || typeof value !== "object") continue;
    const message = value as { role?: unknown; content?: unknown };
    if (message.role !== "assistant" || !Array.isArray(message.content)) continue;
    const thinking = message.content.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const block = item as { type?: unknown; thinking?: unknown; redacted?: unknown };
      return block.type === "thinking" && typeof block.thinking === "string" && block.redacted !== true
        ? [block.thinking]
        : [];
    }).join("\n").trim();
    if (thinking) return thinking;
  }
  return undefined;
}

class PiExecutionError extends Error {
  constructor(readonly phase: string, cause: unknown) {
    super(safeError(cause), { cause });
    this.name = "PiExecutionError";
  }
}

function errorDetails(error: unknown, patterns: string[]): { name: string; message: string; stack?: string } {
  if (!(error instanceof Error)) return { name: "UnknownError", message: redact(String(error), patterns) };
  return {
    name: error.name,
    message: redact(error.message, patterns),
    ...(error.stack ? { stack: redact(error.stack, patterns) } : {}),
  };
}

function eventSummary(event: unknown): Record<string, unknown> | null {
  if (!event || typeof event !== "object") return null;
  const value = event as Record<string, unknown>;
  const type = typeof value.type === "string" ? value.type : "unknown";
  const summary: Record<string, unknown> = { at: nowUtc(), type };
  if (["tool_execution_start", "tool_execution_end"].includes(type)) {
    summary.toolName = value.toolName;
    if (type === "tool_execution_end") {
      summary.isError = value.isError;
      summary.durationMs = value.durationMs;
    }
    return summary;
  }
  if (["auto_retry_start", "auto_retry_end", "agent_settled", "compaction_end"].includes(type)) {
    for (const key of ["attempt", "maxAttempts", "delayMs", "errorMessage", "finalError", "success", "aborted", "willRetry"]) {
      if (key in value) summary[key] = value[key];
    }
    return summary;
  }
  if (["agent_start", "agent_end", "turn_start", "turn_end", "message_start", "message_end"].includes(type)) return summary;
  return null;
}

export function extractResult(
  text: string | undefined,
  taskId: string,
  acceptedTaskIds: string[] = [taskId],
): ExecutionResult {
  if (!text) throw new Error("A sessão Pi terminou sem resposta textual.");
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)?.[1];
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  const raw = fenced ?? (first >= 0 && last > first ? text.slice(first, last + 1) : text);
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if (!resultKeys.every((key) => key in parsed) || typeof parsed.taskId !== "string") {
    throw new Error("Resultado do Pi não atende ao contrato estruturado da tarefa.");
  }
  if (!acceptedTaskIds.includes(parsed.taskId)) {
    throw new Error(`Resultado do Pi retornou taskId inesperado: ${parsed.taskId}.`);
  }
  if (typeof parsed.outcome !== "string") throw new Error("Resultado do Pi retornou outcome inválido.");
  parsed.outcome = outcomeAliases.get(parsed.outcome) ?? parsed.outcome;
  if (!resultOutcomes.has(parsed.outcome as string)) {
    throw new Error(`Resultado do Pi retornou outcome inesperado: ${String(parsed.outcome)}.`);
  }
  parsed.taskId = taskId;
  return parsed as unknown as ExecutionResult;
}

async function createRuntime(candidate: ModelCandidate): Promise<{ runtime: ModelRuntime; model: NonNullable<ReturnType<ModelRuntime["getModel"]>> }> {
  const runtime = await ModelRuntime.create({ allowModelNetwork: false });
  if (candidate.modality === "local") {
    const endpoint = candidate.endpoint ?? "http://localhost:1235/v1";
    runtime.registerProvider(candidate.provider, {
      name: candidate.provider,
      baseUrl: endpoint.endsWith("/v1") ? endpoint : `${endpoint.replace(/\/$/, "")}/v1`,
      api: localApiFor(candidate),
      apiKey: "lm-studio",
      models: [{
        id: candidate.modelId,
        name: candidate.alias,
        input: candidate.capabilities.includes("vision") ? ["text", "image"] : ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        reasoning: candidate.capabilities.includes("reasoning"),
        contextWindow: candidate.contextTokens,
        maxTokens: candidate.maxOutputTokens,
      }],
    });
  }
  if (candidate.credentialEnv) {
    const credential = process.env[candidate.credentialEnv];
    if (!credential) throw new Error(`Credencial ausente: ${candidate.credentialEnv}`);
    await runtime.setRuntimeApiKey(candidate.provider, credential);
  }
  const model = runtime.getModel(candidate.provider, candidate.modelId);
  if (!model) throw new Error(`Pi não encontrou ${candidate.provider}/${candidate.modelId}.`);
  return { runtime, model };
}

export class PiExecutor implements Executor {
  readonly name = "pi";
  private abortCurrent: (() => Promise<void>) | undefined;

  constructor(private readonly config: HarnessConfig) {}

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    await mkdir(request.outputDirectory, { recursive: true, mode: 0o700 });
    let enteredSession = false;
    try {
      if (request.candidate.modality === "local") {
        return await withLmStudioModel(this.config, request.candidate, async () => {
          enteredSession = true;
          return this.executeSession(request);
        });
      }
      enteredSession = true;
      return await this.executeSession(request);
    } catch (error) {
      const failure = error instanceof PiExecutionError
        ? error
        : new PiExecutionError(enteredSession ? "session" : "model_load", error);
      const errorPath = path.join(request.outputDirectory, "execution-error.json");
      const rawResponsePath = path.join(request.outputDirectory, "raw-response.txt");
      const tracePath = path.join(request.outputDirectory, "session-trace.jsonl");
      await writeJson(errorPath, {
        at: nowUtc(), phase: failure.phase, provider: request.candidate.provider,
        modelId: request.candidate.modelId, alias: request.candidate.alias,
        timeoutMs: request.timeoutMs, error: errorDetails(failure.cause ?? failure, this.config.security.redactPatterns),
      });
      const failureSummary = redact(safeError(failure), this.config.security.redactPatterns);
      return {
        taskId: request.task.id, outcome: "failed", summary: `[${failure.phase}] ${failureSummary}`, changedFiles: [],
        claimedChecks: [], decisions: [], blockers: ["pi_execution_failed"], suggestedFollowUps: [],
        diagnostics: {
          phase: failure.phase, errorPath,
          ...(["response_parse", "timeout"].includes(failure.phase) ? { rawResponsePath } : {}),
          ...(enteredSession ? { tracePath } : {}),
        },
      };
    }
  }

  private async executeSession(request: ExecutionRequest): Promise<ExecutionResult> {
    let runtimeAndModel: Awaited<ReturnType<typeof createRuntime>>;
    try { runtimeAndModel = await createRuntime(request.candidate); }
    catch (error) { throw new PiExecutionError("runtime_setup", error); }
    let created: Awaited<ReturnType<typeof createAgentSession>>;
    try {
      created = await createAgentSession({
        cwd: request.workspace,
        modelRuntime: runtimeAndModel.runtime,
        model: runtimeAndModel.model,
        sessionManager: SessionManager.inMemory(),
        tools: request.readOnly ? ["read", "grep", "find", "ls"] : ["read", "bash", "edit", "write", "grep", "find", "ls"],
      });
    } catch (error) { throw new PiExecutionError("session_setup", error); }
    const { session } = created;
    const tracePath = path.join(request.outputDirectory, "session-trace.jsonl");
    appendFileSync(tracePath, `${JSON.stringify({
      at: nowUtc(), type: "session_start", provider: request.candidate.provider,
      modelId: request.candidate.modelId, alias: request.candidate.alias, timeoutMs: request.timeoutMs,
    })}\n`, { encoding: "utf8", mode: 0o600 });
    const unsubscribe = session.subscribe((event) => {
      const summary = eventSummary(event);
      if (summary) {
        const line = redact(JSON.stringify(summary), this.config.security.redactPatterns);
        appendFileSync(tracePath, `${line}\n`, { encoding: "utf8", mode: 0o600 });
      }
    });
    this.abortCurrent = () => session.abort();
    const timeoutState = { triggered: false };
    const timedOut = (): boolean => timeoutState.triggered;
    const timeout = setTimeout(() => { timeoutState.triggered = true; void session.abort(); }, request.timeoutMs);
    try {
      try { await session.prompt(request.prompt); }
      catch (error) { throw new PiExecutionError(timeoutState.triggered ? "timeout" : "provider_request", error); }
      if (timeoutState.triggered) throw new PiExecutionError("timeout", new Error(`Sessão excedeu ${request.timeoutMs} ms.`));
      const initialResponse = lastAssistantOutput(session.messages, session.getLastAssistantText());
      let rawResponse = initialResponse;
      const saveRawResponse = async (): Promise<void> => {
        const safeResponse = redact(rawResponse ?? "[EMPTY RESPONSE]", this.config.security.redactPatterns);
        const truncated = safeResponse.length > MAX_RAW_RESPONSE_CHARS;
        await writeFile(
          path.join(request.outputDirectory, "raw-response.txt"),
          `${safeResponse.slice(0, MAX_RAW_RESPONSE_CHARS)}${truncated ? "\n[TRUNCATED]\n" : "\n"}`,
          { encoding: "utf8", mode: 0o600 },
        );
      };
      let result: ExecutionResult;
      let initialParseError: unknown;
      try {
        result = extractResult(
          initialResponse, request.task.id,
          request.acceptedResultTaskIds ?? [request.task.id],
        );
      } catch (error) {
        initialParseError = error;
        const repairPrompt = [
          "Sua resposta anterior não apresentou o objeto JSON final válido.",
          "Não use ferramentas e não explique.",
          `Responda agora somente com o JSON solicitado. O campo taskId deve ser exatamente "${request.task.id}".`,
          "Inclua taskId, outcome, summary, changedFiles, claimedChecks, decisions, blockers e suggestedFollowUps.",
        ].join("\n");
        try { await session.prompt(repairPrompt); }
        catch (repairError) { throw new PiExecutionError(timedOut() ? "timeout" : "provider_request", repairError); }
        if (timedOut()) throw new PiExecutionError("timeout", new Error(`Sessão excedeu ${request.timeoutMs} ms.`));
        const repairedResponse = lastAssistantOutput(session.messages, session.getLastAssistantText());
        rawResponse = [
          "[INITIAL RESPONSE]", initialResponse ?? "[EMPTY RESPONSE]",
          "", "[REPAIR RESPONSE]", repairedResponse ?? "[EMPTY RESPONSE]",
        ].join("\n");
        try {
          result = extractResult(
            repairedResponse, request.task.id,
            request.acceptedResultTaskIds ?? [request.task.id],
          );
        } catch (repairParseError) {
          await saveRawResponse();
          throw new PiExecutionError(
            "response_parse",
            new Error(`Resposta inicial inválida: ${safeError(initialParseError)} Resposta de reparo inválida: ${safeError(repairParseError)}`),
          );
        }
      }
      await saveRawResponse();
      const stats = session.getSessionStats();
      result.usage = {
        inputTokens: stats.tokens.input,
        outputTokens: stats.tokens.output,
        cachedTokens: stats.tokens.cacheRead,
        costUsd: String(stats.cost),
      };
      return result;
    } finally {
      clearTimeout(timeout);
      this.abortCurrent = undefined;
      unsubscribe();
      appendFileSync(tracePath, `${JSON.stringify({ at: nowUtc(), type: "session_disposed", timedOut: timeoutState.triggered })}\n`, { encoding: "utf8", mode: 0o600 });
      session.dispose();
    }
  }

  async cancel(): Promise<void> { await this.abortCurrent?.(); }
}
