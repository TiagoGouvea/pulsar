import {
  createAgentSession,
  ModelRuntime,
  SessionManager,
} from "@earendil-works/pi-coding-agent";
import { InMemoryCredentialStore } from "@earendil-works/pi-ai";
import { parseFromLLM } from "json-llm-repair";
import { appendFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { HarnessConfig } from "../config/schema.js";
import type { ExecutionRequest, ExecutionResult, ModelCandidate } from "../domain/types.js";
import { ModelCatalog } from "../providers/catalog.js";
import { withLmStudioModel, type LocalModelDiagnostic } from "../providers/lmstudio.js";
import { redact } from "../security/redaction.js";
import { createId, nowUtc, safeError, writeJson } from "../utils/core.js";
import { colorTerminal, terminalLog, terminalTimestamp } from "../utils/terminal.js";
import type { Executor } from "./types.js";

const resultKeys = ["taskId", "outcome", "summary", "changedFiles", "claimedChecks", "decisions", "blockers", "suggestedFollowUps"];
const resultOutcomes = new Set(["ready_for_verification", "changes_requested", "blocked", "failed"]);
const outcomeAliases = new Map([
  ["needs_changes", "changes_requested"],
  ["revisions_requested", "changes_requested"],
]);
const MAX_RAW_RESPONSE_CHARS = 64_000;

export function prepareResponseDiagnostic(
  original: string | undefined,
  parsedResult: ExecutionResult | undefined,
  redactionPatterns: string[],
): { content: string; truncated: boolean; originalChars: number } {
  const diagnosticResponse = parsedResult ? JSON.stringify(parsedResult) : original ?? "[EMPTY RESPONSE]";
  const safeResponse = redact(diagnosticResponse, redactionPatterns);
  return {
    content: safeResponse.slice(0, MAX_RAW_RESPONSE_CHARS),
    truncated: safeResponse.length > MAX_RAW_RESPONSE_CHARS,
    originalChars: diagnosticResponse.length,
  };
}

export type ResultRepairDiagnostic = {
  status: "started" | "resolved" | "unresolved" | "skipped";
  reason: string;
  responseChars: number;
  detail?: string;
  responseText?: string;
  parserOutput?: unknown;
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
    if (thinking) {
      const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(thinking)?.[1];
      const first = thinking.indexOf("{");
      const last = thinking.lastIndexOf("}");
      const candidates = [fenced, first >= 0 && last > first ? thinking.slice(first, last + 1) : undefined, thinking]
        .flatMap((candidate) => candidate?.trim() ? [candidate.trim()] : []);
      for (const candidate of candidates) {
      try {
          const parsed = JSON.parse(candidate) as unknown;
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && resultKeys.every((key) => key in parsed)) return candidate;
      } catch { /* Ignore free-form or incomplete reasoning; the normal repair path handles it. */ }
      }
    }
  }
  return undefined;
}

class PiExecutionError extends Error {
  constructor(readonly phase: string, cause: unknown, readonly usage?: ExecutionResult["usage"]) {
    super(safeError(cause), { cause });
    this.name = "PiExecutionError";
  }
}

class FormatterCallError extends Error {
  constructor(
    cause: unknown,
    readonly call?: NonNullable<NonNullable<ExecutionResult["usage"]>["additionalCalls"]>[number],
    readonly responseText?: string,
  ) {
    super(safeError(cause), { cause });
    this.name = "FormatterCallError";
  }
}

function estimateCandidateCost(candidate: ModelCandidate, inputTokens: number, outputTokens: number): number | undefined {
  if (candidate.inputUsdPerMillion == null || candidate.outputUsdPerMillion == null) return undefined;
  return (inputTokens * Number(candidate.inputUsdPerMillion) + outputTokens * Number(candidate.outputUsdPerMillion)) / 1_000_000;
}

