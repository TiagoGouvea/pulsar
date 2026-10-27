import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readLedger } from "../src/budget.js";
import { loadFeatures } from "../src/features.js";
import { git, listWorktrees } from "../src/git.js";
import { loadLessons } from "../src/learning.js";
import { readEvents } from "../src/logger.js";
import { hp, loadState, readJsonl } from "../src/state.js";
import { approveFile, deps, makeProject, orch, script, setFakeScript } from "./helpers.js";

afterEach(() => setFakeScript(undefined));

const feature = (ctxRoot: string, id: string) => loadFeatures({ root: ctxRoot } as any).features.find((f) => f.id === id)!;
const implEvents = (ctx: any, id: string) => readEvents(ctx).filter((e) => e.featureId === id && String(e.role).startsWith("implement"));

describe("orquestrador (adapter fake)", () => {
  it("1. fluxo feliz: 3 features em 2 etapas → checkpoint → approve → DONE", async () => {
    const { root, ctx } = await makeProject();
    setFakeScript(script([{ id: "F-0.01", stage: 0 }, { id: "F-1.01", stage: 1 }, { id: "F-1.02", stage: 1, dependsOn: ["F-1.01"] }]));
    const o = orch(ctx);
    expect(await o.start()).toBe("AWAITING_APPROVAL");
    expect(loadState(ctx)!.stage).toBe(0);
    for (const f of ["RELATORIO.md", "COMO-TESTAR.md", "DUVIDAS.md", "RISCOS.md", "APROVACAO.md"]) expect(existsSync(join(root, "checkpoints/etapa-0", f))).toBe(true);
    expect(readFileSync(join(root, "checkpoints/etapa-0/RELATORIO.md"), "utf8")).toContain("https://test--etapa.web.app");
    approveFile(root, 0, "Status: aprovado\n\n## Ajustes\n");
    expect(await o.approve()).toBe("STAGE_RUNNING");   // approve does not start the next stage
    expect(loadState(ctx)!.stage).toBe(1);
    expect(await o.resume()).toBe("AWAITING_APPROVAL");
    approveFile(root, 1, "Status: aprovado\n");
    expect(await o.approve()).toBe("DONE");
    expect(loadFeatures(ctx).features.every((f) => f.status === "passing")).toBe(true);
    expect(await git(root, "branch", "--format=%(refname:short)")).toBe("main");   // never creates branches
    expect(await git(root, "tag")).toBe("");
    expect(existsSync(join(root, "app/src/F-1.02-implement.ts")) || (await git(root, "show", "main:app/AGENTS.md")).length > 0).toBe(true);
    expect(loadState(ctx)!.postmortemDone).toBe(true);
  });

  it("2. falha → triage → retry → escalonamento → sucesso", async () => {
    const { ctx } = await makeProject();
    const prompts: string[] = [];
    setFakeScript(script([{ id: "F-0.01", stage: 0 }], (run) => {
      if (run.role.startsWith("implement")) prompts.push(run.prompt);
      if (run.role === "triage") return { json: { causaRaiz: "teste e2e falhou", categoria: "logic", padrao: false, dica: "DICA_TRIAGE_X" } };
    }));
    await orch(ctx, deps((_c, o, n) => o.mode === "stage" || n > 2)).start();
    const f = feature(ctx.root, "F-0.01");
    expect(f.status).toBe("passing");
    expect(f.history.map((h) => [h.role, h.outcome])).toEqual([["implement", "failure"], ["implement", "failure"], ["implement_hard", "success"]]);
    expect(prompts[1]).toContain("DICA_TRIAGE_X");
  });

  it("3. limite de tentativas → blocked → aparece em DUVIDAS e RISCOS", async () => {
    const { root, ctx } = await makeProject();
    setFakeScript(script([{ id: "F-0.01", stage: 0 }, { id: "F-0.02", stage: 0 }]));
    await orch(ctx, deps((cwd, o) => o.mode === "stage" || !cwd.endsWith("F-0.01"))).start();
    const f = feature(root, "F-0.01");
    expect(f.status).toBe("blocked");
    expect(f.attempts).toBe(5);
    expect(feature(root, "F-0.02").status).toBe("passing");
    expect(readFileSync(join(root, "checkpoints/etapa-0/DUVIDAS.md"), "utf8")).toContain("F-0.01");
    expect(readFileSync(join(root, "checkpoints/etapa-0/RISCOS.md"), "utf8")).toContain("F-0.01");
  });

  it("4. worker edita teste protegido → G7 reprova → tentativa descartada", async () => {
    const { ctx } = await makeProject();
    let n = 0;
    setFakeScript(script([{ id: "F-0.01", stage: 0 }], (run) => {
      if (run.role.startsWith("implement") && ++n === 1) return { files: { "app/e2e/F-0.01.spec.ts": `test("ok", () => {});\n`, "app/src/hack.ts": "x" } };
    }));
    let sawRestored = false;
    await orch(ctx, deps((cwd, o, call) => {
      if (call === 2) sawRestored = readFileSync(join(cwd, "app/e2e/F-0.01.spec.ts"), "utf8").includes("expect(1)") && !existsSync(join(cwd, "app/src/hack.ts"));
      return true;
    })).start();
    const f = feature(ctx.root, "F-0.01");
    expect(f.history[0].outcome).toBe("protected_violation");
    expect(f.history[0].failedGates).toContain("G7");
    expect(f.history[1].outcome).toBe("success");
    expect(sawRestored).toBe(true);
  });

  it("5. avaliador da mesma família nunca é escolhido", async () => {
    const { ctx } = await makeProject({ config: { routing: { explorationRate: 0.5, escalateAfterFailures: 2, maxAttemptsPerFeature: 5, hardTags: [], tournament: { enabled: false, tags: [], contenders: 2, judge: "review_code" } } } });
    setFakeScript(script(Array.from({ length: 6 }, (_, i) => ({ id: `F-0.0${i + 1}`, stage: 0, tags: ["ui"] }))));
    let seed = 7;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    await orch(ctx, deps(() => true, { rng, capture: async () => ["/tmp/shot.png"] })).start();
    const evs = readEvents(ctx);
    const reviews = evs.filter((e) => e.role === "review_code" || e.role === "review_ui");
    expect(reviews.length).toBeGreaterThan(6);
    for (const r of reviews.filter((e) => e.featureId)) {
      const impl = evs.find((e) => e.featureId === r.featureId && String(e.role).startsWith("implement") && e.attempt === r.attempt)!;
      expect(r.family).not.toBe(impl.family);
    }
  });

  it("6a. teto de feature → troca para worker mais barato", async () => {
    const { ctx } = await makeProject({ budget: { caps: { run: 100, stage: 50, feature: 6, dailyByProvider: {} } } });
    mkdirSync(hp(ctx), { recursive: true });
    writeFileSync(hp(ctx, "routing-stats.json"), JSON.stringify({ "fake-cheap|smoke|*": { tentativas: 20, sucessos: 0, custoMedio: 0, duracaoMedia: 0, falhasPorGate: {} } }));
    setFakeScript(script([{ id: "F-0.01", stage: 0 }], (run, spec) => (run.role === "implement" && spec.id === "fake-anthropic" ? { costUsd: 4 } : undefined)));
    await orch(ctx, deps((_c, o, n) => o.mode === "stage" || n > 1)).start();
    const f = feature(ctx.root, "F-0.01");
    expect(f.history.map((h) => h.workerId)).toEqual(["fake-anthropic", "fake-cheap"]);
    expect(f.status).toBe("passing");
  });

  it("6b. teto de etapa → pausa com checkpoint parcial; resume após ajuste", async () => {
    const { root, ctx } = await makeProject({ budget: { caps: { run: 100, stage: 2.5, feature: 20, dailyByProvider: {} } } });
    setFakeScript(script([{ id: "F-0.01", stage: 0 }, { id: "F-0.02", stage: 0 }, { id: "F-0.03", stage: 0 }], () => ({ costUsd: 0.5 })));
    expect(await orch(ctx).start()).toBe("PAUSED_BUDGET");
    expect(existsSync(join(root, "checkpoints/etapa-0-parcial/RELATORIO.md"))).toBe(true);
    expect(readFileSync(join(root, "checkpoints/etapa-0-parcial/RELATORIO.md"), "utf8")).toContain("PARCIAL");
    const ledgerBefore = readLedger(ctx).length;
    ctx.budget.caps.stage = 100;
    expect(await orch(ctx).resume()).toBe("AWAITING_APPROVAL");
    expect(readLedger(ctx).length).toBeGreaterThan(ledgerBefore);
  });

  it("7. crash no meio de uma tarefa → resume sem duplicar e sem worktree órfã", async () => {
    const { root, ctx } = await makeProject();
    let crash = true;
    setFakeScript(script([{ id: "F-0.01", stage: 0 }], (run) => (run.role === "implement" && crash ? ((crash = false), { kind: "crash" }) : undefined)));
    await expect(orch(ctx).start()).rejects.toThrow("fake crash");
    expect(loadState(ctx)!.phase).toBe("CRASHED");
    expect(feature(root, "F-0.01").status).toBe("in_progress");
    expect(await listWorktrees(root)).toContain("F-0.01");
    expect(await orch(ctx).resume()).toBe("AWAITING_APPROVAL");
    const f = feature(root, "F-0.01");
    expect(f.status).toBe("passing");
    expect(f.attempts).toBe(1);
    expect(implEvents(ctx, "F-0.01")).toHaveLength(1);
    expect(await listWorktrees(root)).toEqual(["stage-0"]);
  });

  it("8. mudança no hash da spec → PAUSED_SPEC_CHANGE → approve continua", async () => {
    const { root, ctx } = await makeProject();
    setFakeScript(script([{ id: "F-0.01", stage: 0 }, { id: "F-0.02", stage: 0 }], (run) => {
      if (run.role === "implement" && run.taskId === "F-0.01") writeFileSync(join(root, "docs/spec.md"), readFileSync(join(root, "docs/spec.md"), "utf8") + "\n### 4.5 Nova regra\n");
      return undefined;
    }));
    const o = orch(ctx);
    expect(await o.start()).toBe("PAUSED_SPEC_CHANGE");
    expect(feature(root, "F-0.02").status).toBe("failing");
    expect(readFileSync(join(root, "checkpoints/mudanca-spec.md"), "utf8")).toContain("Nova regra");
    await git(root, "add", "-A");
    expect(await o.approve()).toBe("AWAITING_APPROVAL");
    expect(feature(root, "F-0.02").status).toBe("passing");
  });

  it("9. JSON inválido → retentativa de formatação; persistindo, conta como falha", async () => {
    const { root, ctx } = await makeProject();
    let calls = 0;
    setFakeScript(script([{ id: "F-0.01", stage: 0 }, { id: "F-0.02", stage: 0 }], (run) => {
      if (!run.role.startsWith("implement")) return undefined;
      calls++;
      if (run.taskId === "F-0.01" && run.attempt === 1) return { kind: "invalid_json" };               // also in the format retry
      if (run.taskId === "F-0.02" && !run.prompt.startsWith("Sua resposta anterior")) return { kind: "invalid_json" }; // fixed by retry
    }));
    await orch(ctx).start();
    const f1 = feature(root, "F-0.01"), f2 = feature(root, "F-0.02");
    expect(f1.history.map((h) => h.outcome)).toEqual(["invalid_json", "success"]);
    expect(f2.history.map((h) => h.outcome)).toEqual(["success"]);
    expect(existsSync(hp(ctx, "runs", "F-0.01", "1-implement-" + f1.history[0].workerId + ".format-retry.jsonl"))).toBe(true);
    expect(calls).toBe(5);
  });

  it("10. lições: criação com evidência e injeção filtrada no próximo prompt", async () => {
    const { ctx } = await makeProject();
    const prompts: string[] = [];
    setFakeScript(script([{ id: "F-0.01", stage: 0, tags: ["security-rules"] }], (run) => {
      if (run.role.startsWith("implement")) prompts.push(run.prompt);
      if (run.role === "triage") return { json: { causaRaiz: "rules", categoria: "logic", padrao: true, dica: "Rodar rules tests antes do e2e" } };
    }));
    await orch(ctx, deps((_c, o, n) => o.mode === "stage" || n > 1)).start();
    const [l] = loadLessons(ctx, "project");
    expect(l.rule).toBe("Rodar rules tests antes do e2e");
    expect(l.evidence[0]).toMatch(/^evt-\d+$/);
    expect(l.scope.tags).toEqual(["security-rules"]);
    expect(prompts[0]).not.toContain(l.id);
    expect(prompts[1]).toContain(`[${l.id}] Rodar rules tests antes do e2e`);
    expect(l.hits).toBe(1);
    expect(l.helpedRate).toBe(1);
  });

  it("paralelo: 2 worktrees simultâneas, merges serializados na etapa", async () => {
    const { root, ctx } = await makeProject({ config: { loop: { maxParallelTasks: 2, retroEveryNFeatures: 2, stopOnSpecChange: true, maxStageFixRounds: 1 } } });
    setFakeScript(script(Array.from({ length: 4 }, (_, i) => ({ id: `F-0.0${i + 1}`, stage: 0 }))));
    let active = 0, maxActive = 0;
    const d = deps();
    const gates = d.runGates;
    d.runGates = async (...a) => { active++; maxActive = Math.max(maxActive, active); await new Promise((r) => setTimeout(r, 30)); active--; return gates(...a); };
    expect(await orch(ctx, d).start()).toBe("AWAITING_APPROVAL");
    expect(loadFeatures(ctx).features.every((f) => f.status === "passing")).toBe(true);
    expect(maxActive).toBe(2);
    const log = await git(root, "log", "--oneline", "main");
    for (let i = 1; i <= 4; i++) expect(log).toContain(`feat(F-0.0${i})`);
    expect(readEvents(ctx).filter((e) => e.role === "retro").length).toBeGreaterThanOrEqual(2);
  });

  it("torneio: features críticas rodam 2 candidatos e um juiz de outra família escolhe", async () => {
    const { ctx } = await makeProject({ config: { routing: { explorationRate: 0, escalateAfterFailures: 2, maxAttemptsPerFeature: 5, hardTags: ["statistics"], tournament: { enabled: true, tags: ["statistics"], contenders: 2, judge: "review_code" } } } });
    setFakeScript(script([{ id: "F-0.01", stage: 0, tags: ["statistics"] }], (run, spec) => {
      if (run.role === "implement_hard") return { files: { [`app/src/stats-${spec.id}.ts`]: `export const by = "${spec.id}";\n` } };
      if (run.role === "review_code" && run.prompt.includes("juiz de torneio")) return { json: { winner: 1, reason: "melhor" } };
    }));
    await orch(ctx).start();
    const evs = readEvents(ctx).filter((e) => e.featureId === "F-0.01");
    const contenders = evs.filter((e) => e.role === "implement_hard").map((e) => e.workerId);
    expect(new Set(contenders).size).toBe(2);
    expect(evs.filter((e) => e.tournament === "lost")).toHaveLength(1);
    const judgeEv = evs.find((e) => e.role === "review_code")!;
    expect(["anthropic", "openai"]).not.toContain(judgeEv.family);
    expect(feature(ctx.root, "F-0.01").status).toBe("passing");
    expect(await listWorktrees(ctx.root)).toEqual(["stage-0"]);
  });

  it("repo compartilhado: projeto em subpasta, 1 commit por feature na branch atual, nada fora da pasta", async () => {
    const { top, repo, ctx } = await makeProject({ sub: true });
    await git(top, "checkout", "-q", "-b", "etapa-0");
    writeFileSync(join(top, "other/keep.txt"), "trabalho pendente do outro agente\n");
    setFakeScript(script([{ id: "F-0.01", stage: 0 }, { id: "F-0.02", stage: 0 }]));
    expect(await orch(ctx).start()).toBe("AWAITING_APPROVAL");
    expect(await git(top, "branch", "--show-current")).toBe("etapa-0");
    expect((await git(top, "branch", "--format=%(refname:short)")).split("\n").sort()).toEqual(["etapa-0", "main"]);
    const subjects = await git(top, "log", "--format=%s", "main..etapa-0");
    expect(subjects).toContain("feat(F-0.01)");
    expect(subjects).not.toContain("wip(");
    expect(await git(top, "log", "--name-only", "--format=", "main..etapa-0", "--", ".", ":(exclude)proj", ":(exclude)harness")).toBe("");
    expect(readFileSync(join(top, "other/keep.txt"), "utf8")).toContain("pendente");
    expect(existsSync(join(repo, "app/e2e/F-0.02.spec.ts"))).toBe(true);
  });

  it("12. approve converte respostas do humano em features de ajuste e decisões", async () => {
    const { root, ctx } = await makeProject();
    setFakeScript(script([{ id: "F-0.01", stage: 0 }], (run) => {
      if (run.role === "implement" && run.taskId === "F-0.01") return { files: { ".harness/inbox/questions.jsonl": JSON.stringify({ pergunta: "Virada do dia às 4h?", escolhido: "meia-noite", alternativas: ["4h"], impacto: "baixo" }) + "\n" } };
      if (run.role === "approval_parser") return { json: { aprovado: false, ajustes: [{ titulo: "Botão Registrar maior no celular", descricao: "d", criterios: ["botão ≥ 56px"], tags: ["ui"] }], respostasDuvidas: [{ id: "Q-1", pergunta: "Virada do dia às 4h?", resposta: "usar 4h" }] } };
    }));
    const o = orch(ctx);
    await o.start();
    expect(readFileSync(join(root, "checkpoints/etapa-0/DUVIDAS.md"), "utf8")).toContain("Virada do dia às 4h?");
    approveFile(root, 0, "Status: ajustes\n\n## Ajustes\n- Botão Registrar maior no celular\n");
    expect(await o.approve()).toBe("AWAITING_APPROVAL");
    const adj = feature(root, "F-0.adj-01");
    expect(adj.acceptance).toEqual(["botão ≥ 56px"]);
    expect(adj.status).toBe("passing");
    expect(await git(root, "show", "main:DECISOES.md")).toContain("usar 4h");
    expect(loadLessons(ctx, "project").some((l) => l.rule.includes("usar 4h"))).toBe(true);
    expect(readFileSync(join(root, "checkpoints/etapa-0/DUVIDAS.md"), "utf8")).not.toContain("Virada do dia");
    expect(readJsonl(hp(ctx, "inbox", "questions.jsonl"))[0].featureId).toBe("F-0.01");
  });
});
