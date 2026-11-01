import {
  createAgentSession,
  ModelRuntime,
  SessionManager,
} from "@earendil-works/pi-coding-agent";
import { parseFromLLM } from "json-llm-repair";
import { appendFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { HarnessConfig } from "../config/schema.js";
import type { ExecutionRequest, ExecutionResult, ModelCandidate } from "../domain/types.js";
import { withLmStudioModel, type LocalModelDiagnostic } from "../providers/lmstudio.js";
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

export type ResultRepairDiagnostic = {
  status: "started" | "resolved" | "unresolved" | "skipped";
  reason: string;
  responseChars: number;
  detail?: string;
};

type ResultRepairObserver = (diagnostic: ResultRepairDiagnostic) => void;

export function localApiFor(candidate: ModelCandidate): "openai-completions" | "openai-responses" {
  return candidate.family === "gpt-oss" || candidate.modelId.includes("gpt-oss")
    ? "openai-responses"
    : "openai-completions";
}

export function supportsPiReasoningEffort(candidate: ModelCandidate): boolean {
  if (!candidate.capabilities.includes("reasoning")) return false;
  return !(candidate.modality === "local" && candidate.provider === "lmstudio" && candidate.family === "qwen3.5");
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
    if (thinking.startsWith("{") && thinking.endsWith("}")) {
      try {
        const candidate = JSON.parse(thinking) as unknown;
        if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) return thinking;
      } catch { /* Ignore free-form or incomplete reasoning; the normal repair path handles it. */ }
    }
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
    if (typeof value.toolCallId === "string") summary.toolCallId = value.toolCallId;
    if (type === "tool_execution_end") {
      summary.isError = value.isError;
      summary.durationMs = value.durationMs;
      for (const key of ["error", "errorMessage"]) {
        if (typeof value[key] === "string") summary[key] = value[key];
      }
    }
    return summary;
  }
  if (["auto_retry_start", "auto_retry_end", "agent_settled", "compaction_end"].includes(type)) {
    for (const key of ["attempt", "maxAttempts", "delayMs", "errorMessage", "finalError", "success", "aborted", "willRetry"]) {
      if (key in value) summary[key] = value[key];
    }
    return summary;
  }
  if (["agent_start", "agent_end", "turn_start", "turn_end", "message_start", "message_end"].includes(type)) {
    if (type === "message_end" && value.message && typeof value.message === "object") {
      const message = value.message as Record<string, unknown>;
      if (typeof message.role === "string") summary.role = message.role;
      if (Array.isArray(message.content)) summary.contentTypes = message.content.flatMap((item) =>
        item && typeof item === "object" && typeof (item as Record<string, unknown>).type === "string"
          ? [(item as Record<string, unknown>).type]
          : [],
      );
      if (message.usage && typeof message.usage === "object") summary.usage = message.usage;
    }
    for (const key of ["aborted", "success"]) if (key in value) summary[key] = value[key];
    return summary;
  }
  return null;
}

function eventMarker(event: Record<string, unknown>): string | null {
  switch (event.type) {
    case "turn_start": return "·";
    case "tool_execution_start": return "T";
    case "tool_execution_end": return event.isError === true ? "!" : "✓";
    case "turn_end": return event.aborted === true ? "×" : "✓";
    case "auto_retry_start": return "!";
    case "agent_end": return event.aborted === true ? "×" : "✓";
    default: return null;
  }
}

function modalityLabel(modality: ModelCandidate["modality"]): string {
  if (modality === "local") return "local";
  if (modality === "metered_api") return "remoto";
  return modality;
}

