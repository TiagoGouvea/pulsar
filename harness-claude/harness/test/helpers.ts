import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringify } from "yaml";
import { setFakeScript, type FakeScript, type FakeStep } from "../src/adapters/fake.js";
import { loadCtx, type Ctx } from "../src/config.js";
import { checkProtected } from "../src/gates/protected.js";
import type { GateOpts, GateReport } from "../src/gates/run-gates.js";
import { git } from "../src/git.js";
import { type Deps, Orchestrator } from "../src/orchestrator.js";

const fakeWorker = (family: string, tier = "high", vision = true) => ({ cli: "fake", model: "fake", family, tier, vision, billing: "api", concurrency: 2, timeoutMin: 1 });

export const WORKERS = {
  "fake-anthropic": fakeWorker("anthropic"),
  "fake-openai": fakeWorker("openai"),
  "fake-google": fakeWorker("google", "mid"),
  "fake-cheap": fakeWorker("deepseek", "low", false),
};

export interface FeatureSeed { id: string; stage: number; tags?: string[]; dependsOn?: string[]; difficulty?: string; covers?: string[] }

export function config(over: Record<string, any> = {}) {
  return {
    project: { name: "test", appDir: "app", specFiles: { "spec.md": "docs/spec.md" }, acceptanceSection: "10", designDir: "design", decisionsFile: "DECISOES.md", language: "pt-BR", mainBranch: "main" },
    workers: WORKERS,
    roles: {
      initializer: { pool: ["fake-anthropic"] },
      test_writer: { pool: ["fake-anthropic", "fake-openai"] },
      implement: { pool: ["fake-anthropic", "fake-cheap"] },
      implement_hard: { pool: ["fake-anthropic", "fake-openai"] },
      review_code: { pool: ["fake-openai", "fake-google", "fake-anthropic"], rule: "different_family_from_implementer" },
      review_ui: { pool: ["fake-google", "fake-anthropic"], rule: "different_family_from_implementer", requires: "vision" },
      triage: { pool: ["fake-cheap"] },
      approval_parser: { pool: ["fake-cheap"] },
      retro: { pool: ["fake-anthropic"] },
      postmortem: { pool: ["fake-anthropic"] },
    },
    routing: { explorationRate: 0, escalateAfterFailures: 2, maxAttemptsPerFeature: 5, hardTags: [], tournament: { enabled: false, tags: ["statistics"], contenders: 2, judge: "review_code" } },
    loop: { maxParallelTasks: 1, retroEveryNFeatures: 10, stopOnSpecChange: true, maxStageFixRounds: 1 },
    stages: [{ id: 0, name: "Setup" }, { id: 1, name: "Base" }],
    gates: { G7: { name: "protected-tests", builtin: "protected" } },
    browser: { serveCmd: "true", baseUrl: "http://localhost:1", routesFile: "e2e/routes.json", sentinels: ["ZQX_TEST"], lighthouse: { performance: 85, accessibility: 95 } },
    preview: { enabled: false, buildCmd: "true", deployCmd: "true" },
    notify: { webhookEnv: "NOTIFY_WEBHOOK_URL", events: [] },
    ...over,
  };
}

export const SPEC = "# Spec\n\n## 4. Indicadores\n\n### 4.4 Siglas\nTexto 4.4.\n\n## 10. Critérios de aceite\n\n- [ ] Critério A\n- [ ] Critério B\n";

