import { z } from "zod";
import { RUN_STATES } from "../domain/types.js";

const moneySchema = z.union([
  z.string().regex(/^\d+(?:\.\d{1,6})?$/),
  z.number().nonnegative().transform(String),
]).nullable();

const commandSchema = z.array(z.string().min(1)).min(1);
const roleSchema = z.enum([
  "planner", "implementer", "testAuthor", "diagnostic", "functionalReviewer",
  "visualReviewer", "securityReviewer", "learningAnalyst",
]);

const milestoneSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9_-]*$/),
  title: z.string().min(1),
  objective: z.string().min(1),
});

const modelPoolSchema = z.array(z.string().min(1)).min(1);

export const harnessConfigSchema = z.object({
  project: z.object({
    id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
    workspace: z.string().min(1),
    specs: z.array(z.string().min(1)).min(1),
    designDirectory: z.string().min(1).optional(),
    milestones: z.array(milestoneSchema).min(1).default([
      { id: "0-setup", title: "Etapa 0 — Setup", objective: "Entregar a fundação verificável do projeto." },
    ]),
    profile: z.string().min(1).default("generic"),
    timezone: z.string().min(1).default("America/Sao_Paulo"),
  }),
  execution: z.object({
    executor: z.enum(["pi", "fake"]).default("pi"),
    maxConcurrentTasks: z.number().int().min(1).max(8).default(1),
    maxConcurrentLocalRequests: z.literal(1).default(1),
    maxAttemptsPerTask: z.number().int().min(1).max(10).default(3),
    maxSameFailureCount: z.number().int().min(1).max(5).default(2),
    taskTimeoutMinutes: z.number().positive().max(240).default(30),
    implementationTimeoutMinutes: z.number().positive().max(60).default(15),
    reviewTimeoutMinutes: z.number().positive().max(15).default(2),
    staleHeartbeatSeconds: z.number().int().min(15).default(90),
    humanGate: z.enum(["every_milestone", "selected_milestones", "final_only"]).default("every_milestone"),
    allowProductionDeploy: z.boolean().default(false),
    continueWhileAwaitingHuman: z.boolean().default(false),
    allowBranchSwitch: z.literal(false).default(false),
  }),
  budget: z.object({
    currency: z.literal("USD").default("USD"),
    projectLimit: moneySchema.default(null),
    dailyLimit: moneySchema.default(null),
    milestoneLimit: moneySchema.default(null),
    milestoneLimits: z.record(z.string(), moneySchema).default({}),
    taskLimit: moneySchema.default(null),
    diagnosticsLimit: moneySchema.default(null),
    finalVerificationReservePercent: z.number().min(0).max(90).default(20),
    warningThresholds: z.array(z.number().positive().max(100)).default([50, 75, 90]),
    automaticTopUp: z.literal(false).default(false),
    unknownCostPolicy: z.enum(["block_paid_calls", "allow_with_task_limit"]).default("block_paid_calls"),
  }),
  localInference: z.object({
    baseUrl: z.url().default("http://localhost:1235/v1"),
    maxLoadedModels: z.literal(1).default(1),
    initialContextTokens: z.number().int().min(1024).default(8192),
    maxOutputTokens: z.number().int().min(128).default(2048),
    memoryPressureAction: z.enum(["unload_and_route_or_pause", "pause"]).default("unload_and_route_or_pause"),
  }).default({
    baseUrl: "http://localhost:1235/v1",
    maxLoadedModels: 1,
    initialContextTokens: 8192,
    maxOutputTokens: 2048,
    memoryPressureAction: "unload_and_route_or_pause",
  }),
  review: z.object({
    requireIndependentSession: z.boolean().default(true),
    preferDifferentModelFamily: z.boolean().default(true),
    maxAttempts: z.number().int().min(1).max(10).default(9),
    viewportWidths: z.array(z.number().int().min(240).max(5120)).min(1).default([390, 768, 1440]),
  }).default({
    requireIndependentSession: true,
    preferDifferentModelFamily: true,
    maxAttempts: 9,
    viewportWidths: [390, 768, 1440],
  }),
  routing: z.object({
    pools: z.object({
      planner: modelPoolSchema,
      testAuthor: modelPoolSchema,
      implementer: modelPoolSchema,
      hardImplementer: modelPoolSchema,
      functionalReviewer: modelPoolSchema,
      visualReviewer: modelPoolSchema,
      securityReviewer: modelPoolSchema,
      diagnostic: modelPoolSchema,
      learningAnalyst: modelPoolSchema,
    }),
    hardTaskPatterns: z.array(z.string().min(1)).default([]),
  }).optional(),
  commands: z.record(z.string(), commandSchema).default({}),
  models: z.array(z.object({
    alias: z.string().min(1),
    executor: z.enum(["pi", "fake"]),
    provider: z.string().min(1),
    modelId: z.string().min(1),
    version: z.string().optional(),
    endpoint: z.url().optional(),
    quantization: z.string().optional(),
    family: z.string().min(1),
    modality: z.enum(["metered_api", "subscription", "local", "fake"]),
    capabilities: z.array(z.enum(["text", "vision", "tools", "structured_output", "reasoning"])).min(1),
    roles: z.array(roleSchema).min(1),
    enabled: z.boolean().default(true),
    contextTokens: z.number().int().positive(),
    maxOutputTokens: z.number().int().positive(),
    inputUsdPerMillion: z.string().regex(/^\d+(?:\.\d+)?$/).optional(),
    outputUsdPerMillion: z.string().regex(/^\d+(?:\.\d+)?$/).optional(),
    credentialEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/).optional(),
  })).min(1),
  storage: z.object({
    root: z.string().min(1).default("./.harness"),
    retentionDays: z.number().int().positive().default(30),
  }).default({ root: "./.harness", retentionDays: 30 }),
  dashboard: z.object({
    host: z.literal("127.0.0.1").default("127.0.0.1"),
    port: z.number().int().min(1024).max(65535).default(4317),
  }).default({ host: "127.0.0.1", port: 4317 }),
  security: z.object({
    allowedCommands: z.array(z.string().min(1)).default(["yarn", "node", "git", "rg"]),
    trustMode: z.enum(["workspace_process", "sandboxed"]).default("workspace_process"),
    redactPatterns: z.array(z.string()).default([]),
  }).default({ allowedCommands: ["yarn", "node", "git", "rg"], trustMode: "workspace_process", redactPatterns: [] }),
}).superRefine((config, context) => {
  const milestoneIds = config.project.milestones.map((item) => item.id);
  if (new Set(milestoneIds).size !== milestoneIds.length) {
    context.addIssue({ code: "custom", path: ["project", "milestones"], message: "IDs de etapas devem ser únicos." });
  }
  for (const id of Object.keys(config.budget.milestoneLimits)) {
    if (!milestoneIds.includes(id)) {
      context.addIssue({ code: "custom", path: ["budget", "milestoneLimits", id], message: "A etapa não existe em project.milestones." });
    }
  }
  const aliases = config.models.map((item) => item.alias);
  if (new Set(aliases).size !== aliases.length) {
    context.addIssue({ code: "custom", path: ["models"], message: "Aliases de modelos devem ser únicos." });
  }
  if (config.routing) {
    for (const [pool, poolAliases] of Object.entries(config.routing.pools)) {
      for (const alias of poolAliases) {
        if (!aliases.includes(alias)) {
          context.addIssue({ code: "custom", path: ["routing", "pools", pool], message: `Modelo inexistente no pool: ${alias}.` });
        }
      }
    }
  }
  if (config.budget.projectLimit != null) {
    const projectLimit = Number(config.budget.projectLimit);
    const stageTotal = Object.values(config.budget.milestoneLimits).reduce((total, value) => total + Number(value ?? 0), 0);
    const usableBeforeReserve = projectLimit * (1 - config.budget.finalVerificationReservePercent / 100);
    if (stageTotal > usableBeforeReserve + Number.EPSILON) {
      context.addIssue({ code: "custom", path: ["budget", "milestoneLimits"], message: "A soma das etapas ultrapassa o teto disponível antes da reserva final." });
    }
  }
});

export type HarnessConfigInput = z.input<typeof harnessConfigSchema>;
export type HarnessConfig = z.output<typeof harnessConfigSchema> & {
  configPath: string;
  configDirectory: string;
};

export const runStateSchema = z.enum(RUN_STATES);
