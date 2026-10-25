import type { Ctx } from "./config.js";
import { appendJsonl, hp, readJsonl } from "./state.js";

export interface HarnessEvent {
  id?: string;
  ts?: string;
  taskId: string;
  featureId?: string;
  stage: number;
  role: string;
  workerId: string;
  family: string;
  attempt: number;
  outcome: "success" | "failure" | "timeout" | "invalid_json" | "protected_violation" | "review_rejected" | "error";
  failedGates?: string[];
  tokens?: { in: number; out: number };
  costUsd?: number;
  durationMs?: number;
  tags?: string[];
  [k: string]: unknown;
}

const counters = new Map<string, number>();

/** Only the orchestrator writes events. Returns the event id (evt-N), used as lesson evidence. */
export function logEvent(ctx: Ctx, ev: HarnessEvent): string {
  const file = hp(ctx, "events.jsonl");
  const n = (counters.get(file) ?? readJsonl(file).length) + 1;
  counters.set(file, n);
  appendJsonl(file, { id: `evt-${n}`, ts: new Date().toISOString(), ...ev });
  return `evt-${n}`;
}

export const readEvents = (ctx: Ctx) => readJsonl<HarnessEvent>(hp(ctx, "events.jsonl"));

export const log = (msg: string) => {
  if (!process.env.HARNESS_QUIET) console.log(`[harness ${new Date().toISOString().slice(11, 19)}] ${msg}`);
};
