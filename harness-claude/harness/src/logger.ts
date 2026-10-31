import { appendFileSync } from "node:fs";
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

let consoleFile: string | undefined;
/** Mirrors every log line to a file (followed by `harness watch`). */
export const setConsoleFile = (f: string) => { consoleFile = f; };

export const log = (msg: string) => {
  const line = `[${new Date().toTimeString().slice(0, 8)}] ${msg}`;
  if (!process.env.HARNESS_QUIET) console.log(line);
  if (consoleFile) appendFileSync(consoleFile, line + "\n");
};

/** 2h05m / 3m12s / 41s */
export const fmtDur = (ms: number) => {
  const s = Math.round(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}h${String(m).padStart(2, "0")}m` : m ? `${m}m${String(s % 60).padStart(2, "0")}s` : `${s}s`;
};