/** `sub`: harness and project are sibling subfolders of one shared repo (monorepo), with another folder next to them. */
export async function makeProject(o: { config?: Record<string, any>; budget?: Record<string, any>; sub?: boolean } = {}) {
  const top = mkdtempSync(join(tmpdir(), "harness-test-"));
  const root = o.sub ? join(top, "harness") : top, repo = o.sub ? join(top, "proj") : top;
  const w = (dir: string, f: string, c: string) => { mkdirSync(join(dir, f, ".."), { recursive: true }); writeFileSync(join(dir, f), c); };
  const cfg = config(o.config);
  if (o.sub) Object.assign(cfg.project, { repo: "../proj" });
  w(root, "harness.config.yaml", stringify(cfg));
  w(root, "budget.yaml", stringify({ currency: "USD", caps: { run: 100, stage: 50, feature: 20, dailyByProvider: {} }, alerts: [0.5, 0.8, 1.0], onSoftLimit: "prefer_cheap", onHardLimit: "pause_and_checkpoint", ...o.budget }));
  w(repo, "docs/spec.md", SPEC);
  w(repo, "design/tokens.json", "{}");
  w(repo, "DECISOES.md", "# Decisões\n");
  w(top, ".gitignore", ".worktrees/\n.harness/runs/**/*.jsonl\n");
  if (o.sub) { w(top, "other/keep.txt", "outro agente\n"); w(repo, ".gitignore", ".harness/\n"); }
  await git(top, "init", "-q", "-b", "main");
  await git(top, "add", "-A");
  await git(top, "commit", "-qm", "init");
  return { root, top, repo, ctx: loadCtx(root) };
}

/** Default script: the initializer writes features.json; test writers write a test per feature. */
export function script(features: FeatureSeed[], over: (run: Parameters<FakeScript>[0], spec: Parameters<FakeScript>[1]) => FakeStep | undefined = () => undefined): FakeScript {
  return (run, spec) => {
    const o = over(run, spec);
    const base = defaults(features, run);
    return o || base ? { ...base, ...o, files: o?.files ?? base?.files } : undefined;
  };
}

function defaults(features: FeatureSeed[], run: Parameters<FakeScript>[0]): FakeStep | undefined {
  return run.role === "initializer" ? {
    files: {
      ".harness/features.json": JSON.stringify({ specHash: "", features: features.map((f) => ({
        title: `Feature ${f.id}`, description: "d", acceptance: ["funciona"], covers: f.covers ?? ["AC-01", "AC-02"], tests: [`app/e2e/${f.id}.spec.ts`], protectedTests: [`app/e2e/${f.id}.spec.ts`], tags: [], dependsOn: [], ...f,
      })) }),
      "app/AGENTS.md": "# Regras\n",
    },
  } : run.role === "test_writer" ? { files: { [`app/e2e/${run.taskId}.spec.ts`]: `test("ok", () => { expect(1).toBe(1); });\n` } } : undefined;
}

export type GateFn = (cwd: string, o: GateOpts, call: number) => boolean | string[];

/** Gates: real G7 (protected) + scripted result (true = pass, string[] = failing gate ids). */
export function deps(gate: GateFn = () => true, over: Partial<Deps> = {}): Deps {
  let calls = 0;
  return {
    async runGates(ctx: Ctx, cwd: string, o: GateOpts): Promise<GateReport> {
      const p = await checkProtected(ctx, cwd, o.featureId);
      const r = gate(cwd, o, ++calls);
      const failed = [...(p.ok ? [] : ["G7"]), ...(r === true ? [] : r === false ? ["G6"] : r)];
      return { ok: !failed.length, mode: o.mode, stage: o.stage, failed, results: [{ id: "G7", name: "protected", ok: p.ok, required: true, durationMs: 0, output: p.output }, ...failed.filter((x) => x !== "G7").map((id) => ({ id, name: id, ok: false, required: true, durationMs: 0, output: `${id} falhou` }))] };
    },
    capture: async () => [],
    deployPreview: async () => ({ url: "https://test--etapa.web.app", note: "ok" }),
    confirm: async () => true,
    rng: () => 0.99,
    ...over,
  };
}

export const orch = (ctx: Ctx, d = deps()) => new Orchestrator(ctx, d);
export { setFakeScript };
export const approveFile = (root: string, stage: number, body: string) => writeFileSync(join(root, "checkpoints", `etapa-${stage}`, "APROVACAO.md"), body);
