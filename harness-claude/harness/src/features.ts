import { z } from "zod";
import type { Ctx } from "./config.js";
import { hp, readJson, writeJson } from "./state.js";

export const FeatureSchema = z.object({
  id: z.string(),
  stage: z.number().int(),
  title: z.string(),
  description: z.string(),
  specRefs: z.array(z.string()).default([]),
  covers: z.array(z.string()).default([]),          // acceptance criteria ids of the spec (AC-01…)
  acceptance: z.array(z.string()).min(1),
  tests: z.array(z.string()).default([]),
  protectedTests: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  difficulty: z.enum(["easy", "normal", "hard"]).default("normal"),
  dependsOn: z.array(z.string()).default([]),
  status: z.enum(["failing", "in_progress", "passing", "blocked"]).default("failing"),
  attempts: z.number().int().default(0),
  costUsd: z.number().default(0),
  blockedReason: z.string().optional(),
  spendSince: z.string().optional(),
  // attempt whose (paid) worker call finished but whose gates/review did not: a resume evaluates that code instead of re-running a model
  pending: z.object({ attempt: z.number().int(), role: z.string(), workerId: z.string() }).optional(),   // ISO ts: the feature cap only counts spend after it (set when a feature is reset)
  history: z.array(z.record(z.string(), z.any())).default([]),
  // who did what (filled when the feature lands): implementer, attempt trail, test writer, reviewers, files
  authors: z.object({
    implementer: z.string(), attempts: z.array(z.string()).default([]), testWriter: z.string().optional(),
    reviewers: z.array(z.string()).default([]), files: z.array(z.string()).default([]),
  }).optional(),
  origin: z.array(z.string()).default([]),   // adjustment features: ids of the delivered features it fixes
});
export const FeaturesFileSchema = z.object({ specHash: z.string().default(""), features: z.array(FeatureSchema) });

export type Feature = z.infer<typeof FeatureSchema>;
export type FeaturesFile = z.infer<typeof FeaturesFileSchema>;

const file = (ctx: Ctx) => hp(ctx, "features.json");
export const loadFeatures = (ctx: Ctx): FeaturesFile => readJson(file(ctx), { specHash: "", features: [] }, FeaturesFileSchema);
export const saveFeatures = (ctx: Ctx, f: FeaturesFile) => writeJson(file(ctx), f);

/** Applies a mutation to a single feature and persists immediately (only the orchestrator calls this). */
export function updateFeature(ctx: Ctx, id: string, fn: (f: Feature) => void) {
  const all = loadFeatures(ctx);
  const f = all.features.find((x) => x.id === id);
  if (!f) throw new Error(`feature ${id} não existe`);
  fn(f);
  saveFeatures(ctx, all);
  return f;
}

/** Next runnable feature of the stage: failing, dependencies passing, not already running. */
export function nextFeature(all: FeaturesFile, stage: number, running: Set<string>) {
  const passing = new Set(all.features.filter((f) => f.status === "passing").map((f) => f.id));
  return all.features.find((f) => f.stage === stage && f.status === "failing" && !running.has(f.id) && f.dependsOn.every((d) => passing.has(d)));
}

export const stageFeatures = (all: FeaturesFile, stage: number) => all.features.filter((f) => f.stage === stage);

/** A stage has no more work when nothing is failing/in_progress with satisfiable deps. */
export const stageSettled = (all: FeaturesFile, stage: number) =>
  !nextFeature(all, stage, new Set()) && !stageFeatures(all, stage).some((f) => f.status === "in_progress");

/** Crash recovery: in_progress features go back to failing (the interrupted attempt is not counted). */
export function resetInProgress(ctx: Ctx) {
  const all = loadFeatures(ctx);
  const ids = all.features.filter((f) => f.status === "in_progress").map((f) => ((f.status = "failing"), f.id));
  if (ids.length) saveFeatures(ctx, all);
  return ids;
}

/** Acceptance criteria ids not covered by any feature. */
export const uncovered = (all: FeaturesFile, acIds: string[]) => {
  const covered = new Set(all.features.flatMap((f) => f.covers));
  return acIds.filter((id) => !covered.has(id));
};
