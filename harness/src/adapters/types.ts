import type { WorkerCfg } from "../config.js";

export type Role =
  | "initializer" | "test_writer" | "implement" | "implement_hard" | "review_code" | "review_ui"
  | "triage" | "approval_parser" | "retro" | "postmortem" | "smoke" | "doctor";

export type WorkerSpec = WorkerCfg & { id: string };

export interface WorkerRun {
  workerId: string;
  role: Role;
  cwd: string;              // task worktree
  prompt: string;
  attachments?: string[];   // image paths (visual evaluator)
  taskId: string;
  attempt: number;
}

export interface Usage { inputTokens: number; outputTokens: number; cachedTokens?: number; costUsd?: number }

export interface WorkerResult {
  ok: boolean;
  exitCode: number;
  finalText: string;
  structured?: unknown;
  usage: Usage;
  durationMs: number;
  transcriptPath: string;
  timedOut?: boolean;
}

export interface RunOpts {
  transcriptPath: string;
  env: Record<string, string>;   // only the vars injected for this worker
}

/** Unrecoverable error: the orchestrator stops (state CRASHED) instead of treating it as a worker failure. */
export class FatalError extends Error {}

export interface WorkerAdapter {
  run(spec: WorkerSpec, run: WorkerRun, opts: RunOpts): Promise<WorkerResult>;
  /** Optional availability probe (e.g. LM Studio endpoint up). */
  available?(spec: WorkerSpec, env: Record<string, string | undefined>): Promise<boolean>;
  /** Called right before a call (e.g. load the local model alone). Returns an error message or null. */
  prepare?(spec: WorkerSpec, env: Record<string, string | undefined>): Promise<string | null>;
  /** Called after the call, success or not (e.g. unload the local model). */
  release?(spec: WorkerSpec, env: Record<string, string | undefined>): Promise<void>;
}
