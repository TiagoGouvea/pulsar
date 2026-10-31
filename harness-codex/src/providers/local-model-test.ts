import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { HarnessConfig } from "../config/schema.js";
import type { ModelCandidate } from "../domain/types.js";
import { nowUtc, writeJson } from "../utils/core.js";
import { openAiEndpoint } from "./probes.js";
import { listLmStudioModels, loadLmStudioModel, unloadLmStudioModels } from "./lmstudio.js";

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
          result.loadDurationMs = lifecycle.find((item) => item.action === "load")?.durationMs ?? null;
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
