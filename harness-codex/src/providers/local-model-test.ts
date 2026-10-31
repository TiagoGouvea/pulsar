import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { HarnessConfig } from "../config/schema.js";
import type { ModelCandidate } from "../domain/types.js";
import { nowUtc, writeJson } from "../utils/core.js";
import { openAiEndpoint } from "./probes.js";
import { listLmStudioModels, loadLmStudioModel, unloadLmStudioModels, withLmStudioModel, type LocalModelDiagnostic } from "./lmstudio.js";

export interface LocalModelTestResult {
  alias: string;
  modelId: string;
  status: "passed" | "failed" | "not_found";
  response: string | null;
  loadDurationMs: number | null;
  responseDurationMs: number | null;
  generationDurationMs: number | null;
  unloadDurationMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  error: string | null;
}

interface ChatResponse {
  choices?: Array<{ finish_reason?: string | null; message?: { content?: unknown; [key: string]: unknown } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  stats?: { generation_time?: number };
}

export interface StructuredOutputVariantResult {
  alias: string;
  modelId: string;
  variant: "chat-json-schema" | "chat-json-schema-no-thinking" | "chat-json-object" | "chat-prompt-only" | "chat-prompt-no-thinking" | "responses-json-schema";
  endpoint: string;
  status: "passed" | "passed_reasoning_channel" | "invalid_json" | "schema_mismatch" | "unsupported" | "http_error" | "load_error";
  outputChannel: "content" | "reasoning_content" | "output_text" | null;
  durationMs: number | null;
  response: string | null;
  error: string | null;
}

const executionResultSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    taskId: { type: "string" },
    outcome: { type: "string", enum: ["ready_for_verification", "changes_requested", "blocked", "failed"] },
    summary: { type: "string" },
    changedFiles: { type: "array", items: { type: "string" } },
    claimedChecks: { type: "array", items: { type: "string" } },
    decisions: { type: "array", items: { type: "string" } },
    blockers: { type: "array", items: { type: "string" } },
    suggestedFollowUps: { type: "array", items: { type: "string" } },
  },
  required: ["taskId", "outcome", "summary", "changedFiles", "claimedChecks", "decisions", "blockers", "suggestedFollowUps"],
} as const;

const structuredSmokePrompt = [
  "Return one JSON object matching the execution-result contract.",
  'Use taskId "json-smoke", outcome "ready_for_verification", summary "ok", and empty arrays for all list fields.',
  "Do not include markdown, explanation, or extra keys.",
].join(" ");

function validateStructuredResult(text: string): StructuredOutputVariantResult["status"] {
  let value: unknown;
  try { value = JSON.parse(text); } catch { return "invalid_json"; }
  if (!value || typeof value !== "object" || Array.isArray(value)) return "schema_mismatch";
  const record = value as Record<string, unknown>;
  const expected = executionResultSchema.required;
  if (Object.keys(record).length !== expected.length || expected.some((key) => !(key in record))) return "schema_mismatch";
  if (record.taskId !== "json-smoke" || !["ready_for_verification", "changes_requested", "blocked", "failed"].includes(String(record.outcome)) || typeof record.summary !== "string") return "schema_mismatch";
  if (expected.slice(3).some((key) => !Array.isArray(record[key]) || (record[key] as unknown[]).some((item) => typeof item !== "string"))) return "schema_mismatch";
  return "passed";
}

