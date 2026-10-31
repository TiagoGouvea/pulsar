import type { HarnessConfig } from "../config/schema.js";
import type { ModelCandidate } from "../domain/types.js";
import { safeError } from "../utils/core.js";

export interface LocalApiModel {
  key?: string;
  id?: string;
  loaded_instances?: Array<{ id: string }>;
}

export interface LocalModelAction {
  action: "unload" | "load";
  modelId: string;
  durationMs: number;
}

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
  if (!response.ok) throw new Error(`LM Studio API ${resource}: HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
  const payload = await response.json() as T;
  return { payload, durationMs: Math.round(performance.now() - started) };
}

export async function listLmStudioModels(baseUrl: string): Promise<LocalApiModel[]> {
  const { payload } = await apiRequest<{ models?: LocalApiModel[]; data?: LocalApiModel[] }>(baseUrl, "models");
  return payload.models ?? payload.data ?? [];
}

export async function unloadLmStudioModels(config: HarnessConfig, candidate?: ModelCandidate): Promise<LocalModelAction[]> {
  const baseUrl = apiBase(config, candidate);
  const models = await listLmStudioModels(baseUrl);
  const actions: LocalModelAction[] = [];
  for (const model of models) {
    for (const instance of model.loaded_instances ?? []) {
      const { durationMs } = await apiRequest(baseUrl, "models/unload", { instance_id: instance.id });
      actions.push({ action: "unload", modelId: instance.id, durationMs });
    }
  }
  return actions;
}

export async function loadLmStudioModel(config: HarnessConfig, candidate: ModelCandidate): Promise<LocalModelAction[]> {
  if (candidate.modality !== "local") throw new Error(`${candidate.alias} não é um candidato local.`);
  const baseUrl = apiBase(config, candidate);
  const actions = await unloadLmStudioModels(config, candidate);
  const { payload, durationMs } = await apiRequest<{ instance_id?: string }>(baseUrl, "models/load", {
    model: candidate.modelId,
    context_length: Math.min(candidate.contextTokens, config.localInference.initialContextTokens),
    echo_load_config: true,
  });
  actions.push({ action: "load", modelId: payload.instance_id ?? candidate.modelId, durationMs });
  return actions;
}

export async function withLmStudioModel<T>(
  config: HarnessConfig,
  candidate: ModelCandidate,
  work: () => Promise<T>,
): Promise<T> {
  let result: T | undefined;
  let primaryError: unknown;
  try {
    await loadLmStudioModel(config, candidate);
    result = await work();
  } catch (error) {
    primaryError = error;
  }

  let cleanupError: unknown;
  try {
    await unloadLmStudioModels(config, candidate);
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