function formatterPrompt(text: string, taskId: string): string {
  return [
    "Reformate a resposta abaixo para o contrato JSON do harness. Não use ferramentas, não explique e não invente informações.",
    "Preserve exatamente o significado e os valores; se faltar um campo de lista, use []. Se não puder preencher um campo obrigatório sem inventar, mantenha a resposta sem alteração.",
    `O campo taskId deve ser exatamente ${JSON.stringify(taskId)}.`,
    "Retorne somente um objeto JSON com exatamente: taskId, outcome, summary, changedFiles, claimedChecks, decisions, blockers, suggestedFollowUps.",
    "outcome deve ser um de ready_for_verification, changes_requested, blocked, failed. Campos de lista devem conter somente strings.",
    "Resposta original:",
    text,
  ].join("\n\n");
}

function combineUsd(left: string | undefined, right: string): string {
  return (Number(left ?? "0") + Number(right)).toFixed(8).replace(/0+$/, "").replace(/\.$/, "") || "0";
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
  log: (message: string, at?: string) => void;
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
    const tone = outcome === "success" ? "green" : outcome === "failure" ? "red" : "blue";
    process.stdout.write(colorTerminal(`[${terminalTimestamp(new Date(), request.timeZone)}] ${current}`, tone) + "\n");
    printedSummaries += 1;
    markersSinceSummary = 0;
  };
  printSummary();
  return {
    log(message, at = nowUtc()) {
      if (markersSinceSummary > 0) process.stdout.write("\n");
      markersSinceSummary = 0;
      terminalLog(message, { at, timeZone: request.timeZone, tone: /não resolveu|não pôde|falha|failed/i.test(message) ? "red" : /acionado|alerta|warning/i.test(message) ? "yellow" : undefined });
    },
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
        process.stdout.write(colorTerminal(marker, marker === "T" ? "blue" : marker === "!" ? "yellow" : marker === "×" ? "red" : "green"));
        markersSinceSummary += 1;
      }
    },
    finish(outcome) {
      if (finished) return;
      finished = true;
      const marker = outcome === "success" ? "✓" : outcome === "interrupted" ? "×" : "!";
      trail += marker;
      process.stdout.write(colorTerminal(marker, marker === "✓" ? "green" : "red"));
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
      detail: safeError(error), responseText: text,
    });
    try {
      parsed = parseFromLLM(text, { mode: "repair" });
    } catch (repairError) {
      const detail = `JSON original: ${safeError(initialParseError)}; parser: ${safeError(repairError)}`;
      observeRepair?.({ status: "unresolved", reason: repairReason, responseChars: text.length, detail, responseText: text });
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
      observeRepair?.({ status: "resolved", reason: repairReason, responseChars: text.length, responseText: text, parserOutput: parsed });
    }
    return result;
  } catch (validationError) {
    if (!repairReason) {
      repairReason = "JSON válido, mas incompatível com o contrato do harness";
      observeRepair?.({
        status: "started", reason: repairReason, responseChars: text.length,
        detail: safeError(validationError), responseText: text,
      });
      try {
        parsed = parseFromLLM(text, { mode: "repair" });
      } catch (repairError) {
        const detail = `Contrato: ${safeError(validationError)}; parser: ${safeError(repairError)}`;
        observeRepair?.({ status: "unresolved", reason: repairReason, responseChars: text.length, detail, responseText: text });
        throw new Error(`json-llm-repair não resolveu a resposta incompatível com o contrato. ${detail}`);
      }
    }
    try {
      const result = validate(parsed);
      observeRepair?.({ status: "resolved", reason: repairReason, responseChars: text.length, responseText: text, parserOutput: parsed });
      return result;
    } catch (finalValidationError) {
      const detail = safeError(finalValidationError);
      observeRepair?.({
        status: "unresolved", reason: repairReason, responseChars: text.length, detail,
        responseText: text, parserOutput: parsed,
      });
      throw new Error(`json-llm-repair foi executado, mas não resolveu o contrato: ${detail}`);
    }
  }
}