function responseText(payload: Record<string, unknown>): { text: string; channel: StructuredOutputVariantResult["outputChannel"] } | null {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) return { text: payload.output_text.trim(), channel: "output_text" };
  const choices = payload.choices as Array<{ message?: { content?: unknown; reasoning_content?: unknown; reasoning?: unknown } }> | undefined;
  const message = choices?.[0]?.message;
  const chatText = message?.content;
  if (typeof chatText === "string" && chatText.trim()) return { text: chatText.trim(), channel: "content" };
  if (Array.isArray(chatText)) {
    const text = extractResponseText(chatText);
    if (text) return { text, channel: "content" };
  }
  const reasoning = typeof message?.reasoning_content === "string" ? message.reasoning_content : message?.reasoning;
  if (typeof reasoning === "string" && validateStructuredResult(reasoning.trim()) === "passed") {
    return { text: reasoning.trim(), channel: "reasoning_content" };
  }
  const output = payload.output as Array<{ content?: Array<{ type?: string; text?: string }> }> | undefined;
  const text = output?.flatMap((item) => item.content ?? []).filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("").trim();
  return text ? { text, channel: "output_text" } : null;
}

async function runStructuredVariant(
  candidate: ModelCandidate,
  variant: StructuredOutputVariantResult["variant"],
): Promise<StructuredOutputVariantResult> {
  const baseUrl = candidate.endpoint ?? "http://localhost:1235/v1";
  const responsesApi = variant === "responses-json-schema";
  const endpoint = responsesApi ? "responses" : "chat/completions";
  const url = new URL(`${baseUrl.replace(/\/+$/, "")}/${endpoint}`);
  const body: Record<string, unknown> = responsesApi
    ? {
      model: candidate.modelId,
      input: structuredSmokePrompt,
      max_output_tokens: 768,
      temperature: 0,
      text: { format: { type: "json_schema", name: "harness_execution_result", strict: true, schema: executionResultSchema } },
    }
    : {
      model: candidate.modelId,
      messages: [{ role: "system", content: "Output JSON only. Never add prose or markdown." }, { role: "user", content: structuredSmokePrompt }],
      max_tokens: 768,
      temperature: 0,
      stream: false,
      ...(variant === "chat-json-schema" ? { response_format: { type: "json_schema", json_schema: { name: "harness_execution_result", strict: true, schema: executionResultSchema } } } : {}),
      ...(variant === "chat-json-schema-no-thinking" ? {
        response_format: { type: "json_schema", json_schema: { name: "harness_execution_result", strict: true, schema: executionResultSchema } },
        chat_template_kwargs: { enable_thinking: false },
      } : {}),
      ...(variant === "chat-json-object" ? { response_format: { type: "json_object" } } : {}),
      ...(variant === "chat-prompt-no-thinking" ? { chat_template_kwargs: { enable_thinking: false } } : {}),
    };
  const started = performance.now();
  try {
    const response = await fetch(url, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(body), signal: AbortSignal.timeout(90_000),
    });
    const rawBody = await response.text();
    const durationMs = Math.round(performance.now() - started);
    if (!response.ok) {
      const unsupported = response.status === 400 && /response_format\.type.*must be/i.test(rawBody);
      return { alias: candidate.alias, modelId: candidate.modelId, variant, endpoint: url.pathname, status: unsupported ? "unsupported" : "http_error", outputChannel: null, durationMs, response: null, error: `HTTP ${response.status}: ${rawBody.slice(0, 1_500)}` };
    }
    let payload: Record<string, unknown>;
    try { payload = JSON.parse(rawBody) as Record<string, unknown>; }
    catch { return { alias: candidate.alias, modelId: candidate.modelId, variant, endpoint: url.pathname, status: "invalid_json", outputChannel: null, durationMs, response: null, error: "O endpoint retornou JSON HTTP inválido." }; }
    const output = responseText(payload);
    const outputStatus = output ? validateStructuredResult(output.text) : "invalid_json";
    const status = outputStatus === "passed" && output?.channel === "reasoning_content" ? "passed_reasoning_channel" : outputStatus;
    const choice = (payload.choices as Array<{ finish_reason?: unknown; message?: Record<string, unknown> }> | undefined)?.[0];
    const reasoning = choice?.message?.reasoning_content ?? choice?.message?.reasoning;
    const detail = !output
      ? `Sem texto final válido (finish_reason=${String(choice?.finish_reason ?? "n/a")}; reasoning_chars=${typeof reasoning === "string" ? reasoning.length : 0}; message_keys=${Object.keys(choice?.message ?? {}).join(",") || "n/a"}).`
      : outputStatus === "schema_mismatch" ? "JSON final válido, mas incompatível com o contrato estrito." : null;
    const safeFinalOutput = outputStatus === "passed" ? output?.text.slice(0, 1_000) ?? null : null;
    return { alias: candidate.alias, modelId: candidate.modelId, variant, endpoint: url.pathname, status, outputChannel: output?.channel ?? null, durationMs, response: safeFinalOutput, error: detail };
  } catch (error) {
    return { alias: candidate.alias, modelId: candidate.modelId, variant, endpoint: url.pathname, status: "http_error", outputChannel: null, durationMs: Math.round(performance.now() - started), response: null, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function testStructuredLocalModels(
  config: HarnessConfig,
  candidates: ModelCandidate[],
  onProgress?: (message: string) => void,
): Promise<{ results: StructuredOutputVariantResult[]; lifecycle: LocalModelDiagnostic[] }> {
  const results: StructuredOutputVariantResult[] = [];
  const lifecycle: LocalModelDiagnostic[] = [];
  for (const candidate of candidates) {
    const variants: StructuredOutputVariantResult["variant"][] = candidate.family === "gpt-oss"
      ? ["responses-json-schema", "chat-json-schema"]
      : ["chat-json-schema", "chat-json-schema-no-thinking"];
    onProgress?.(`${nowUtc()} · test-json · início · ${candidate.alias} [local]`);
    try {
      const modelResults = await withLmStudioModel(config, candidate, async () => {
        const calls: StructuredOutputVariantResult[] = [];
        for (const variant of variants) {
          const result = await runStructuredVariant(candidate, variant);
          calls.push(result);
          onProgress?.(`${nowUtc()} · test-json · ${result.status} · ${candidate.alias} · ${variant} · ${result.durationMs ?? "—"} ms${result.error ? ` · ${result.error.replace(/\s+/g, " ").slice(0, 300)}` : ""}`);
        }
        return calls;
      }, (diagnostic) => {
        lifecycle.push(diagnostic);
        onProgress?.(`${diagnostic.at} · test-json · LM Studio ${diagnostic.phase} · ${diagnostic.modelId}${diagnostic.contextLength ? ` · contexto=${diagnostic.contextLength}` : ""}${diagnostic.durationMs == null ? "" : ` · ${diagnostic.durationMs}ms`}${diagnostic.models ? ` · instâncias=${diagnostic.models.flatMap((model) => model.loaded_instances ?? []).map((instance) => instance.id).join(",") || "nenhuma"}` : ""}${diagnostic.error ? ` · ${diagnostic.error.replace(/\s+/g, " ").slice(0, 400)}` : ""}`);
      });
      results.push(...modelResults);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (const variant of variants) results.push({ alias: candidate.alias, modelId: candidate.modelId, variant, endpoint: "not-called", status: "load_error", outputChannel: null, durationMs: null, response: null, error: message });
      onProgress?.(`${nowUtc()} · test-json · load_error · ${candidate.alias} · ${message.replace(/\s+/g, " ").slice(0, 500)}`);
    }
  }
  return { results, lifecycle };
}

function extractResponseText(content: unknown): string | null {
  if (typeof content === "string") return content.trim() || null;
  if (!Array.isArray(content)) return null;
  const text = content.flatMap((part) => {
    if (!part || typeof part !== "object") return [];
    const item = part as { type?: unknown; text?: unknown };
    return item.type === "text" && typeof item.text === "string" ? [item.text] : [];
  }).join("").trim();
  return text || null;
}

function authHeaders(): Record<string, string> {
  const token = process.env.LM_STUDIO_API_TOKEN;
  return {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

export async function testLocalModels(
  config: HarnessConfig,
  candidates: ModelCandidate[],
  onProgress?: (message: string) => void,
): Promise<LocalModelTestResult[]> {
  const results: LocalModelTestResult[] = [];
  for (const candidate of candidates) {
    onProgress?.(`${nowUtc()} · test-local · início · ${candidate.alias} (${candidate.modelId})`);
    const baseUrl = candidate.endpoint ?? config.localInference.baseUrl;
    const result: LocalModelTestResult = {
      alias: candidate.alias,
      modelId: candidate.modelId,
      status: "failed",
      response: null,
      loadDurationMs: null,
      responseDurationMs: null,
      generationDurationMs: null,
      unloadDurationMs: null,
      inputTokens: null,
      outputTokens: null,
      error: null,
    };
    let cleanupRequired = false;
    try {
      const models = await listLmStudioModels(baseUrl);
      if (!models.some((model) => model.id === candidate.modelId || model.key === candidate.modelId)) {
        result.status = "not_found";
        result.error = "ID não retornado pela API nativa do Bionic/LM Studio.";
      } else {
        cleanupRequired = true;
        const loadStarted = performance.now();
        try {
          const lifecycle = await loadLmStudioModel(config, candidate);
          result.loadDurationMs = lifecycle.filter((item) => item.action === "load" || item.action === "load_confirmed").reduce((total, item) => total + item.durationMs, 0);
        } catch (error) {
          result.loadDurationMs = Math.round(performance.now() - loadStarted);
          throw error;
        }

        const started = performance.now();
        const response = await fetch(openAiEndpoint(baseUrl, "chat/completions"), {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            model: candidate.modelId,
            messages: [{ role: "user", content: "Responda somente com: oi" }],
            max_tokens: Math.min(Math.max(candidate.maxOutputTokens, 256), config.localInference.maxOutputTokens),
            temperature: 0,
            stream: false,
          }),
          signal: AbortSignal.timeout(180_000),
        });
        if (!response.ok) {
          const errorBody = (await response.text()).slice(0, 500);
          result.responseDurationMs = Math.round(performance.now() - started);
          throw new Error(`Inferência: HTTP ${response.status}: ${errorBody}`);
        }
        const payload = await response.json() as ChatResponse;
        result.responseDurationMs = Math.round(performance.now() - started);
        const firstChoice = payload.choices?.[0];
        const message = firstChoice?.message;
        result.response = extractResponseText(message?.content);
        result.generationDurationMs = typeof payload.stats?.generation_time === "number"
          ? Math.round(payload.stats.generation_time * 1000)
          : null;
        result.inputTokens = payload.usage?.prompt_tokens ?? null;
        result.outputTokens = payload.usage?.completion_tokens ?? null;
        if (!result.response) {
          const messageKeys = message ? Object.keys(message).filter((key) => key !== "reasoning" && key !== "reasoning_content") : [];
          const contentType = Array.isArray(message?.content) ? "array" : typeof message?.content;
          throw new Error(`Resposta textual vazia (finish_reason=${firstChoice?.finish_reason ?? "ausente"}; message_keys=${messageKeys.join("|") || "nenhuma"}; content_type=${contentType}).`);
        }
        result.status = "passed";
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
    } finally {
      if (cleanupRequired) {
        try {
          const cleanup = await unloadLmStudioModels(config, candidate);
          result.unloadDurationMs = cleanup.reduce((total, item) => total + item.durationMs, 0);
        } catch (error) {
          const cleanupError = error instanceof Error ? error.message : String(error);
          result.error = [result.error, `Falha ao descarregar: ${cleanupError}`].filter(Boolean).join("; ");
          result.status = "failed";
        }
      }
      results.push(result);
      onProgress?.(`${nowUtc()} · test-local · ${result.status} · ${candidate.alias} · carga=${result.loadDurationMs ?? "—"}ms · resposta=${result.responseDurationMs ?? "—"}ms · geração=${result.generationDurationMs ?? "—"}ms${result.error ? ` · ${result.error}` : ""}`);
    }
  }
  return results;
}

function csvCell(value: unknown): string {
  const normalized = Array.isArray(value)
    ? value.join("|")
    : typeof value === "string" || typeof value === "number" ? String(value) : "";
  return `"${normalized.replaceAll('"', '""')}"`;
}

export async function writeLocalModelTestReport(
  config: HarnessConfig,
  results: LocalModelTestResult[],
): Promise<string> {
  const generatedAt = nowUtc();
  const folderName = generatedAt.replaceAll(":", "-").replaceAll(".", "-");
  const directory = path.join(config.storage.root, "local-model-tests", folderName);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const columns: Array<keyof LocalModelTestResult> = [
    "alias", "modelId", "status", "loadDurationMs", "responseDurationMs", "generationDurationMs",
    "unloadDurationMs", "inputTokens", "outputTokens", "response", "error",
  ];
  const markdown = [
    "# Teste sequencial dos modelos locais", "", `Gerado: ${generatedAt}`, "",
    "Os modelos foram carregados um de cada vez, receberam o prompt `Responda somente com: oi` e foram descarregados após a chamada.",
    "Tempo de resposta inclui a requisição HTTP e a leitura do JSON; tempo de geração do servidor aparece separado quando disponível.", "",
    "| Alias | ID | Resultado | Carga (ms) | Resposta (ms) | Geração (ms) | Descarga (ms) | Tokens entrada/saída | Resposta | Erro |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |",
    ...results.map((item) => `| ${item.alias} | ${item.modelId} | ${item.status} | ${item.loadDurationMs ?? "—"} | ${item.responseDurationMs ?? "—"} | ${item.generationDurationMs ?? "—"} | ${item.unloadDurationMs ?? "—"} | ${item.inputTokens ?? "—"}/${item.outputTokens ?? "—"} | ${item.response ?? "—"} | ${item.error ?? "—"} |`),
    "",
  ].join("\n");
  const csv = [columns.join(","), ...results.map((item) => columns.map((column) => csvCell(item[column])).join(","))].join("\n");
  await writeJson(path.join(directory, "results.json"), { generatedAt, prompt: "Responda somente com: oi", results });
  await writeFile(path.join(directory, "results.csv"), `${csv}\n`, { mode: 0o600 });
  await writeFile(path.join(directory, "results.md"), markdown, { mode: 0o600 });
  return path.join(directory, "results.md");
}

export async function writeStructuredOutputTestReport(
  config: HarnessConfig,
  results: StructuredOutputVariantResult[],
  lifecycle: LocalModelDiagnostic[] = [],
): Promise<string> {
  const generatedAt = nowUtc();
  const folderName = generatedAt.replaceAll(":", "-").replaceAll(".", "-");
  const directory = path.join(config.storage.root, "local-model-tests", `structured-${folderName}`);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const markdown = [
    "# Teste de saída estruturada local", "", `Gerado: ${generatedAt}`, "",
    "Testes sequenciais com o contrato de resultado do harness. Falha de load, JSON inválido e incompatibilidade de schema são separados.", "",
    "| Alias | Variante | Endpoint | Status | Tempo (ms) | Erro | Resposta |",
    "| --- | --- | --- | ---: | ---: | --- | --- |",
    ...results.map((item) => `| ${item.alias} | ${item.variant} | ${item.endpoint} | ${item.status} (${item.outputChannel ?? "—"}) | ${item.durationMs ?? "—"} | ${(item.error ?? "—").replaceAll("|", "\\|")} | ${(item.response ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ")} |`),
    "",
  ].join("\n");
  await writeJson(path.join(directory, "results.json"), { generatedAt, schema: executionResultSchema, prompt: structuredSmokePrompt, results, lifecycle });
  await writeFile(path.join(directory, "results.md"), markdown, { mode: 0o600 });
  return path.join(directory, "results.md");
}
