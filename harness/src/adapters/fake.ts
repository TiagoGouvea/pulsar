// Scripted worker used by the harness test-suite: no CLI, no cost.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { FatalError, type WorkerAdapter, type WorkerRun, type WorkerSpec } from "./types.js";

export interface FakeStep {
  kind?: "success" | "fail" | "timeout" | "invalid_json" | "crash";
  files?: Record<string, string>;   // written relative to the worktree
  json?: unknown;                   // final JSON block
  text?: string;
  costUsd?: number;
  tokens?: number;
}
export type FakeScript = (run: WorkerRun, spec: WorkerSpec) => FakeStep | undefined;

let script: FakeScript | undefined;
export const setFakeScript = (s?: FakeScript) => { script = s; };

const defaults: Record<string, unknown> = {
  review_code: { pass: true, score: 9, issues: [] },
  review_ui: { pass: true, score: 9, porCriterio: {}, issues: [] },
  triage: { causaRaiz: "falha simulada", categoria: "logic", padrao: false, dica: "tente novamente" },
  approval_parser: { aprovado: true, ajustes: [], respostasDuvidas: [] },
  retro: { create: [], edit: [], retire: [], promote: [], aprendizados: "-", comoTestar: "1. Abra o preview." },
  postmortem: { proposals: [] },
};

export const fake: WorkerAdapter = {
  async run(spec, run, opts) {
    const step = script?.(run, spec) ?? {};
    if (step.kind === "crash") throw new FatalError("fake crash");
    for (const [f, c] of Object.entries(step.files ?? (run.role.startsWith("implement") || run.role === "test_writer" ? { [`app/src/${run.taskId}-${run.role}.ts`]: `export const x = ${run.attempt};\n` } : {}))) {
      mkdirSync(dirname(join(run.cwd, f)), { recursive: true });
      writeFileSync(join(run.cwd, f), c);
    }
    const json = step.json ?? defaults[run.role] ?? { summary: "ok", filesChanged: Object.keys(step.files ?? {}), testsRun: [], confidence: "high", notes: "" };
    const finalText = step.text ?? (step.kind === "invalid_json" ? "resultado sem json {quebrado" : `Pronto.\n\`\`\`json\n${JSON.stringify(json)}\n\`\`\``);
    mkdirSync(dirname(opts.transcriptPath), { recursive: true });
    writeFileSync(opts.transcriptPath, JSON.stringify({ role: run.role, prompt: run.prompt.slice(0, 2000), finalText }) + "\n");
    const tokens = step.tokens ?? 1000;
    return {
      ok: !step.kind || step.kind === "success" || step.kind === "invalid_json",
      exitCode: step.kind === "fail" ? 1 : 0,
      timedOut: step.kind === "timeout",
      finalText,
      usage: { inputTokens: tokens, outputTokens: tokens / 10, costUsd: step.costUsd ?? 0.01 },
      durationMs: 5,
      transcriptPath: opts.transcriptPath,
    };
  },
};