export async function recoverResultWithFormatter(
  original: string | undefined,
  initialError: unknown,
  taskId: string,
  acceptedTaskIds: string[],
  formatter: (original: string) => Promise<{ text: string; call: NonNullable<NonNullable<ExecutionResult["usage"]>["additionalCalls"]>[number] }>,
  observeRepair?: ResultRepairObserver,
): Promise<{ result: ExecutionResult; response: string; call: NonNullable<NonNullable<ExecutionResult["usage"]>["additionalCalls"]>[number] }> {
  if (!original?.trim()) throw initialError;
  const formatted = await formatter(original);
  try {
    const result = extractResult(formatted.text, taskId, acceptedTaskIds, observeRepair);
    return { result, response: formatted.text, call: formatted.call };
  } catch (error) {
    throw new FormatterCallError(new Error(`Saída do formatador incompatível com o contrato: ${safeError(error)}`), formatted.call, formatted.text);
  }
}

async function createRuntime(candidate: ModelCandidate): Promise<{ runtime: ModelRuntime; model: NonNullable<ReturnType<ModelRuntime["getModel"]>> }> {
  const runtime = await ModelRuntime.create({
    allowModelNetwork: false,
    modelsPath: null,
    credentials: new InMemoryCredentialStore(),
  });
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
          if (!["loaded", "load_failed", "unload_failed"].includes(diagnostic.phase)) return;
          const status = diagnostic.phase === "loaded" ? "carregado" : diagnostic.phase === "load_failed" ? "falha ao carregar" : "falha ao descarregar";
          const lifecycleTone = diagnostic.phase === "loaded" ? "green" : diagnostic.phase.includes("fail") ? "red" : "yellow";
          terminalLog(`LM Studio · ${status} · ${diagnostic.modelId}${diagnostic.contextLength ? ` · contexto ${diagnostic.contextLength}` : ""}${diagnostic.durationMs == null ? "" : ` · ${diagnostic.durationMs} ms`}`, { at: diagnostic.at, timeZone: request.timeZone, tone: lifecycleTone });
          if (diagnostic.error) terminalLog(`↳ Detalhe: ${diagnostic.error.replace(/\s+/g, " ").slice(0, 2_000)}`, { at: diagnostic.at, timeZone: request.timeZone, tone: "red" });
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
          ...(failure.phase === "response_parse" ? { responseRepairCaseLogPath: path.join(request.outputDirectory, "response-repair-cases.jsonl") } : {}),
          ...(request.candidate.modality === "local" ? { localModelLifecyclePath: path.join(request.outputDirectory, "local-model-lifecycle.json") } : {}),
        },
        ...(failure.usage ? { usage: failure.usage } : {}),
      };
    } finally {
      if (request.candidate.modality === "local") {
        await writeJson(path.join(request.outputDirectory, "local-model-lifecycle.json"), {
          alias: request.candidate.alias,
          modelId: request.candidate.modelId,
          diagnostics: localDiagnostics,
        }).catch((error: unknown) => terminalLog(`Não foi possível salvar o diagnóstico do LM Studio: ${safeError(error)}`, { at: new Date(), timeZone: request.timeZone, tone: "red" }));
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
    const responseRepairCaseLogPath = path.join(request.outputDirectory, "response-repair-cases.jsonl");
    const exchangePath = path.join(request.outputDirectory, "model-exchange.jsonl");
    const recordExchange = (stage: string, direction: "request" | "response" | "error" | "event", content: string, model = request.candidate, tool?: string): void => {
      if (!request.captureModelExchange) return;
      const safeContent = redact(content, this.config.security.redactPatterns);
      appendFileSync(exchangePath, `${JSON.stringify({
        at: nowUtc(), stage, direction, modelAlias: model.alias, modelId: model.modelId, ...(tool ? { tool } : {}),
        content: safeContent.slice(0, MAX_RAW_RESPONSE_CHARS),
        truncated: safeContent.length > MAX_RAW_RESPONSE_CHARS,
      })}\n`, { encoding: "utf8", mode: 0o600 });
    };
    appendFileSync(tracePath, `${JSON.stringify({
      at: nowUtc(), type: "session_start", provider: request.candidate.provider,
      modelId: request.candidate.modelId, alias: request.candidate.alias,
      modality: request.candidate.modality, taskId: request.task.id, taskRole: request.task.role,
      runId: request.runId, attemptId: request.attemptId, timeoutMs: request.timeoutMs,
    })}\n`, { encoding: "utf8", mode: 0o600 });
    const progress = startLiveProgress(request, tracePath, this.config.security.redactPatterns);
    let activeRepairCaseId: string | undefined;
    const observeResponseRepair: ResultRepairObserver = (diagnostic) => {
      const { responseText, parserOutput, ...diagnosticSummary } = diagnostic;
      const safeDiagnostic = {
        at: nowUtc(),
        ...diagnosticSummary,
        ...(diagnosticSummary.detail ? { detail: redact(diagnosticSummary.detail, this.config.security.redactPatterns) } : {}),
      };
      appendFileSync(responseRepairLogPath, `${JSON.stringify(safeDiagnostic)}\n`, { encoding: "utf8", mode: 0o600 });
      if (diagnostic.status === "started") {
        activeRepairCaseId = createId("repair-case");
        const safeInput = redact(responseText ?? "", this.config.security.redactPatterns);
        appendFileSync(responseRepairCaseLogPath, `${JSON.stringify({
          at: safeDiagnostic.at, caseId: activeRepairCaseId, type: "input", reason: diagnostic.reason,
          responseChars: diagnostic.responseChars, responseText: safeInput.slice(0, MAX_RAW_RESPONSE_CHARS),
          truncated: safeInput.length > MAX_RAW_RESPONSE_CHARS,
        })}\n`, { encoding: "utf8", mode: 0o600 });
      } else if (diagnostic.status === "resolved" || diagnostic.status === "unresolved") {
        const serializedOutput = parserOutput === undefined ? undefined : JSON.stringify(parserOutput);
        const safeOutput = serializedOutput == null ? undefined : redact(serializedOutput, this.config.security.redactPatterns);
        appendFileSync(responseRepairCaseLogPath, `${JSON.stringify({
          at: safeDiagnostic.at, caseId: activeRepairCaseId ?? createId("repair-case"), type: "result",
          status: diagnostic.status, reason: diagnostic.reason,
          ...(safeOutput == null ? {} : {
            parserOutput: safeOutput.slice(0, MAX_RAW_RESPONSE_CHARS),
            outputTruncated: safeOutput.length > MAX_RAW_RESPONSE_CHARS,
          }),
          ...(safeDiagnostic.detail ? { detail: safeDiagnostic.detail } : {}),
        })}\n`, { encoding: "utf8", mode: 0o600 });
        activeRepairCaseId = undefined;
      } else {
        appendFileSync(responseRepairCaseLogPath, `${JSON.stringify({
          at: safeDiagnostic.at, caseId: createId("repair-case"), type: "skipped", reason: diagnostic.reason,
          responseChars: diagnostic.responseChars,
        })}\n`, { encoding: "utf8", mode: 0o600 });
      }
      const status = {
        started: "acionado",
        resolved: "recuperou resposta válida",
        unresolved: "não resolveu",
        skipped: "não pôde atuar",
      }[diagnostic.status];
      progress.log(`json-llm-repair · ${status} · ${diagnostic.reason}`, safeDiagnostic.at);
      if (diagnostic.status === "unresolved" || diagnostic.status === "skipped") {
        const detail = safeDiagnostic.detail ? ` · ${safeDiagnostic.detail.replace(/\s+/g, " ").slice(0, 400)}` : "";
        progress.log(`  ↳ ${diagnostic.responseChars} caracteres · diagnóstico ${responseRepairLogPath} · caso mascarado ${responseRepairCaseLogPath}${detail}`, safeDiagnostic.at);
      }
    };
    const unsubscribe = session.subscribe((event) => {
      const summary = eventSummary(event);
      if (!summary) return;
      progress.event(summary);
      if (summary.type === "tool_execution_start" || summary.type === "tool_execution_end") {
        const eventData = event as Record<string, unknown>;
        const exchangeEvent = summary.type === "tool_execution_start" && "args" in eventData
          ? { ...summary, args: eventData.args }
          : summary;
        recordExchange("tool", "event", JSON.stringify(exchangeEvent), request.candidate, typeof summary.toolName === "string" ? summary.toolName : undefined);
      }
    });
    const timeoutState = { triggered: false, cancelled: false };
    this.abortCurrent = async () => { timeoutState.cancelled = true; await session.abort(); };
    const timedOut = (): boolean => timeoutState.triggered;
    const timeout = setTimeout(() => { timeoutState.triggered = true; void session.abort(); }, request.timeoutMs);
    let outcome: "success" | "failure" | "interrupted" = "failure";
    const primaryStartedAt = Date.now();
    let primaryDurationMs = 0;
    try {
      recordExchange("executor", "request", request.prompt);
      try { await session.prompt(request.prompt); }
      catch (error) {
        recordExchange("executor", "error", safeError(error));
        throw new PiExecutionError(timeoutState.triggered ? "timeout" : "provider_request", error);
      }
      primaryDurationMs = Date.now() - primaryStartedAt;
      if (timeoutState.triggered) throw new PiExecutionError("timeout", new Error(`Sessão excedeu ${request.timeoutMs} ms.`));
      const initialResponse = lastAssistantOutput(session.messages, session.getLastAssistantText());
      recordExchange("executor", "response", initialResponse ?? "[EMPTY RESPONSE]");
      let rawResponse = initialResponse;
      const primaryStats = (): NonNullable<ExecutionResult["usage"]> => {
        const stats = session.getSessionStats();
        return {
          inputTokens: stats.tokens.input,
          outputTokens: stats.tokens.output,
          cachedTokens: stats.tokens.cacheRead,
          costUsd: String(stats.cost),
          primaryCostUsd: String(stats.cost),
          primaryInputTokens: stats.tokens.input,
          primaryOutputTokens: stats.tokens.output,
          primaryCachedTokens: stats.tokens.cacheRead,
          primaryDurationMs,
          additionalCalls: [],
        };
      };
      const saveRawResponse = async (parsedResult?: ExecutionResult): Promise<void> => {
        const diagnostic = prepareResponseDiagnostic(rawResponse, parsedResult, this.config.security.redactPatterns);
        const rawResponsePath = path.join(request.outputDirectory, "raw-response.txt");
        await writeFile(
          rawResponsePath,
          `${diagnostic.content}${diagnostic.truncated ? "\n[TRUNCATED]\n" : "\n"}`,
          { encoding: "utf8", mode: 0o600 },
        );
        if (!parsedResult) {
          progress.log(`Resposta inválida preservada com mascaramento em ${rawResponsePath} · ${diagnostic.originalChars} caracteres${diagnostic.truncated ? ` · truncada em ${MAX_RAW_RESPONSE_CHARS}` : ""}.`);
        }
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
        const primaryUsage = primaryStats();
        if (this.config.responseFormatting.enabled && !initialResponse?.trim()) {
          await saveRawResponse();
          throw new PiExecutionError(
            "response_parse",
            new Error(`Resposta vazia; formatador não acionado e nova chamada ao modelo executor evitada. ${safeError(initialParseError)}`),
            primaryUsage,
          );
        }
        if (this.config.responseFormatting.enabled && initialResponse?.trim()) {
          try {
            const formatted = await recoverResultWithFormatter(
              initialResponse, initialParseError, request.task.id,
              request.acceptedResultTaskIds ?? [request.task.id],
              (response) => this.formatResponse(request, response, primaryStartedAt, progress, observeResponseRepair, recordExchange),
              observeResponseRepair,
            );
            rawResponse = ["[INITIAL RESPONSE]", initialResponse, "", "[FORMATTER RESPONSE]", formatted.response].join("\n");
            result = formatted.result;
            primaryUsage.additionalCalls = [formatted.call];
            primaryUsage.costUsd = combineUsd(primaryUsage.costUsd, formatted.call.costUsd);
          } catch (formatterError) {
            const additionalCall = formatterError instanceof FormatterCallError ? formatterError.call : undefined;
            if (formatterError instanceof FormatterCallError && formatterError.responseText) {
              rawResponse = ["[INITIAL RESPONSE]", initialResponse, "", "[FORMATTER RESPONSE]", formatterError.responseText].join("\n");
            }
            const usage = {
              ...primaryUsage,
              ...(additionalCall ? {
                additionalCalls: [additionalCall],
                costUsd: combineUsd(primaryUsage.costUsd, additionalCall.costUsd),
              } : {}),
            };
            await saveRawResponse();
            throw new PiExecutionError(
              "response_parse",
              new Error(`Resposta inicial inválida: ${safeError(initialParseError)} Formatador não resolveu: ${safeError(formatterError)}`),
              usage,
            );
          }
          result.usage = primaryUsage;
        } else {
        const repairPrompt = [
          "Sua resposta anterior não apresentou o objeto JSON final válido.",
          "Não use ferramentas e não explique.",
          `Responda agora somente com o JSON solicitado. O campo taskId deve ser exatamente "${request.task.id}".`,
          "Inclua taskId, outcome, summary, changedFiles, claimedChecks, decisions, blockers e suggestedFollowUps.",
        ].join("\n");
        recordExchange("executor-repair", "request", repairPrompt);
        try { await session.prompt(repairPrompt); }
        catch (repairError) {
          recordExchange("executor-repair", "error", safeError(repairError));
          throw new PiExecutionError(timedOut() ? "timeout" : "provider_request", repairError);
        }
        if (timedOut()) throw new PiExecutionError("timeout", new Error(`Sessão excedeu ${request.timeoutMs} ms.`));
        const repairedResponse = lastAssistantOutput(session.messages, session.getLastAssistantText());
        recordExchange("executor-repair", "response", repairedResponse ?? "[EMPTY RESPONSE]");
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
            primaryStats(),
          );
        }
        }
      }
      await saveRawResponse(result);
      if (!result.usage) result.usage = primaryStats();
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

  private async formatResponse(
    request: ExecutionRequest,
    original: string,
    requestStartedAt: number,
    progress: ReturnType<typeof startLiveProgress>,
    observeRepair: ResultRepairObserver,
    recordExchange: (stage: string, direction: "request" | "response" | "error" | "event", content: string, model?: ModelCandidate, tool?: string) => void,
  ): Promise<{ text: string; call: NonNullable<NonNullable<ExecutionResult["usage"]>["additionalCalls"]>[number] }> {
    const settings = this.config.responseFormatting;
    if (original.length > settings.maxInputChars) throw new Error(`Resposta longa demais para reparo (${original.length} caracteres; limite ${settings.maxInputChars}).`);
    const text = redact(original, this.config.security.redactPatterns);
    const candidate = new ModelCatalog(this.config).select("responseFormatter", ["text"], { seed: request.task.id });
    const inputTokens = Math.ceil(formatterPrompt(text, request.task.id).length / 4);
    const maximumCost = estimateCandidateCost(candidate, inputTokens, settings.maxOutputTokens);
    if (maximumCost == null) throw new Error(`Não há preços configurados para estimar o teto do formatador ${candidate.alias}; chamada cancelada.`);
    if (maximumCost > Number(settings.maxCostUsd ?? "0")) {
      throw new Error(`Custo máximo estimado USD ${maximumCost.toFixed(6)} excede o teto do formatador USD ${settings.maxCostUsd}.`);
    }
    const timeoutMs = Math.min(settings.timeoutSeconds * 1000, request.timeoutMs - (Date.now() - requestStartedAt));
    if (timeoutMs <= 0) throw new Error("Não há tempo restante na chamada para acionar o formatador.");
    progress.log(`Formatador de resposta · iniciado · ${candidate.alias} [${modalityLabel(candidate.modality)}] · limite USD ${settings.maxCostUsd} · até ${settings.maxOutputTokens} tokens.`);
    const startedAt = Date.now();
    let created: Awaited<ReturnType<typeof createAgentSession>> | undefined;
    let call: NonNullable<NonNullable<ExecutionResult["usage"]>["additionalCalls"]>[number] | undefined;
    try {
      const runtimeAndModel = await createRuntime(candidate);
      created = await createAgentSession({
        cwd: request.workspace,
        modelRuntime: runtimeAndModel.runtime,
        model: { ...runtimeAndModel.model, maxTokens: settings.maxOutputTokens },
        sessionManager: SessionManager.inMemory(),
        tools: [],
      });
      const timeoutState = { triggered: false };
      const timeout = setTimeout(() => { timeoutState.triggered = true; void created?.session.abort(); }, timeoutMs);
      let formatterText = "";
      try {
        const prompt = formatterPrompt(text, request.task.id);
        recordExchange("response-formatter", "request", prompt, candidate);
        try { await created.session.prompt(prompt); }
        catch (error) {
          recordExchange("response-formatter", "error", safeError(error), candidate);
          throw error;
        }
        formatterText = lastAssistantOutput(created.session.messages, created.session.getLastAssistantText()) ?? "";
        recordExchange("response-formatter", "response", formatterText || "[EMPTY RESPONSE]", candidate);
      } finally { clearTimeout(timeout); }
      const stats = created.session.getSessionStats();
      const costUsd = String(stats.cost);
      call = {
        alias: candidate.alias, provider: candidate.provider, modelId: candidate.modelId, modality: candidate.modality,
        inputTokens: stats.tokens.input, outputTokens: stats.tokens.output, cachedTokens: stats.tokens.cacheRead,
          reasoningTokens: 0, costUsd, durationMs: Date.now() - startedAt,
        outcome: "failed",
      };
      if (timeoutState.triggered) throw new Error(`Formatador excedeu ${Math.ceil(timeoutMs / 1000)} s do tempo restante.`);
      if (!formatterText.trim()) throw new Error("Formatador retornou resposta vazia.");
      try {
        extractResult(
          formatterText, request.task.id, request.acceptedResultTaskIds ?? [request.task.id],
          (diagnostic) => observeRepair({ ...diagnostic, reason: `formatador: ${diagnostic.reason}` }),
        );
      }
      catch (error) { throw new FormatterCallError(error, call, formatterText); }
      call = { ...call, outcome: "ready_for_verification" };
      progress.log(`Formatador de resposta · recuperou resposta válida · ${candidate.alias} [${modalityLabel(candidate.modality)}].`);
      await writeJson(path.join(request.outputDirectory, "response-formatting.json"), {
        at: nowUtc(), status: "resolved", alias: candidate.alias, provider: candidate.provider, modelId: candidate.modelId,
        modality: candidate.modality, inputTokens: call.inputTokens, outputTokens: call.outputTokens,
        costUsd, durationMs: call.durationMs, originalChars: original.length, formattedChars: formatterText.length,
      });
      return { text: formatterText, call };
    } catch (error) {
      if (call) call = { ...call, durationMs: Date.now() - startedAt };
      await writeJson(path.join(request.outputDirectory, "response-formatting.json"), {
        at: nowUtc(), status: "failed", alias: candidate.alias, provider: candidate.provider, modelId: candidate.modelId,
        modality: candidate.modality, costUsd: call?.costUsd ?? null, durationMs: Date.now() - startedAt,
        originalChars: original.length, error: redact(safeError(error), this.config.security.redactPatterns),
      });
      if (error instanceof FormatterCallError) throw error;
      throw new FormatterCallError(error, call);
    } finally {
      created?.session.dispose();
    }
  }

  async cancel(): Promise<void> { await this.abortCurrent?.(); }
}
