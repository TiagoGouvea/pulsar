import type { HarnessConfig } from "../config/schema.js";
import type { ModelCandidate } from "../domain/types.js";
import { safeError } from "../utils/core.js";

export interface LocalApiModel {
  key?: string;
  id?: string;
  display_name?: string;
  size_bytes?: number;
  loaded_instances?: Array<{ id: string; config?: Record<string, unknown> }>;
}

export interface LocalModelAction {
  action: "unload" | "unload_confirmed" | "load" | "load_confirmed";
  modelId: string;
  durationMs: number;
}

export interface LocalModelDiagnostic {
  at: string;
  phase: "before_unload" | "unloaded" | "loading" | "loaded" | "load_failed" | "after_unload" | "unload_failed";
  modelId: string;
  contextLength?: number;
  durationMs?: number;
  models?: LocalApiModel[];
  details?: Record<string, unknown>;
  error?: string;
}

type DiagnosticCallback = (diagnostic: LocalModelDiagnostic) => void;
const UNLOAD_CONFIRM_TIMEOUT_MS = 30_000;
const LOAD_CONFIRM_TIMEOUT_MS = 30_000;
const UNLOAD_POLL_INTERVAL_MS = 500;

export function localApiEndpoint(baseUrl: string, resource: string): URL {
  const url = new URL(baseUrl);
  const prefix = url.pathname.replace(/\/v1\/?$/, "").replace(/\/+$/, "");
  url.pathname = `${prefix}/api/v1/${resource.replace(/^\/+/, "")}`;
  return url;
}

