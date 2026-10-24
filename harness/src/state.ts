import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import type { Ctx } from "./config.js";

export const PHASES = [
  "INIT", "STAGE_RUNNING", "STAGE_GATES", "CHECKPOINT_READY", "AWAITING_APPROVAL", "DONE",
  "PAUSED_BUDGET", "PAUSED_SPEC_CHANGE", "PAUSED_MANUAL", "CRASHED",
] as const;
export type Phase = (typeof PHASES)[number];

export const StateSchema = z.object({
  phase: z.enum(PHASES),
  stage: z.number().int(),
  pausedFrom: z.enum(PHASES).optional(),
  featuresSinceRetro: z.number().int().default(0),
  stageFixRounds: z.number().int().default(0),
  budgetAlerts: z.array(z.number()).default([]),
  postmortemDone: z.boolean().default(false),
  lastError: z.string().optional(),
  updatedAt: z.string(),
});
export type State = z.infer<typeof StateSchema>;

/** Path inside .harness/ */
export const hp = (ctx: Ctx, ...p: string[]) => join(ctx.root, ".harness", ...p);

export function writeAtomic(file: string, content: string) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, content);
  renameSync(tmp, file);
}

export const writeJson = (file: string, data: unknown) => writeAtomic(file, JSON.stringify(data, null, 2) + "\n");

export function readJson<T>(file: string, fallback: T, schema?: z.ZodType<T>): T {
  if (!existsSync(file)) return fallback;
  const data = JSON.parse(readFileSync(file, "utf8"));
  return schema ? schema.parse(data) : data;
}

export function appendJsonl(file: string, row: unknown) {
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, JSON.stringify(row) + "\n");
}

export function readJsonl<T = any>(file: string): T[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").filter(Boolean).flatMap((l) => {
    try { return [JSON.parse(l)]; } catch { return []; }
  });
}

export const loadState = (ctx: Ctx): State | null =>
  existsSync(hp(ctx, "state.json")) ? readJson(hp(ctx, "state.json"), null as any, StateSchema) : null;

export function saveState(ctx: Ctx, s: State) {
  s.updatedAt = new Date().toISOString();
  writeJson(hp(ctx, "state.json"), s);
}

export const newState = (): State => StateSchema.parse({ phase: "INIT", stage: 0, updatedAt: new Date().toISOString() });
