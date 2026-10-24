import type { Ctx } from "../config.js";
import { claudeCode } from "./claude-code.js";
import { codex } from "./codex.js";
import { fake } from "./fake.js";
import { gemini } from "./gemini.js";
import { pi } from "./pi.js";
import type { WorkerAdapter, WorkerSpec } from "./types.js";

export const adapters: Record<WorkerSpec["cli"], WorkerAdapter> = { claude: claudeCode, codex, gemini, pi, fake };

/** Default credential vars per CLI (spec.env overrides/extends: target var -> .env var name). */
const defaultKeys: Record<string, Record<string, string>> = {
  claude: { ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY" },
  codex: { OPENAI_API_KEY: "OPENAI_API_KEY", CODEX_API_KEY: "OPENAI_API_KEY" },
  gemini: { GEMINI_API_KEY: "GEMINI_API_KEY" },
  pi: { OPENROUTER_API_KEY: "OPENROUTER_API_KEY", LMSTUDIO_BASE_URL: "LMSTUDIO_BASE_URL" },
  fake: {},
};

/** Env vars the orchestrator injects for a worker (never the whole .env). */
export function envMapping(spec: WorkerSpec): Record<string, string> {
  return spec.env ? { ...(spec.cli === "claude" ? {} : defaultKeys[spec.cli]), ...spec.env } : defaultKeys[spec.cli];
}

export function workerEnv(ctx: Ctx, spec: WorkerSpec): Record<string, string> {
  return Object.fromEntries(
    Object.entries(envMapping(spec)).flatMap(([target, src]) => (ctx.env[src] ? [[target, ctx.env[src]!]] : [])),
  );
}