function headers(): Record<string, string> {
  const token = process.env.LM_STUDIO_API_TOKEN;
  return {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

function apiBase(config: HarnessConfig, candidate?: ModelCandidate): string {
  return candidate?.endpoint ?? config.localInference.baseUrl;
}

async function apiRequest<T>(baseUrl: string, resource: string, body?: unknown): Promise<{ payload: T; durationMs: number }> {
  const started = performance.now();
  const response = await fetch(localApiEndpoint(baseUrl, resource), {
    method: body === undefined ? "GET" : "POST",
    headers: headers(),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(resource === "models/load" ? 15 * 60_000 : resource === "models/unload" ? 5 * 60_000 : 30_000),
  });
  if (!response.ok) throw new Error(`LM Studio API ${resource}: HTTP ${response.status}: ${(await response.text()).slice(0, 4_000)}`);
  const payload = await response.json() as T;
  return { payload, durationMs: Math.round(performance.now() - started) };
}

export async function listLmStudioModels(baseUrl: string): Promise<LocalApiModel[]> {
  const { payload } = await apiRequest<{ models?: LocalApiModel[]; data?: LocalApiModel[] }>(baseUrl, "models");
  return payload.models ?? payload.data ?? [];
}

export async function unloadLmStudioModels(config: HarnessConfig, candidate?: ModelCandidate, onDiagnostic?: DiagnosticCallback): Promise<LocalModelAction[]> {
  const baseUrl = apiBase(config, candidate);
  const initialModels = await listLmStudioModels(baseUrl);
  onDiagnostic?.({ at: new Date().toISOString(), phase: "before_unload", modelId: candidate?.modelId ?? "all", models: initialModels });
  const actions: LocalModelAction[] = [];
  try {
    for (const model of initialModels) {
      for (const instance of model.loaded_instances ?? []) {
        const { durationMs } = await apiRequest(baseUrl, "models/unload", { instance_id: instance.id });
        actions.push({ action: "unload", modelId: instance.id, durationMs });
      }
    }
    const waitStarted = performance.now();
    let remaining = initialModels;
    const deadline = Date.now() + UNLOAD_CONFIRM_TIMEOUT_MS;
    do {
      await new Promise((resolve) => setTimeout(resolve, UNLOAD_POLL_INTERVAL_MS));
      remaining = await listLmStudioModels(baseUrl);
    } while (remaining.some((model) => (model.loaded_instances?.length ?? 0) > 0) && Date.now() < deadline);
    if (remaining.some((model) => (model.loaded_instances?.length ?? 0) > 0)) {
      throw new Error(`LM Studio não confirmou o unload em ${UNLOAD_CONFIRM_TIMEOUT_MS} ms: ${remaining.flatMap((model) => (model.loaded_instances ?? []).map((instance) => instance.id)).join(", ")}`);
    }
    const durationMs = Math.round(performance.now() - waitStarted);
    actions.push({ action: "unload_confirmed", modelId: "all", durationMs });
    onDiagnostic?.({ at: new Date().toISOString(), phase: "unloaded", modelId: candidate?.modelId ?? "all", durationMs, models: remaining });
  } catch (error) {
    onDiagnostic?.({ at: new Date().toISOString(), phase: "unload_failed", modelId: candidate?.modelId ?? "all", models: await listLmStudioModels(baseUrl).catch(() => []), error: safeError(error) });
    throw error;
  }
  return actions;
}

export async function loadLmStudioModel(config: HarnessConfig, candidate: ModelCandidate, onDiagnostic?: DiagnosticCallback): Promise<LocalModelAction[]> {
  if (candidate.modality !== "local") throw new Error(`${candidate.alias} não é um candidato local.`);
  const baseUrl = apiBase(config, candidate);
  const actions = await unloadLmStudioModels(config, candidate, onDiagnostic);
  const contextLength = Math.min(candidate.contextTokens, config.localInference.initialContextTokens);
  onDiagnostic?.({ at: new Date().toISOString(), phase: "loading", modelId: candidate.modelId, contextLength });
  let payload: { instance_id?: string; load_config?: Record<string, unknown> };
  let durationMs: number;
  try {
    ({ payload, durationMs } = await apiRequest<{ instance_id?: string; load_config?: Record<string, unknown> }>(baseUrl, "models/load", {
      model: candidate.modelId,
      context_length: contextLength,
      echo_load_config: true,
    }));
  } catch (error) {
    onDiagnostic?.({
      at: new Date().toISOString(), phase: "load_failed", modelId: candidate.modelId, contextLength,
      models: await listLmStudioModels(baseUrl).catch(() => []), error: safeError(error),
    });
    throw error;
  }
  actions.push({ action: "load", modelId: payload.instance_id ?? candidate.modelId, durationMs });
  const confirmStarted = performance.now();
  let loadedModels: LocalApiModel[] = [];
  const deadline = Date.now() + LOAD_CONFIRM_TIMEOUT_MS;
  const isLoaded = (): boolean => loadedModels.some((model) =>
    (model.key === candidate.modelId || model.id === candidate.modelId)
    && (model.loaded_instances ?? []).some((instance) => !payload.instance_id || instance.id === payload.instance_id),
  );
  do {
    await new Promise((resolve) => setTimeout(resolve, UNLOAD_POLL_INTERVAL_MS));
    loadedModels = await listLmStudioModels(baseUrl);
  } while (!isLoaded() && Date.now() < deadline);
  if (!isLoaded()) {
    const message = `LM Studio respondeu load para ${candidate.modelId}, mas a API não confirmou a instância em ${LOAD_CONFIRM_TIMEOUT_MS} ms.`;
    onDiagnostic?.({ at: new Date().toISOString(), phase: "load_failed", modelId: candidate.modelId, contextLength, models: loadedModels, error: message });
    throw new Error(message);
  }
  const confirmDurationMs = Math.round(performance.now() - confirmStarted);
  actions.push({ action: "load_confirmed", modelId: payload.instance_id ?? candidate.modelId, durationMs: confirmDurationMs });
  onDiagnostic?.({
    at: new Date().toISOString(), phase: "loaded", modelId: payload.instance_id ?? candidate.modelId,
    contextLength, durationMs: durationMs + confirmDurationMs, models: loadedModels,
    ...(payload.load_config ? { details: payload.load_config } : {}),
  });
  return actions;
}

export async function withLmStudioModel<T>(
  config: HarnessConfig,
  candidate: ModelCandidate,
  work: () => Promise<T>,
  onDiagnostic?: DiagnosticCallback,
): Promise<T> {
  let result: T | undefined;
  let primaryError: unknown;
  try {
    await loadLmStudioModel(config, candidate, onDiagnostic);
    result = await work();
  } catch (error) {
    primaryError = error;
  }

  let cleanupError: unknown;
  try {
    await unloadLmStudioModels(config, candidate, onDiagnostic);
  } catch (error) {
    cleanupError = error;
  }

  if (primaryError && cleanupError) {
    throw new AggregateError([primaryError, cleanupError], `A inferência local falhou (${safeError(primaryError)}) e a limpeza do LM Studio falhou (${safeError(cleanupError)}).`);
  }
  if (primaryError) throw primaryError instanceof Error ? primaryError : new Error(safeError(primaryError));
  if (cleanupError) throw cleanupError instanceof Error ? cleanupError : new Error(safeError(cleanupError));
  return result as T;
}
