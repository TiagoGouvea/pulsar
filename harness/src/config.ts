import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

export const PLACEHOLDER = "<preencher>";

const Worker = z.object({
  cli: z.enum(["claude", "codex", "agy", "pi", "fake"]),
  model: z.string(),
  family: z.enum(["anthropic", "openai", "google", "zhipu", "moonshot", "deepseek", "qwen", "local-other"]),
  tier: z.enum(["high", "mid", "low", "local"]),
  vision: z.boolean(),
  billing: z.enum(["api", "subscription", "local"]),
  env: z.record(z.string(), z.string()).optional(),
  maxContextTokens: z.number().optional(),
  requiresFreeRamGb: z.number().optional(),
  concurrency: z.number().int().min(1),
  timeoutMin: z.number().positive(),
  enabled: z.boolean().default(true),
});

const RoleCfg = z.object({
  pool: z.array(z.string()).min(1),
  rule: z.literal("different_family_from_implementer").optional(),
  requires: z.literal("vision").optional(),
  note: z.string().optional(),
});

const Gate = z.object({
  name: z.string(),
  cmd: z.string().optional(),
  updateCmd: z.string().optional(),
  builtin: z.enum(["protected", "privacy", "a11y", "layout", "lighthouse", "secrets"]).optional(),
  fromStage: z.number().default(0),
  scope: z.enum(["feature", "stage"]).default("feature"),
  required: z.boolean().default(true),
});

export const ConfigSchema = z.object({
  project: z.object({
    name: z.string(),
    repo: z.string().default("."),   // project git repo (spec, design, app), relative to the harness root
    appDir: z.string(),
    specFiles: z.record(z.string(), z.string()),
    acceptanceSection: z.string().default("10"),
    designDir: z.string(),
    decisionsFile: z.string(),
    language: z.string(),
    mainBranch: z.string().default("main"),
  }),
  workers: z.record(z.string(), Worker),
  roles: z.record(z.string(), RoleCfg),
  routing: z.object({
    explorationRate: z.number().min(0).max(1),
    escalateAfterFailures: z.number().int(),
    maxAttemptsPerFeature: z.number().int(),
    hardTags: z.array(z.string()).default([]),
    tournament: z.object({
      enabled: z.boolean(),
      tags: z.array(z.string()),
      contenders: z.number().int().min(2),
      judge: z.string(),
    }),
  }),
  loop: z.object({
    maxParallelTasks: z.number().int().min(1),
    retroEveryNFeatures: z.number().int().min(1),
    stopOnSpecChange: z.boolean(),
    maxStageFixRounds: z.number().int().default(3),
  }),
  stages: z.array(z.object({ id: z.number().int(), name: z.string(), optional: z.boolean().default(false) })),
  gates: z.record(z.string(), Gate),
  browser: z.object({
    serveCmd: z.string(),
    baseUrl: z.string(),
    routesFile: z.string(),
    readyTimeoutSec: z.number().default(120),
    sentinels: z.array(z.string()).min(1),
    lighthouse: z.object({ performance: z.number(), accessibility: z.number() }),
  }),
  preview: z.object({
    enabled: z.boolean(),
    buildCmd: z.string(),
    deployCmd: z.string(),
    demoSeedCmd: z.string().optional(),
  }),
  notify: z.object({ webhookEnv: z.string(), events: z.array(z.string()) }),
});

export const BudgetSchema = z.object({
  currency: z.string(),
  caps: z.object({
    run: z.number(),
    stage: z.number(),                                    // default per stage
    byStage: z.record(z.string(), z.number()).default({}), // per-stage override, keyed by stage id
    feature: z.number(),
    dailyByProvider: z.record(z.string(), z.number()),
  }),
  alerts: z.array(z.number()),
  onSoftLimit: z.literal("prefer_cheap"),
  onHardLimit: z.literal("pause_and_checkpoint"),
});

const Price = z.union([z.number(), z.string()]);
export const PricesSchema = z.record(z.string(), z.object({ input: Price, output: Price, cached: Price.optional() }));

export type Config = z.infer<typeof ConfigSchema>;
export type WorkerCfg = z.infer<typeof Worker>;
export type Budget = z.infer<typeof BudgetSchema>;
export type Prices = z.infer<typeof PricesSchema>;

export interface Ctx {
  root: string;   // harness folder: config, .harness state, checkpoints, .env
  repo: string;   // project repo: spec, design, decisions, app code (worktrees live here)
  config: Config;
  budget: Budget;
  prices: Prices;
  env: Record<string, string | undefined>;
}

const readYaml = <T>(file: string, schema: z.ZodType<T>): T => {
  const res = schema.safeParse(parse(readFileSync(file, "utf8")) ?? {});
  if (!res.success) throw new Error(`${file} inválido:\n${z.prettifyError(res.error)}`);
  return res.data;
};

/** Parses a dotenv file without exporting it to process.env (workers only receive injected vars). */
export function readDotenv(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(#.*)?$/);
    if (m && m[2]) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

export function loadCtx(root: string): Ctx {
  const config = readYaml(join(root, "harness.config.yaml"), ConfigSchema);
  return {
    root,
    repo: resolve(root, config.project.repo),
    config,
    budget: readYaml(join(root, "budget.yaml"), BudgetSchema),
    prices: existsSync(join(root, "prices.yaml")) ? readYaml(join(root, "prices.yaml"), PricesSchema) : {},
    env: { ...readDotenv(join(root, ".env")), ...pick(process.env, ["HARNESS_ALLOW_DEMO_SEED"]) },
  };
}

const pick = (o: NodeJS.ProcessEnv, keys: string[]) =>
  Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));

export const enabledWorkers = (ctx: Ctx) =>
  Object.entries(ctx.config.workers)
    .filter(([, w]) => w.enabled)
    .map(([id, w]) => ({ id, ...w }));

/** Provider used for daily caps and reporting. */
export function providerOf(w: WorkerCfg): string {
  if (w.billing === "local" || w.cli === "fake") return "local";
  if (w.billing === "subscription") return w.family === "zhipu" ? "zai" : w.family;
  if (w.cli === "pi" && w.model.startsWith("openrouter/")) return "openrouter";
  return { anthropic: "anthropic", openai: "openai", google: "google" }[w.family as string] ?? w.family;
}