function durationLabel(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function statusLine(input: {
  request: ExecutionRequest;
  elapsedMs: number;
  turns: number;
  tools: number;
  errors: number;
  idleMs: number;
  lastEvent: string;
  trail: string;
}): string {
  return `${input.request.task.id} ${input.request.candidate.alias} [${modalityLabel(input.request.candidate.modality)}] ${durationLabel(input.elapsedMs)}/${durationLabel(input.request.timeoutMs)} · t${input.turns} T${input.tools} !${input.errors} · ${input.lastEvent} idle ${durationLabel(input.idleMs)} · ${input.trail || "…"}`;
}

function startLiveProgress(request: ExecutionRequest, tracePath: string, redactionPatterns: string[]): {
  event: (summary: Record<string, unknown>) => void;
  finish: (outcome: "success" | "failure" | "interrupted") => void;
} {
  const startedAt = Date.now();
  let sequence = 0;
  let turns = 0;
  let tools = 0;
  let errors = 0;
  let lastActivityAt = startedAt;
  let lastEvent = "iniciando";
  let trail = "";
  let finished = false;
  let printedSummaries = 0;
  let markersSinceSummary = 0;
  const appendEvent = (record: Record<string, unknown>): void => {
    appendFileSync(tracePath, `${redact(JSON.stringify(record), redactionPatterns)}\n`, { encoding: "utf8", mode: 0o600 });
  };
  const printSummary = (outcome?: "success" | "failure" | "interrupted"): void => {
    const current = statusLine({
      request, elapsedMs: Date.now() - startedAt, turns, tools, errors,
      idleMs: Date.now() - lastActivityAt, lastEvent, trail: trail.slice(-8),
    }) + (outcome ? ` · resultado ${outcome}` : "");
    if (printedSummaries > 0 && markersSinceSummary > 0) process.stdout.write("\n");
    process.stdout.write(`[${nowUtc()}] ${current}\n`);
    printedSummaries += 1;
    markersSinceSummary = 0;
  };
  printSummary();
  return {
    event(summary) {
      sequence += 1;
      const marker = eventMarker(summary);
      if (summary.type === "turn_start") turns += 1;
      if (summary.type === "tool_execution_start") tools += 1;
      if (summary.type === "tool_execution_end" && summary.isError === true) errors += 1;
      if (summary.type === "auto_retry_start" || summary.type === "agent_end" && summary.aborted === true) errors += 1;
      lastActivityAt = Date.now();
      if (summary.type === "turn_start") lastEvent = "modelo";
      else if (summary.type === "turn_end") lastEvent = "turno";
      else if (summary.type === "tool_execution_start" || summary.type === "tool_execution_end") {
        const toolName = typeof summary.toolName === "string" ? summary.toolName.slice(0, 10) : "tool";
        lastEvent = `${toolName}${summary.type === "tool_execution_start" ? "…" : summary.isError === true ? "!" : "✓"}`;
      } else if (summary.type === "message_end") {
        lastEvent = `msg:${typeof summary.role === "string" ? summary.role : "?"}`;
      }
      else lastEvent = String(summary.type).slice(0, 12);
      if (marker) trail += marker;
      appendEvent({
        ...summary,
        sequence,
        elapsedMs: Date.now() - startedAt,
        marker,
        counts: { turns, tools, errors },
      });
      if (marker) {
        process.stdout.write(marker);
        markersSinceSummary += 1;
      }
    },
    finish(outcome) {
      if (finished) return;
      finished = true;
      const marker = outcome === "success" ? "✓" : outcome === "interrupted" ? "×" : "!";
      trail += marker;
      process.stdout.write(marker);
      markersSinceSummary += 1;
      lastEvent = outcome === "success" ? "resposta concluída" : outcome === "interrupted" ? "interrompida" : "falha";
      appendEvent({
        at: nowUtc(), type: "session_outcome", sequence: sequence + 1,
        elapsedMs: Date.now() - startedAt, outcome, lastActivityAt: new Date(lastActivityAt).toISOString(),
        counts: { turns, tools, errors }, trail: trail.slice(-8),
      });
      printSummary(outcome);
    },
  };
}

export function extractResult(
  text: string | undefined,
  taskId: string,
  acceptedTaskIds: string[] = [taskId],
  observeRepair?: ResultRepairObserver,
): ExecutionResult {
  if (!text?.trim()) {
    observeRepair?.({
      status: "skipped", reason: "resposta vazia; não há texto para reparar", responseChars: 0,
    });
    throw new Error("A sessão Pi terminou sem resposta textual; json-llm-repair não pôde ser executado sem conteúdo.");
  }
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)?.[1];
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  const raw = fenced ?? (first >= 0 && last > first ? text.slice(first, last + 1) : text);
  let parsed: unknown;
  let repairReason: string | undefined;
  let initialParseError: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    initialParseError = error;
    repairReason = "JSON inválido ou resposta com texto fora do objeto";
    observeRepair?.({
      status: "started", reason: repairReason, responseChars: text.length,
      detail: safeError(error),
    });
    try {
      parsed = parseFromLLM(text, { mode: "repair" });
    } catch (repairError) {
      const detail = `JSON original: ${safeError(initialParseError)}; parser: ${safeError(repairError)}`;
      observeRepair?.({ status: "unresolved", reason: repairReason, responseChars: text.length, detail });
      throw new Error(`json-llm-repair não conseguiu extrair/reparar o JSON. ${detail}`);
    }
  }

  const validate = (value: unknown): ExecutionResult => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Resultado do Pi não é um objeto JSON.");
    }
    const resultValue = value as Record<string, unknown>;
    if (Object.keys(resultValue).length !== resultKeys.length || !resultKeys.every((key) => key in resultValue) || typeof resultValue.taskId !== "string") {
      throw new Error("Resultado do Pi não atende ao contrato estruturado da tarefa.");
    }
    if (typeof resultValue.summary !== "string") throw new Error("Resultado do Pi retornou summary inválido.");
    for (const key of ["changedFiles", "claimedChecks", "decisions", "blockers", "suggestedFollowUps"] as const) {
      const field = resultValue[key];
      if (!Array.isArray(field) || field.some((item) => typeof item !== "string")) {
        throw new Error(`Resultado do Pi retornou ${key} inválido.`);
      }
    }
    if (!acceptedTaskIds.includes(resultValue.taskId)) {
      throw new Error(`Resultado do Pi retornou taskId inesperado: ${resultValue.taskId}.`);
    }
    if (typeof resultValue.outcome !== "string") throw new Error("Resultado do Pi retornou outcome inválido.");
    resultValue.outcome = outcomeAliases.get(resultValue.outcome) ?? resultValue.outcome;
    if (!resultOutcomes.has(resultValue.outcome as string)) {
      throw new Error(`Resultado do Pi retornou outcome inesperado: ${String(resultValue.outcome)}.`);
    }
    resultValue.taskId = taskId;
    return resultValue as unknown as ExecutionResult;
  };

  try {
    const result = validate(parsed);
    if (repairReason) {
      observeRepair?.({ status: "resolved", reason: repairReason, responseChars: text.length });
    }
    return result;
  } catch (validationError) {
    if (!repairReason) {
      repairReason = "JSON válido, mas incompatível com o contrato do harness";
      observeRepair?.({
        status: "started", reason: repairReason, responseChars: text.length,
        detail: safeError(validationError),
      });
      try {
        parsed = parseFromLLM(text, { mode: "repair" });
      } catch (repairError) {
        const detail = `Contrato: ${safeError(validationError)}; parser: ${safeError(repairError)}`;
        observeRepair?.({ status: "unresolved", reason: repairReason, responseChars: text.length, detail });
        throw new Error(`json-llm-repair não resolveu a resposta incompatível com o contrato. ${detail}`);
      }
    }
    try {
      const result = validate(parsed);
      observeRepair?.({ status: "resolved", reason: repairReason, responseChars: text.length });
      return result;
    } catch (finalValidationError) {
      const detail = safeError(finalValidationError);
      observeRepair?.({
        status: "unresolved", reason: repairReason, responseChars: text.length, detail,
      });
      throw new Error(`json-llm-repair foi executado, mas não resolveu o contrato: ${detail}`);
    }
  }
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
        reasoning: supportsPiReasoningEffort(candidate),
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
    const localDiagnostics: LocalModelDiagnostic[] = [];
    try {
      if (request.candidate.modality === "local") {
        return await withLmStudioModel(this.config, request.candidate, async () => {
          enteredSession = true;
          return this.executeSession(request);
        }, (diagnostic) => {
          localDiagnostics.push(diagnostic);
          console.log(`[${diagnostic.at}] LM Studio · ${diagnostic.phase} · ${diagnostic.modelId}${diagnostic.contextLength ? ` · contexto ${diagnostic.contextLength}` : ""}${diagnostic.durationMs == null ? "" : ` · ${diagnostic.durationMs} ms`}`);
          if (diagnostic.error) {
            const details = diagnostic.error.replace(/\s+/g, " ").slice(0, 2_000);
            console.log(`[${diagnostic.at}]   ↳ Detalhe: ${details}`);
          }
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
          ...(failure.phase === "response_parse" ? { responseRepairLogPath: path.join(request.outputDirectory, "response-repair.jsonl") } : {}),
          ...(request.candidate.modality === "local" ? { localModelLifecyclePath: path.join(request.outputDirectory, "local-model-lifecycle.json") } : {}),
        },
      };
    } finally {
      if (request.candidate.modality === "local") {
        await writeJson(path.join(request.outputDirectory, "local-model-lifecycle.json"), {
          alias: request.candidate.alias,
          modelId: request.candidate.modelId,
          diagnostics: localDiagnostics,
        }).catch((error: unknown) => console.error(`[${nowUtc()}] Não foi possível salvar o diagnóstico do LM Studio: ${safeError(error)}`));
      }
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
    const responseRepairLogPath = path.join(request.outputDirectory, "response-repair.jsonl");
    const observeResponseRepair: ResultRepairObserver = (diagnostic) => {
      const safeDiagnostic = {
        at: nowUtc(),
        ...diagnostic,
        ...(diagnostic.detail ? { detail: redact(diagnostic.detail, this.config.security.redactPatterns) } : {}),
      };
      appendFileSync(responseRepairLogPath, `${JSON.stringify(safeDiagnostic)}\n`, { encoding: "utf8", mode: 0o600 });
      const status = {
        started: "acionado",
        resolved: "recuperou resposta válida",
        unresolved: "não resolveu; revisar o caso para ampliar o parser",
        skipped: "não pôde atuar",
      }[diagnostic.status];
      const detail = safeDiagnostic.detail ? ` · ${safeDiagnostic.detail.replace(/\s+/g, " ").slice(0, 400)}` : "";
      console.log(`[${safeDiagnostic.at}] json-llm-repair · ${status} · ${diagnostic.reason} · ${diagnostic.responseChars} caracteres · log ${responseRepairLogPath}${detail}`);
    };
    appendFileSync(tracePath, `${JSON.stringify({
      at: nowUtc(), type: "session_start", provider: request.candidate.provider,
      modelId: request.candidate.modelId, alias: request.candidate.alias,
      modality: request.candidate.modality, taskId: request.task.id, taskRole: request.task.role,
      runId: request.runId, attemptId: request.attemptId, timeoutMs: request.timeoutMs,
    })}\n`, { encoding: "utf8", mode: 0o600 });
    const progress = startLiveProgress(request, tracePath, this.config.security.redactPatterns);
    const unsubscribe = session.subscribe((event) => {
      const summary = eventSummary(event);
      if (summary) progress.event(summary);
    });
    const timeoutState = { triggered: false, cancelled: false };
    this.abortCurrent = async () => { timeoutState.cancelled = true; await session.abort(); };
    const timedOut = (): boolean => timeoutState.triggered;
    const timeout = setTimeout(() => { timeoutState.triggered = true; void session.abort(); }, request.timeoutMs);
    let outcome: "success" | "failure" | "interrupted" = "failure";
    try {
      try { await session.prompt(request.prompt); }
      catch (error) { throw new PiExecutionError(timeoutState.triggered ? "timeout" : "provider_request", error); }
      if (timeoutState.triggered) throw new PiExecutionError("timeout", new Error(`Sessão excedeu ${request.timeoutMs} ms.`));
      const initialResponse = lastAssistantOutput(session.messages, session.getLastAssistantText());
      let rawResponse = initialResponse;
      const saveRawResponse = async (parsedResult?: ExecutionResult): Promise<void> => {
        const original = rawResponse ?? "[EMPTY RESPONSE]";
        const diagnosticResponse = parsedResult
          ? JSON.stringify(parsedResult)
          : `[UNPARSEABLE RESPONSE OMITTED; chars=${original.length}]`;
        const safeResponse = redact(diagnosticResponse, this.config.security.redactPatterns);
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
          observeResponseRepair,
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
            observeResponseRepair,
          );
        } catch (repairParseError) {
          await saveRawResponse();
          throw new PiExecutionError(
            "response_parse",
            new Error(`Resposta inicial inválida: ${safeError(initialParseError)} Resposta de reparo inválida: ${safeError(repairParseError)}`),
          );
        }
      }
      await saveRawResponse(result);
      const stats = session.getSessionStats();
      result.usage = {
        inputTokens: stats.tokens.input,
        outputTokens: stats.tokens.output,
        cachedTokens: stats.tokens.cacheRead,
        costUsd: String(stats.cost),
      };
      outcome = "success";
      return result;
    } finally {
      clearTimeout(timeout);
      this.abortCurrent = undefined;
      unsubscribe();
      if (timeoutState.triggered || timeoutState.cancelled) outcome = "interrupted";
      progress.finish(outcome);
      appendFileSync(tracePath, `${JSON.stringify({ at: nowUtc(), type: "session_disposed", timedOut: timeoutState.triggered })}\n`, { encoding: "utf8", mode: 0o600 });
      session.dispose();
    }
  }

  async cancel(): Promise<void> { await this.abortCurrent?.(); }
}
