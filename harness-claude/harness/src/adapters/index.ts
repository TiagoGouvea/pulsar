import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "../config.js";
import { lmstudioUrl } from "./exec.js";
import { claudeCode } from "./claude-code.js";
import { codex } from "./codex.js";
import { fake } from "./fake.js";
import { gemini } from "./gemini.js";
import { pi } from "./pi.js";
import type { WorkerAdapter, WorkerSpec } from "./types.js";

export { lmstudioUrl };

export const adapters: Record<WorkerSpec["cli"], WorkerAdapter> = { claude: claudeCode, codex, agy: gemini, pi, fake };

/** Default credential vars per CLI (spec.env overrides/extends: target var -> .env var name). */
const defaultKeys: Record<string, Record<string, string>> = {
  claude: { ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY" },
  codex: { OPENAI_API_KEY: "OPENAI_API_KEY", CODEX_API_KEY: "OPENAI_API_KEY" },
  agy: {},   // agy uses its own login
  pi: { OPENROUTER_API_KEY: "OPENROUTER_API_KEY", LMSTUDIO_BASE_URL: "LMSTUDIO_BASE_URL" },
  fake: {},
};

/** Env vars the orchestrator injects for a worker (never the whole .env). */
export function envMapping(spec: WorkerSpec): Record<string, string> {
  return spec.env ? { ...(spec.cli === "claude" ? {} : defaultKeys[spec.cli]), ...spec.env } : defaultKeys[spec.cli];
}

export function workerEnv(ctx: Ctx, spec: WorkerSpec): Record<string, string> {
  const env = Object.fromEntries(
    Object.entries(envMapping(spec)).flatMap(([target, src]) => (ctx.env[src] ? [[target, ctx.env[src]!]] : [])),
  );
  return spec.cli === "pi" ? { ...env, PI_CODING_AGENT_DIR: piAgentDir(ctx) } : env;
}

/** Isolated pi agent dir (does not touch ~/.pi): models.json registers LM Studio with the configured local models. */
export function piAgentDir(ctx: Ctx) {
  const dir = join(ctx.root, ".harness", "pi-agent");
  const models = Object.values(ctx.config.workers).filter((w) => w.cli === "pi" && w.model.startsWith("lmstudio/"))
    .map((w) => ({ id: w.model.slice("lmstudio/".length), ...(w.maxContextTokens ? { contextWindow: w.maxContextTokens } : {}) }));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "models.json"), JSON.stringify({ providers: { lmstudio: { baseUrl: lmstudioUrl(ctx.env), api: "openai-completions", apiKey: "lmstudio", models } } }, null, 2));
  return dir;
}

/** .env vars that must be filled for the worker (LM Studio URL has a default; OpenRouter key only for openrouter/ models). */
export const requiredEnv = (spec: WorkerSpec) => [...new Set(Object.values(envMapping(spec)))]
  .filter((src) => src !== "LMSTUDIO_BASE_URL" && !(src === "OPENROUTER_API_KEY" && !spec.model.startsWith("openrouter/")));
