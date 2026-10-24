// LM Studio native REST API (/api/v1): only one local model in memory at a time.
// Before a call: unload every loaded instance, then load the needed model. After: unload it.
import { lmstudioUrl } from "./exec.js";
import type { WorkerSpec } from "./types.js";

type Env = Record<string, string | undefined>;
export const LM_PREFIX = "lmstudio/";
export const isLocal = (spec: WorkerSpec) => spec.model.startsWith(LM_PREFIX);
export const lmKey = (spec: WorkerSpec) => spec.model.slice(LM_PREFIX.length);

const api = (env: Env, path: string) => lmstudioUrl(env).replace(/\/v1\/?$/, "") + `/api/v1/models${path}`;

async function call(env: Env, path: string, body?: object, timeoutMs = 10_000) {
  const r = await fetch(api(env, path), {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json" },
    body: body && JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  return (await r.json()) as any;
}

/** Downloaded models with their loaded instances. */
export async function listModels(env: Env): Promise<{ key: string; size_bytes: number; loaded_instances: { id: string }[] }[]> {
  return (await call(env, "")).models ?? [];
}

export async function unloadAll(env: Env) {
  for (const m of await listModels(env)) for (const i of m.loaded_instances) await call(env, "/unload", { instance_id: i.id });
}

/** Unloads everything and loads only this model. Returns an error message or null. */
export async function loadOnly(spec: WorkerSpec, env: Env): Promise<string | null> {
  await unloadAll(env);
  const r = await call(env, "/load", { model: lmKey(spec), ...(spec.maxContextTokens ? { context_length: spec.maxContextTokens } : {}) }, 600_000);
  return r.status === "loaded" ? null : (r.error?.message ?? JSON.stringify(r));
}

export const unload = (spec: WorkerSpec, env: Env) => call(env, "/unload", { instance_id: lmKey(spec) }).catch(() => undefined);
