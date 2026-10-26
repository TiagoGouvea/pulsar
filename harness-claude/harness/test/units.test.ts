import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { adapters } from "../src/adapters/index.js";
import { parseCodex } from "../src/adapters/codex.js";
import { costOf, stageCap } from "../src/budget.js";
import { NoWorkerError, Runtime } from "../src/invoke.js";
import { parseApprovalFiles } from "../src/checkpoint.js";
import { enabledWorkers } from "../src/config.js";
import { codeRules, uiRules } from "../src/evaluator.js";
import { addLesson, loadLessons, recordLessonOutcome, selectLessons } from "../src/learning.js";
import { acceptanceCriteria, designRefs, extractJson, specSection } from "../src/prompts.js";
import { candidates, loadStats, pick, recordStats } from "../src/router.js";
import { makeProject } from "./helpers.js";

const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe("router", () => {
  it("5b. regra de família e visão excluem candidatos", async () => {
    const { ctx } = await makeProject();
    for (const fam of ["anthropic", "openai", "google"]) {
      expect(candidates(ctx, { role: "review_code", excludeFamilies: [fam] }).map((w) => w.family)).not.toContain(fam);
    }
    expect(candidates(ctx, { role: "review_ui", excludeFamilies: ["google", "anthropic"] }).every((w) => w.vision && !["google", "anthropic"].includes(w.family))).toBe(true);
  });

  it("11. bandit converge para o melhor worker e mantém exploração", async () => {
    const { ctx } = await makeProject({ config: { routing: { explorationRate: 0.1, escalateAfterFailures: 2, maxAttemptsPerFeature: 5, hardTags: [], tournament: { enabled: false, tags: [], contenders: 2, judge: "review_code" } } } });
    ctx.config.roles.implement.pool = ["fake-anthropic", "fake-openai", "fake-google"];
    const pSuccess: Record<string, number> = { "fake-anthropic": 0.2, "fake-openai": 0.9, "fake-google": 0.5 };
    const rng = seeded(42), outcome = seeded(7);
    const picks: string[] = [];
    for (let i = 0; i < 300; i++) {
      const w = pick(ctx, { role: "implement", rng })!;
      picks.push(w.id);
      recordStats(ctx, w.id, "implement", [], { success: outcome() < pSuccess[w.id], costUsd: 0.5, durationMs: 60_000 });
    }
    const last = picks.slice(-100);
    expect(last.filter((p) => p === "fake-openai").length).toBeGreaterThan(80);
    expect(new Set(last).size).toBeGreaterThan(1);   // still exploring
    expect(loadStats(ctx)["fake-openai|implement|*"].tentativas).toBeGreaterThan(200);
  });

  it("concorrência e exclusividade de modelos locais", async () => {
    const { ctx } = await makeProject();
    Object.assign(ctx.config.workers["fake-cheap"], { tier: "local", concurrency: 1 });
    ctx.config.workers["fake-local2"] = { ...ctx.config.workers["fake-cheap"] };
    ctx.config.roles.triage.pool = ["fake-cheap", "fake-local2"];
    expect(candidates(ctx, { role: "triage", busy: new Map([["fake-cheap", 1]]) })).toEqual([]);
    expect(candidates(ctx, { role: "triage", preferCheap: true }).length).toBe(2);
  });
});

describe("invoke: prepare/release (load/unload do LM Studio)", () => {
  it("modelo que não carrega fica indisponível e outro worker é usado; release sempre roda", async () => {
    const { ctx } = await makeProject();
    const calls: string[] = [];
    Object.assign(adapters.fake, {
      prepare: async (w: { id: string }) => (calls.push(`prepare:${w.id}`), w.id === "fake-cheap" ? "insufficient system resources" : null),
      release: async (w: { id: string }) => { calls.push(`release:${w.id}`); },
    });
    try {
      const rt = new Runtime(ctx);
      const r = await rt.invoke({ role: "triage", taskId: "t", stage: 0, attempt: 1, cwd: ctx.root, prompt: "oi" }).catch((e) => e);
      expect(r).toBeInstanceOf(NoWorkerError);   // triage pool is only fake-cheap
      expect(rt.unavailable.has("fake-cheap")).toBe(true);
      ctx.config.roles.triage.pool = ["fake-cheap", "fake-google"];
      const ok = await rt.invoke({ role: "triage", taskId: "t", stage: 0, attempt: 1, cwd: ctx.root, prompt: "oi" });
      expect(ok.worker.id).toBe("fake-google");
      expect(calls).toEqual(["prepare:fake-cheap", "prepare:fake-google", "release:fake-google"]);
    } finally {
      delete (adapters.fake as any).prepare;
      delete (adapters.fake as any).release;
    }
  });
});

describe("lições", () => {
  it("10b. sem evidência é rejeitada; filtro por papel/tag; aposentadoria e promoção", async () => {
    const { ctx } = await makeProject();
    expect(addLesson(ctx, { rule: "sem evidência", evidence: [] })).toBeNull();
    const a = addLesson(ctx, { scope: { roles: ["implement"], tags: ["security-rules"] }, rule: "Rodar rules tests primeiro", evidence: ["evt-1"] })!;
    const b = addLesson(ctx, { scope: { roles: ["review_code"], tags: [] }, rule: "Checar hardcode", evidence: ["evt-2"] })!;
    expect(addLesson(ctx, { rule: "rodar RULES tests primeiro!", evidence: ["evt-3"] })).toBeNull();   // duplicate
    expect(selectLessons(ctx, "implement_hard", ["security-rules"]).map((l) => l.id)).toEqual([a.id]);
    expect(selectLessons(ctx, "implement", ["ui"])).toEqual([]);
    for (let i = 0; i < 8; i++) recordLessonOutcome(ctx, [a.id], false);
    for (let i = 0; i < 5; i++) recordLessonOutcome(ctx, [b.id], true);
    const ls = loadLessons(ctx, "project");
    expect(ls.find((l) => l.id === a.id)!.status).toBe("retired");
    expect(ls.find((l) => l.id === b.id)!.status).toBe("promoted");
  });
});

describe("utilitários", () => {
  it("extractJson pega o último bloco JSON válido", () => {
    expect(extractJson('texto\n```json\n{"a":1}\n```\nmais\n```json\n{"b":2}\n```')).toEqual({ b: 2 });
    expect(extractJson('fim: {"pass": true, "score": 8, "issues": []}')).toEqual({ pass: true, score: 8, issues: [] });
    expect(extractJson("nada aqui")).toBeUndefined();
  });

  it("design: mockups em subpastas, DESIGN.md como tokens quando não há tokens.json", async () => {
    const { ctx } = await makeProject();
    rmSync(join(ctx.repo, "design/tokens.json"));
    for (const f of ["design/ds/DESIGN.md", "design/home/screen.png", "design/home/code.html", "design/.DS_Store"]) {
      mkdirSync(join(ctx.repo, f, ".."), { recursive: true });
      writeFileSync(join(ctx.repo, f), "x");
    }
    expect(designRefs(ctx)).toEqual({ screens: ["design/home/screen.png"], html: ["design/home/code.html"], tokens: "design/ds/DESIGN.md" });
  });

  it("teto por etapa usa byStage e cai no padrão", async () => {
    const { ctx } = await makeProject({ budget: { caps: { run: 60, stage: 5, byStage: { "3": 12 }, feature: 3, dailyByProvider: {} } } });
    expect(stageCap(ctx, 3)).toBe(12);
    expect(stageCap(ctx, 4)).toBe(5);
  });

  it("trechos da spec e critérios de aceite numerados", async () => {
    const { ctx } = await makeProject();
    expect(specSection(ctx, "spec.md#4.4")).toContain("Texto 4.4");
    expect(acceptanceCriteria(ctx).map((a) => a.id)).toEqual(["AC-01", "AC-02"]);
  });

  it("parser determinístico da aprovação", () => {
    const a = parseApprovalFiles("Status: ajustes\n\n## Ajustes\n\n- Botão maior\n- Cor do card\n", "### Q-2\n**Pergunta:** Virada?\n**Escolhido:** 0h\nResposta: 4h\n\n### Q-3\n**Pergunta:** Outra?\nResposta: \n");
    expect(a).toEqual({ aprovado: false, ajustes: ["Botão maior", "Cor do card"], respostasDuvidas: [{ id: "Q-2", pergunta: "Virada?", resposta: "4h" }] });
    expect(parseApprovalFiles("Status: (aprovado / ajustes)\n## Ajustes\n- \n", "").aprovado).toBe(false);
    expect(parseApprovalFiles("Status: aprovado\n", "").aprovado).toBe(true);
    const d = "### Q-1\n**Pergunta:** Dias?\nA) 5 dias (padrão)\nB) 3 dias\nResposta: b, mas só no celular\n\n### Q-10\n**Pergunta:** Cor?\nA) azul (padrão)\nB) verde\nResposta: Bege\n";
    expect(parseApprovalFiles("Status: aprovado\n", d).respostasDuvidas.map((r) => r.resposta)).toEqual(["3 dias — mas só no celular", "Bege"]);
  });

  it("regras de aprovação dos avaliadores", () => {
    expect(codeRules({ pass: true, score: 8, issues: [] })).toBe(true);
    expect(codeRules({ pass: true, score: 9, issues: [{ severidade: "blocker", arquivo: "", descricao: "x", sugestao: "" }] })).toBe(false);
    expect(codeRules({ pass: true, score: 6.9, issues: [] })).toBe(false);
    expect(uiRules({ pass: true, score: 8, porCriterio: { c1: 9, c2: 5 }, issues: [] })).toBe(false);
    expect(uiRules({ pass: true, score: 7.4, porCriterio: {}, issues: [] })).toBe(false);
  });

  it("custo: CLI > prices.yaml; assinatura e local custam 0", async () => {
    const { ctx } = await makeProject();
    const [w] = enabledWorkers(ctx);
    ctx.prices[w.id] = { input: 3, output: 15 };
    expect(costOf(ctx, w, { inputTokens: 1e6, outputTokens: 1e5, costUsd: 0.42 })).toBe(0.42);
    expect(costOf(ctx, w, { inputTokens: 1e6, outputTokens: 1e5 })).toBeCloseTo(4.5);
    expect(costOf(ctx, { ...w, billing: "subscription" }, { inputTokens: 1e6, outputTokens: 1e6 })).toBe(0);
  });

  it("codex: input_tokens já inclui cached_input_tokens (não cobra o cache duas vezes)", () => {
    const out = JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1000, cached_input_tokens: 800, output_tokens: 50 } });
    expect(parseCodex(out).usage).toEqual({ inputTokens: 200, outputTokens: 50, cachedTokens: 800 });
  });
});
