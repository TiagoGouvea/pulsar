import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { execa } from "execa";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { z } from "zod";
import { FatalError, type WorkerSpec } from "./adapters/types.js";
import { raiseCap, spent, stageCap, usageRatio } from "./budget.js";
import {
  addQuestion, addRisk, ApprovalSchema, type Approval, buildCheckpoint, checkpointDir, computeHash, deployPreview,
  freezeSpec, markAnswered, parseApprovalFiles, resolveAnswer, storedHash, writeSpecChange,
} from "./checkpoint.js";
import { type Ctx, remoteTwin } from "./config.js";
import { formatIssues, judge, reviewCode, reviewFeatures, reviewUi, TriageSchema, type Verdict } from "./evaluator.js";
import {
  type Feature, FeaturesFileSchema, loadFeatures, nextFeature, resetInProgress, saveFeatures, stageFeatures, stageSettled,
  uncovered, updateFeature,
} from "./features.js";
import { captureScreens } from "./gates/visual.js";
import { registerProtected, TEST_FILE } from "./gates/protected.js";
import { type GateReport, runGates as realRunGates, type RunGates } from "./gates/run-gates.js";
import * as g from "./git.js";
import { BudgetError, type InvokeRes, NoWorkerError, QuotaError, Runtime } from "./invoke.js";
import { addLesson, applyRetro, PostmortemSchema, promotedLessons, recordLessonOutcome, RetroSchema, selectLessons } from "./learning.js";
import { fmtDur, log, logEvent, readEvents } from "./logger.js";
import { notify } from "./notify.js";
import { acceptanceCriteria, featureVars, render } from "./prompts.js";
import { pick, recordStats } from "./router.js";
import { appendJsonl, hp, loadState, mutex, newState, type Phase, readJsonl, saveState, type State, writeJson } from "./state.js";

export interface Deps {
  runGates: RunGates;
  capture: (ctx: Ctx, appAbs: string, outDir: string, filter?: (r: { tags?: string[] }) => boolean) => Promise<string[]>;
  deployPreview: typeof deployPreview;
  confirm: (summary: string) => Promise<boolean>;
  doctor?: (ctx: Ctx) => Promise<boolean>;
  /** Interactive question in the terminal (only when stdin is a TTY). */
  ask?: (question: string) => Promise<string>;
  rng?: () => number;
}

const WorkerFinal = z.object({ summary: z.string() }).passthrough();
const InitFinal = z.object({ summary: z.string() }).passthrough();
const PAUSE_FILE = (ctx: Ctx) => hp(ctx, "PAUSE");

export const defaultDeps = (): Deps => ({
  runGates: realRunGates,
  capture: (ctx, appAbs, out, filter) => captureScreens(ctx, appAbs, out, filter).catch((e) => (log(`screenshots indisponíveis: ${e.message}`), [])),
  deployPreview,
  async confirm(summary) {
    console.log(summary);
    return /^y(es)?|^s(im)?/i.test((await question("Confirmar? (y/n) ")).trim());
  },
  ask: process.stdin.isTTY ? question : undefined,
});

async function question(q: string) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try { return await rl.question(q); } finally { rl.close(); }
}

/** tsc errors expected in acceptance tests written before the code: missing module, export or member, and implicit any from them. */
const TDD_TS_ERRORS = /error TS(2307|2305|2724|2614|2339|2551|7006|7031):/;

export class Orchestrator {
  rt: Runtime;
  state!: State;
  private merge = mutex();   // serializes landings on the current branch
  private branch = "";       // branch checked out in the repo; the human creates/switches it, the harness only commits on it
  private fatal?: unknown;
  private lastTick = Date.now();

  constructor(public ctx: Ctx, public deps: Deps = defaultDeps()) {
    this.rt = new Runtime(ctx, { rng: deps.rng, onSpend: (s) => this.onSpend(s) });
  }

  // ---------- commands ----------

  async start() {
    const s = loadState(this.ctx);
    if (s && s.phase !== "INIT") throw new Error(`execução já iniciada (fase ${s.phase}); use \`harness resume\``);
    this.state = s ?? newState();
    this.save();
    return this.run();
  }

  async resume() {
    const s = loadState(this.ctx);
    if (!s) throw new Error("nenhuma execução encontrada; use `harness start`");
    this.state = s;
    rmSync(PAUSE_FILE(this.ctx), { force: true });
    if (["CRASHED", "PAUSED_MANUAL", "PAUSED_BUDGET", "PAUSED_QUOTA"].includes(s.phase)) this.set(s.pausedFrom ?? "STAGE_RUNNING");
    return this.run();
  }

  /** Terminal closed / Ctrl+C: recorded like a crash; `resume` picks up from the saved state. */
  interrupted(signal: string) {
    if (!this.state) return;
    appendJsonl(hp(this.ctx, "crashes.jsonl"), { ts: new Date().toISOString(), phase: this.state.phase, stage: this.state.stage, error: `interrompido por ${signal}` });
    this.progress(`✖ interrompido por ${signal} em ${this.state.phase}: rode harness resume para continuar`);
    this.save();
  }

  pause() {
    writeFileSync(PAUSE_FILE(this.ctx), new Date().toISOString());
    return "pausa solicitada: o harness para após as tarefas em andamento";
  }

  /** Main loop. Ends (process exits) at AWAITING_APPROVAL, DONE or any PAUSED_* state. */
  async run(): Promise<Phase> {
    await this.useBranch();
    try {
      await this.recover();
      for (;;) {
        const p = this.state.phase;
        if (["INIT", "STAGE_RUNNING", "STAGE_GATES"].includes(p) && this.specChanged()) {
          await this.pauseFor("PAUSED_SPEC_CHANGE");
          await writeSpecChange(this.ctx);
          await notify(this.ctx, "blocked", "mudança na spec/design detectada: veja checkpoints/mudanca-spec.md");
          continue;
        }
        if (p === "INIT") await this.init();
        else if (p === "STAGE_RUNNING") await this.runStage();
        else if (p === "STAGE_GATES") await this.stageEnd();
        else if (p === "CHECKPOINT_READY") await this.publishCheckpoint();
        else if (p === "DONE" && !this.state.postmortemDone) await this.postmortem();
        else return p;
      }
    } catch (e) {
      if (e instanceof BudgetError) {
        if (await this.askRaise(e)) return this.run();
        await this.pauseFor("PAUSED_BUDGET");
        buildCheckpoint(this.ctx, { stage: this.state.stage, partialReason: e.message });
        await notify(this.ctx, "budget_100", `${e.message}: harness pausado, checkpoint parcial gerado`);
        return this.state.phase;
      }
      if (e instanceof QuotaError) {
        await this.pauseFor("PAUSED_QUOTA");
        await notify(this.ctx, "blocked", `${e.message}: recarregue o crédito (ou desabilite o worker) e rode harness resume`);
        return this.state.phase;
      }
      this.state.lastError = String((e as Error)?.stack ?? e);
      appendJsonl(hp(this.ctx, "crashes.jsonl"), { ts: new Date().toISOString(), phase: this.state.phase, stage: this.state.stage, error: String((e as Error)?.message ?? e), stack: this.state.lastError });
      this.progress(`✖ CRASH em ${this.state.phase}: ${(e as Error)?.message ?? e}`);
      await this.pauseFor("CRASHED");
      await notify(this.ctx, "crash", `orquestrador caiu: ${(e as Error)?.message ?? e}`);
      throw e;
    }
  }

  // ---------- state helpers ----------

  private save() {
    const t = (this.state.stageTimes[this.state.stage] ??= { startedAt: new Date().toISOString(), activeMs: 0 });
    t.activeMs += Date.now() - this.lastTick;
    this.lastTick = Date.now();
    saveState(this.ctx, this.state);
  }

  /** Budget cap hit in an interactive terminal: ask how much to raise it instead of pausing. */
  private async askRaise(e: BudgetError) {
    if (!this.deps.ask || (e.cap !== "stage" && e.cap !== "run")) return false;
    const s = this.state.stage, cap = e.cap === "stage" ? stageCap(this.ctx, s) : this.ctx.budget.caps.run;
    const used = spent(this.ctx, e.cap === "stage" ? { stage: s } : {});
    const a = (await this.deps.ask(`⏸ Teto ${e.cap === "stage" ? `da etapa ${s}` : "da execução"} atingido (US$ ${used.toFixed(2)} de ${cap}). Aumentar em quantos US$ e continuar? [Enter = pausar] `)).trim().replace(",", ".");
    const by = Number(a);
    if (!a || !(by > 0)) return false;
    raiseCap(this.ctx, e.cap, s, by);
    this.state.budgetAlerts = [];
    this.progress(`teto ${e.cap === "stage" ? `da etapa ${s}` : "da execução"} aumentado para US$ ${cap + by} (budget.yaml)`);
    return true;
  }
  private set(phase: Phase) { this.state.phase = phase; this.save(); }
  private async pauseFor(phase: Phase) {
    if (!this.state.phase.startsWith("PAUSED") && this.state.phase !== "CRASHED") this.state.pausedFrom = this.state.phase;
    this.set(phase);
  }
  private specChanged = () => this.ctx.config.loop.stopOnSpecChange && !!storedHash(this.ctx) && storedHash(this.ctx) !== computeHash(this.ctx);
  private appAbs = (wt: string) => join(wt, this.ctx.config.project.appDir);

  private async useBranch() {
    this.branch = await g.currentBranch(this.ctx.repo);
    if (!this.branch) throw new Error("o repo do projeto está em detached HEAD: faça checkout da branch da etapa (o harness nunca cria nem troca branch)");
  }

  /** Detached worktree for stage-level work, always at the tip of the current branch. */
  private async stageWt(s = this.state.stage) {
    const wt = await g.addWorktree(this.ctx.repo, `stage-${s}`, this.branch);
    await g.resetHard(wt, this.branch);
    return wt;
  }

  /** Commits the worktree and lands it as one commit on the current branch. */
  private async commitToBranch(wt: string, msg: string) {
    await g.commitAll(wt, msg);
    const r = await this.merge(() => g.land(this.ctx.repo, wt, this.branch, msg));
    if (!r.ok) throw new Error(`conflito ao levar "${msg}" para ${this.branch}: ${r.conflict}`);
  }

  /** Crash recovery: in_progress -> failing, orphan worktrees removed (attempts are only counted when finished). */
  private async recover() {
    const reset = resetInProgress(this.ctx);
    // init keeps its partial scaffold; unfinished and blocked features keep their code and continue from it
    const pending = new Set(loadFeatures(this.ctx).features.filter((f) => f.status === "failing" || f.status === "blocked").map((f) => f.id));
    const removed = await g.pruneOrphans(this.ctx.repo, (n) => n === "init" || n.startsWith("stage-") || pending.has(n));
    if (reset.length || removed.length) log(`retomada: features reiniciadas [${reset}] worktrees removidas [${removed}]`);
  }

  private async onSpend(stage: number) {
    const ratio = usageRatio(this.ctx, stage);
    for (const t of this.ctx.budget.alerts.filter((a) => ratio >= a && !this.state.budgetAlerts.includes(a))) {
      this.state.budgetAlerts.push(t);
      this.save();
      await notify(this.ctx, t >= 1 ? "budget_100" : t >= 0.8 ? "budget_80" : "budget_50", `orçamento em ${Math.round(ratio * 100)}%${t >= 0.8 ? " (prefer_cheap ativo)" : ""}`);
    }
  }

  /** Worker-written inbox rows inside a worktree are moved to the root inbox. */
  private harvestInbox(wt: string, featureId?: string) {
    for (const kind of ["questions", "risks"]) {
      const f = join(wt, ".harness", "inbox", `${kind}.jsonl`);
      const rows = readJsonl(f);
      if (!rows.length) continue;
      for (const r of rows) (kind === "questions" ? addQuestion : addRisk)(this.ctx, { featureId, ...r });
      writeFileSync(f, "");
    }
  }
  private clearInbox(wt: string) {
    mkdirSync(join(wt, ".harness", "inbox"), { recursive: true });
    for (const k of ["questions", "risks"]) writeFileSync(join(wt, ".harness", "inbox", `${k}.jsonl`), "");
  }

  /** Milestone: terminal line + .harness/progress.md. */
  private progress(line: string) {
    log(line);
    appendFileSync(hp(this.ctx, "progress.md"), `- ${new Date().toISOString().slice(0, 16)} ${line}\n`);
  }

  private stageCount(s = this.state.stage) {
    const fs = stageFeatures(loadFeatures(this.ctx), s);
    return `features ${fs.filter((f) => f.status === "passing").length}/${fs.length}`;
  }

  // ---------- INIT ----------

  private async init() {
    const ctx = this.ctx;
    if (this.deps.doctor && !(await this.deps.doctor(ctx))) throw new Error("harness doctor falhou: corrija os itens críticos antes do start");
    const wt = await g.addWorktree(ctx.repo, "init", this.branch);
    if (!loadFeatures(ctx).features.length) await this.decompose(wt);   // already saved: a crash hit the commit below
    await this.commitToBranch(wt, "chore(init): scaffold do app, design system e decisões");
    await g.removeWorktree(ctx.repo, "init");
    this.progress(`INIT concluído: ${loadFeatures(ctx).features.length} features`);
    this.state.stage = this.firstStageFrom(0) ?? 0;
    this.set("STAGE_RUNNING");
  }

  /** Initializer rounds (scaffold + features.json) reviewed by another family; saves features.json. */
  private async decompose(wt: string) {
    const ctx = this.ctx;
    freezeSpec(ctx);
    this.clearInbox(wt);
    const ac = acceptanceCriteria(ctx);
    const acText = ac.map((a) => `${a.id}: ${a.text}`).join("\n");
    const vars = { acceptance: acText, stages: ctx.config.stages.map((s) => `${s.id}. ${s.name}${s.optional ? " (só se DECISOES.md incluir no escopo)" : ""}`).join("\n"), routesFile: ctx.config.browser.routesFile, sentinels: ctx.config.browser.sentinels.join(", ") };
    let feedback = "";
    let file: z.infer<typeof FeaturesFileSchema> | undefined;
    const qFile = hp(ctx, "inbox", "questions.jsonl"), q0 = readJsonl(qFile);
    for (let round = 1; round <= 3; round++) {
      const res = await this.rt.invoke({ role: "initializer", taskId: "init", stage: 0, attempt: round, cwd: wt, prompt: render(ctx, "initializer", { ...vars, feedback: feedback || "(primeira rodada)" }), schema: InitFinal });
      if (readJsonl(join(wt, ".harness", "inbox", "questions.jsonl")).length) writeFileSync(qFile, q0.map((q) => JSON.stringify(q) + "\n").join(""));   // each round re-asks: keep only the latest
      this.harvestInbox(wt);
      if (res.outcome !== "success") { feedback = `A rodada anterior terminou com ${res.outcome}.`; continue; }
      const parsed = FeaturesFileSchema.safeParse(existsSync(join(wt, ".harness", "features.json")) ? JSON.parse(readFileSync(join(wt, ".harness", "features.json"), "utf8")) : {});
      if (!parsed.success) { feedback = `.harness/features.json inválido:\n${z.prettifyError(parsed.error)}`; continue; }
      file = parsed.data;
      const missing = uncovered(file, ac.map((a) => a.id));
      const v = await reviewFeatures({ ctx, rt: this.rt, f: { id: "init", stage: 0, tags: [] }, cwd: wt, attempt: round, implementerFamily: res.worker.family, featuresJson: JSON.stringify(file, null, 2), acceptance: acText });
      if (v.pass && !missing.length) break;
      feedback = [missing.length ? `Critérios de aceite sem feature (campo covers): ${missing.join(", ")}` : "", formatIssues([v])].filter(Boolean).join("\n\n");
      if (round === 3) addRisk(ctx, { featureId: "init", risco: `features.json aprovado com ressalvas: ${feedback.slice(0, 500)}`, probabilidade: "média", impacto: "médio", sugestao: "revisar a decomposição no checkpoint da etapa 0" });
    }
    if (!file) throw new Error(`inicializador não produziu features.json válido: ${feedback}`);
    for (const f of file.features) Object.assign(f, { status: "failing", attempts: 0, history: [], costUsd: 0 });
    file.specHash = storedHash(ctx);
    saveFeatures(ctx, file);
  }

  private firstStageFrom(min: number) {
    const all = loadFeatures(this.ctx);
    return this.ctx.config.stages.map((s) => s.id).find((id) => id >= min && stageFeatures(all, id).length > 0);
  }

  // ---------- stage loop ----------

  private async runStage() {
    const s = this.state.stage;
    if (!stageFeatures(loadFeatures(this.ctx), s).length) {
      const next = this.firstStageFrom(s + 1);
      if (next === undefined) return this.set("DONE");
      this.state.stage = next;
      return this.save();
    }
    await this.stageWt(s);
    const fs = stageFeatures(loadFeatures(this.ctx), s);
    this.progress(`▶ etapa ${s} (${this.ctx.config.stages.find((x) => x.id === s)?.name ?? "?"}) │ ${this.stageCount()} │ ${fs.filter((f) => f.status === "blocked").length} bloqueadas │ US$ ${spent(this.ctx, { stage: s }).toFixed(2)}/${stageCap(this.ctx, s)} │ branch ${this.branch}`);
    const running = new Map<string, Promise<void>>();
    this.fatal = undefined;
    for (;;) {
      while (running.size < this.ctx.config.loop.maxParallelTasks && !this.fatal && !existsSync(PAUSE_FILE(this.ctx)) && !this.specChanged()) {
        const f = nextFeature(loadFeatures(this.ctx), s, new Set(running.keys()));
        if (!f) break;
        updateFeature(this.ctx, f.id, (x) => { x.status = "in_progress"; });
        running.set(f.id, this.runFeature(f).catch((e) => { this.fatal ??= e; }).finally(() => running.delete(f.id)));
      }
      if (!running.size) break;
      await Promise.race(running.values());
      if (!this.fatal && this.state.featuresSinceRetro >= this.ctx.config.loop.retroEveryNFeatures) await this.retro("periodic");
    }
    if (this.fatal) throw this.fatal;
    if (existsSync(PAUSE_FILE(this.ctx))) {
      rmSync(PAUSE_FILE(this.ctx), { force: true });
      return this.pauseFor("PAUSED_MANUAL");
    }
    // features waiting on a blocked one: stage gates and checkpoint would be premature, a human decides
    const now = stageFeatures(loadFeatures(this.ctx), s), blocked = now.filter((f) => f.status === "blocked").map((f) => f.id);
    const waiting = now.filter((f) => f.status === "failing").map((f) => f.id);
    if (blocked.length && waiting.length) {
      this.progress(`⏸ ${waiting.length} feature(s) esperando bloqueadas (${blocked.join(", ")}): ajuste e rode harness resume`);
      await notify(this.ctx, "blocked", `etapa ${s} pausada: ${waiting.join(", ")} dependem de ${blocked.join(", ")}`);
      return this.pauseFor("PAUSED_MANUAL");
    }
    if (!this.specChanged() && stageSettled(loadFeatures(this.ctx), s)) this.set("STAGE_GATES");
  }

  private roleFor(f: Feature) {
    const r = this.ctx.config.routing;
    const hard = f.difficulty === "hard" || f.tags.some((t) => r.hardTags.includes(t)) || f.attempts >= r.escalateAfterFailures;
    return hard ? "implement_hard" : f.difficulty === "easy" && this.ctx.config.roles.implement_easy ? "implement_easy" : "implement";
  }

  /** The worktree stays: once unblocked (status back to failing) the feature continues from its last attempt. */
  private async block(f: Feature, reason: string) {
    updateFeature(this.ctx, f.id, (x) => { x.status = "blocked"; x.blockedReason = reason; });
    addQuestion(this.ctx, { featureId: f.id, pergunta: `A feature ${f.id} (${f.title}) foi bloqueada: ${reason}. Como devemos seguir?`, escolhido: "seguir com as demais features", alternativas: ["ajustar a spec/critérios", "simplificar a feature", "aceitar sem ela nesta etapa"], impacto: "a feature não está no preview" });
    addRisk(this.ctx, { featureId: f.id, risco: `feature bloqueada: ${reason}`, probabilidade: "alta", impacto: "médio", sugestao: "responder em DUVIDAS.md ou pedir ajuste" });
    this.progress(`⛔ ${f.id} BLOQUEADA: ${reason} │ ${this.stageCount(f.stage)}`);
    await notify(this.ctx, "blocked", `${f.id} bloqueada: ${reason}`);
  }

  private async runFeature(f0: Feature) {
    const ctx = this.ctx;
    const wt = await g.addWorktree(ctx.repo, f0.id, this.branch);
    try {
      await this.featureLoop(f0, wt);
    } catch (e) {
      if (e instanceof BudgetError && e.cap === "feature") return this.block(f0, "teto de custo da feature atingido");
      if (e instanceof NoWorkerError) return this.block(f0, e.message);
      throw e;
    }
  }

  private async ensureAcceptanceTests(f: Feature, wt: string) {
    if (f.protectedTests.length && f.protectedTests.every((p) => existsSync(join(wt, p)))) return f;
    let retry = "";
    for (let i = 1; i <= 2; i++) {
      this.clearInbox(wt);
      const r = await this.rt.invoke({ role: "test_writer", taskId: f.id, featureId: f.id, stage: f.stage, attempt: 0, cwd: wt, prompt: render(this.ctx, "test_writer", featureVars(this.ctx, f), f.tags) + retry, schema: WorkerFinal, tags: f.tags });
      this.harvestInbox(wt, f.id);
      const base = await g.head(wt);
      if (r.outcome !== "success" || !(await g.commitAll(wt, `test(${f.id}): testes de aceite`))) { await g.resetHard(wt, base); continue; }
      // protected tests are hashed as they will stay: formatted now (a later autofix broke G7) and free of type errors
      // implementers can't fix. Tests come before the code, so missing modules/members (TDD) are expected.
      // fresh worktree: dependencies are only installed by G1, and autofix/typecheck need them
      await execa("yarn install --frozen-lockfile --prefer-offline --silent", { shell: true, cwd: this.appAbs(wt), reject: false, timeout: 600_000 });
      await this.tidy(wt, f.id);
      const tc = this.ctx.config.gates.G3?.cmd;
      const typed = tc ? await execa(tc, { shell: true, cwd: this.appAbs(wt), reject: false, all: true, timeout: 300_000 }) : undefined;
      const out = String(typed?.all ?? "");
      const errs = out.split("\n").filter((l) => /error TS\d+:/.test(l));
      const bad = typed?.exitCode && !errs.length ? [out.slice(-2500)] : errs.filter((l) => !TDD_TS_ERRORS.test(l));
      if (bad.length) {
        log(`↻ ${f.id} test_writer ${r.worker.id}: testes com erro de tipo que o implementador não pode corrigir, nova tentativa`);
        writeFileSync(hp(this.ctx, "runs", f.id, `test-typecheck-${i}.log`), out);
        retry = `\n\n## Tentativa anterior rejeitada\nSeus testes têm erros em \`${tc}\` que não vêm de código ainda não implementado, e foram descartados. Corrija os tipos (dados inválidos de propósito: use cast explícito, ex. \`as never\`). Um crash interno do tsc ("reading 'kind'") costuma vir de uniões de tipos passadas a APIs do Firestore.\n\`\`\`\n${bad.join("\n").slice(-2500)}\n\`\`\``;
        await g.resetHard(wt, base);
        continue;
      }
      const written = (await g.changedFiles(wt, base)).filter((p) => TEST_FILE.test(p));
      const declared = f.protectedTests.length ? f.protectedTests : f.tests;
      const prot = declared.filter((p) => existsSync(join(wt, p)));
      const protectedTests = prot.length ? prot : written;
      if (!protectedTests.length) continue;
      registerProtected(this.ctx, wt, f.id, protectedTests);
      return updateFeature(this.ctx, f.id, (x) => { x.protectedTests = protectedTests; x.tests = [...new Set([...x.tests, ...written])]; });
    }
    throw new NoWorkerError("test_writer não produziu testes de aceite");
  }

  private async featureLoop(f0: Feature, wt: string) {
    const ctx = this.ctx;
    const cfg = ctx.config.routing;
    let f = await this.ensureAcceptanceTests(f0, wt);
    const testsBase = await g.head(wt);
    const last = f0.history.at(-1);
    let diag = last ? `Retomada após interrupção: continue a partir do código já presente. Tentativa anterior: ${last.outcome}${last.failedGates?.length ? ` (gates ${last.failedGates.join(",")})` : ""}.${last.note ? `\n${last.note}` : ""}` : "";
    for (;;) {
      f = loadFeatures(ctx).features.find((x) => x.id === f0.id)!;
      if (f.attempts >= cfg.maxAttemptsPerFeature) return this.block(f, `limite de ${cfg.maxAttemptsPerFeature} tentativas atingido`);
      const attempt = f.attempts + 1;
      const role = this.roleFor(f);
      const integ = await g.integrate(wt, this.branch);
      const attemptBase = await g.head(wt);
      if (!integ.ok) diag = `Há conflitos de merge com a branch ${this.branch} nos arquivos:\n${integ.conflict}\nResolva os marcadores <<<<<<< mantendo as duas funcionalidades.\n\n${diag}`;
      const lessonIds = selectLessons(ctx, role, f.tags).map((l) => l.id);
      const prompt = render(ctx, role, featureVars(ctx, f, { diagnostic: diag || "(primeira tentativa)", attempt: String(attempt) }), f.tags);
      this.clearInbox(wt);
      const useTournament = attempt === 1 && cfg.tournament.enabled && f.tags.some((t) => cfg.tournament.tags.includes(t));
      // last attempt failed on a local model: same model served remotely (unless escalated to implement_hard)
      const prev = f.history.at(-1);
      const twin = prev && prev.outcome !== "success" && role !== "implement_hard" ? remoteTwin(ctx, prev.workerId) : undefined;
      if (twin) log(`↻ ${f.id} ${prev!.workerId} (local) ✖ ${prev!.outcome}: tentativa ${attempt} com o mesmo modelo remoto (${twin})`);
      const res = useTournament ? await this.tournament(f, wt, prompt, testsBase) : await this.rt.invoke({ role, taskId: f.id, featureId: f.id, stage: f.stage, attempt, cwd: wt, prompt, schema: WorkerFinal, tags: f.tags, deferEvent: true, workerId: twin });
      this.harvestInbox(wt, f.id);
      await g.commitAll(wt, `wip(${f.id}): tentativa ${attempt} (${res.worker.id})`);

      let outcome: "success" | "failure" | "timeout" | "invalid_json" | "protected_violation" | "review_rejected" = res.outcome;
      let gates: GateReport | undefined;
      const verdicts: Verdict[] = [];
      if (res.outcome !== "success") {
        diag = `A tentativa anterior terminou com "${res.outcome}". Final da resposta:\n${res.result.finalText.slice(-1500)}`;
      } else {
        await this.tidy(wt, f.id);
        gates = await this.deps.runGates(ctx, wt, { stage: f.stage, mode: "feature", base: this.branch, featureId: f.id });
        writeJson(hp(ctx, "runs", f.id, `gate-report-${attempt}.json`), gates);
        if (gates.failed.includes("G7")) {
          outcome = "protected_violation";
          await g.resetHard(wt, attemptBase);   // only this attempt: earlier attempts' code stays
          diag = `TENTATIVA DESCARTADA: você alterou/enfraqueceu testes protegidos. Não edite: ${f.protectedTests.join(", ")}\n${gates.results.find((r) => r.id === "G7")?.output}`;
        } else if (!gates.ok) {
          outcome = "failure";
          diag = await this.triage(f, gates, res, attempt, wt);
        } else {
          verdicts.push(await reviewCode({ ctx, rt: this.rt, f, feature: f, cwd: wt, attempt, implementerFamily: res.worker.family, diff: await g.diff(wt, this.branch), gates }));
          if (verdicts[0].pass && f.tags.includes("ui")) {
            const shots = await this.deps.capture(ctx, this.appAbs(wt), hp(ctx, "runs", f.id, `screens-${attempt}`), (r) => !r.tags?.length || r.tags.some((t) => f.tags.includes(t)));
            if (shots.length) verdicts.push(await reviewUi({ ctx, rt: this.rt, f, feature: f, title: f.title, cwd: wt, attempt, implementerFamily: res.worker.family, screenshots: shots }));
          }
          writeJson(hp(ctx, "runs", f.id, `verdict-${attempt}.json`), verdicts);
          if (verdicts.some((v) => !v.pass)) { outcome = "review_rejected"; diag = formatIssues(verdicts); }
          else outcome = "success";
        }
      }
      const eventId = logEvent(ctx, {
        taskId: f.id, featureId: f.id, stage: f.stage, role, workerId: res.worker.id, family: res.worker.family, attempt, outcome,
        failedGates: gates?.failed, tokens: { in: res.result.usage.inputTokens, out: res.result.usage.outputTokens },
        costUsd: res.costUsd, durationMs: res.result.durationMs, tags: f.tags, lessons: lessonIds,
      });
      recordStats(ctx, res.worker.id, role, f.tags, { success: outcome === "success", costUsd: res.costUsd, durationMs: res.result.durationMs, failedGates: gates?.failed });
      recordLessonOutcome(ctx, lessonIds, outcome === "success");
      const fNow = updateFeature(ctx, f.id, (x) => {
        x.attempts = attempt;
        x.costUsd = spent(ctx, { featureId: f.id });
        x.history.push({ attempt, role, workerId: res.worker.id, outcome, failedGates: gates?.failed ?? [], eventId, ts: new Date().toISOString() });
      });
      if (outcome !== "success") {
        const why = outcome === "failure" && gates ? `gates ${gates.failed.join(",")}` : outcome === "review_rejected" ? `revisão reprovou (${verdicts.filter((v) => !v.pass).map((v) => `${v.kind} ${v.workerId ?? "?"} nota ${v.score}`).join(", ")})` : outcome;
        log(`↻ ${f.id} t${attempt} ${res.worker.id}: ${why} │ US$ ${spent(ctx, { featureId: f.id }).toFixed(2)} na feature`);
        continue;
      }

      const authors = {
        implementer: res.worker.id,
        attempts: fNow.history.map((h) => `${h.workerId} ${h.outcome === "success" ? "✔" : `✖ ${h.failedGates?.length ? h.failedGates.join(",") : h.outcome}`}`),
        testWriter: readEvents(ctx).filter((e) => e.featureId === f.id && e.role === "test_writer" && e.outcome === "success").at(-1)?.workerId,
        reviewers: verdicts.map((v) => `${v.kind} ${v.workerId ?? "?"} ${v.score}`),
        files: (await g.changedFiles(wt, this.branch)).slice(0, 60),
      };
      const touchedTests = (await g.changedFiles(wt, this.branch)).filter((p) => TEST_FILE.test(p) && !f.protectedTests.includes(p) && existsSync(join(wt, p)));
      const trailers = [`Implemented-by: ${authors.implementer} (tentativa ${attempt})`, authors.testWriter && `Tests-by: ${authors.testWriter}`, ...authors.reviewers.map((r) => `Reviewed-by: ${r}`)].filter(Boolean).join("\n");
      const landed = await this.merge(() => g.land(ctx.repo, wt, this.branch, `feat(${f.id}): ${f.title}\n\n${trailers}`));
      if (!landed.ok) { diag = `Conflito de merge com mudanças recentes de ${this.branch} nos arquivos:\n${landed.conflict}\nResolva os marcadores <<<<<<< mantendo as duas funcionalidades.`; continue; }
      registerProtected(ctx, wt, f.id, touchedTests, true);   // later features may add cases, never drop or weaken them
      await g.removeWorktree(ctx.repo, f.id);
      updateFeature(ctx, f.id, (x) => { x.status = "passing"; x.authors = authors; });
      this.progress(`✔ ${f.id} passing — ${f.title} (worker ${res.worker.id}, ${attempt} tentativa(s), US$ ${spent(ctx, { featureId: f.id }).toFixed(2)}) │ ${this.stageCount(f.stage)}`);
      this.state.featuresSinceRetro++;
      this.save();
      return;
    }
  }

  /** Before gates: workers' tmp-* scratch files are removed and the configured autofix (format, lint --fix) is committed. */
  private async tidy(wt: string, featureId: string) {
    const app = this.appAbs(wt);
    for (const d of ["", "e2e", "src", "tests"]) {
      const dir = join(app, d);
      if (existsSync(dir)) for (const n of readdirSync(dir)) if (n.startsWith("tmp-")) rmSync(join(dir, n), { recursive: true, force: true });
    }
    const cmd = this.ctx.config.project.autofixCmd;
    if (!cmd || !existsSync(app)) return;
    await execa(cmd, { shell: true, cwd: app, reject: false, timeout: 300_000 });
    await g.commitAll(wt, `style(${featureId}): autofix`);
  }

  /** Cheap model summarizes the root cause; recurring patterns become candidate lessons. */
  private async triage(f: Feature, gates: GateReport, res: InvokeRes, attempt: number, wt: string) {
    const failures = gates.results.filter((r) => !r.ok).map((r) => `### ${r.id} ${r.name}\n${r.output.slice(-3000)}`).join("\n\n");
    try {
      const t = await this.rt.invoke({ role: "triage", taskId: f.id, featureId: f.id, stage: f.stage, attempt, cwd: wt, prompt: render(this.ctx, "triage", { gateFailures: failures, transcriptTail: res.result.finalText.slice(-3000), feature: `${f.id} ${f.title}` }), schema: TriageSchema, tags: f.tags });
      if (t.data) {
        if (t.data.padrao && t.eventId) addLesson(this.ctx, { scope: { roles: ["implement", "implement_hard"], tags: f.tags }, rule: t.data.dica, evidence: [t.eventId] });
        return `Causa raiz (${t.data.categoria}): ${t.data.causaRaiz}\nDica: ${t.data.dica}\n\nGates que falharam:\n${failures.slice(0, 6000)}`;
      }
    } catch (e) {
      if (!(e instanceof NoWorkerError)) throw e;
    }
    return `Gates que falharam:\n${failures.slice(0, 8000)}`;
  }

  /** Critical features: N contenders of different workers in separate worktrees; a judge picks the winner. */
  private async tournament(f: Feature, wt: string, prompt: string, testsBase: string): Promise<InvokeRes<unknown>> {
    const ctx = this.ctx;
    const chosen: WorkerSpec[] = [];
    for (let i = 0; i < ctx.config.routing.tournament.contenders; i++) {
      const w = pick(ctx, { role: "implement_hard", tags: f.tags, excludeWorkers: chosen.map((c) => c.id), excludeFamilies: chosen.map((c) => c.family), rng: this.deps.rng })
        ?? pick(ctx, { role: "implement_hard", tags: f.tags, excludeWorkers: chosen.map((c) => c.id), rng: this.deps.rng });
      if (w) chosen.push(w);
    }
    if (chosen.length < 2) return this.rt.invoke({ role: "implement_hard", taskId: f.id, featureId: f.id, stage: f.stage, attempt: 1, cwd: wt, prompt, schema: WorkerFinal, tags: f.tags, deferEvent: true });
    const runs = await Promise.all(chosen.map(async (w, i) => {
      const cwt = await g.addWorktree(ctx.repo, `${f.id}-c${i}`, testsBase);
      this.clearInbox(cwt);
      const res = await this.rt.invoke({ role: "implement_hard", taskId: f.id, featureId: f.id, stage: f.stage, attempt: 1, cwd: cwt, prompt, schema: WorkerFinal, tags: f.tags, workerId: w.id, deferEvent: true });
      this.harvestInbox(cwt, f.id);
      await g.commitAll(cwt, `wip(${f.id}): candidato ${i} (${w.id})`);
      const gates = res.outcome === "success" ? await this.deps.runGates(ctx, cwt, { stage: f.stage, mode: "feature", base: this.branch, featureId: f.id }) : undefined;
      return { i, w, res, sha: await g.head(cwt), ok: !!gates?.ok, diff: await g.diff(cwt, testsBase) };
    }));
    const passing = runs.filter((r) => r.ok);
    const pool = passing.length ? passing : runs;
    const k = pool.length > 1 ? await judge({ ctx, rt: this.rt, f, feature: f, cwd: wt, attempt: 1, implementerFamily: pool[0].w.family, diffs: pool.map((r) => r.diff), families: pool.map((r) => r.w.family) }) : 0;
    const winner = pool[Math.min(k, pool.length - 1)];
    await g.resetHard(wt, winner.sha);
    for (const r of runs) {
      if (r !== winner) {
        logEvent(ctx, { taskId: f.id, featureId: f.id, stage: f.stage, role: "implement_hard", workerId: r.w.id, family: r.w.family, attempt: 1, outcome: "failure", tournament: "lost", costUsd: r.res.costUsd, durationMs: r.res.result.durationMs, tags: f.tags });
        recordStats(ctx, r.w.id, "implement_hard", f.tags, { success: false, costUsd: r.res.costUsd, durationMs: r.res.result.durationMs });
      }
      await g.removeWorktree(ctx.repo, `${f.id}-c${r.i}`);
    }
    return winner.res;
  }

  // ---------- stage end / checkpoint ----------

  private async stageEnd() {
    const ctx = this.ctx, s = this.state.stage;
    const wt = await this.stageWt(s);
    const gates = await this.deps.runGates(ctx, wt, { stage: s, mode: "stage", base: ctx.config.project.mainBranch });
    writeJson(hp(ctx, "runs", `stage-${s}`, `gate-report-${this.state.stageFixRounds}.json`), gates);
    const canFix = this.state.stageFixRounds < ctx.config.loop.maxStageFixRounds;
    let suiteNote = gates.ok ? `Todos os gates obrigatórios passaram em ${this.branch}.` : `Gates falhando: ${gates.failed.join(", ")}`;
    if (!gates.ok) {
      if (canFix) return this.addFixFeature(s, `Suíte completa da etapa falhou nos gates ${gates.failed.join(", ")}`, gates.results.filter((r) => !r.ok).map((r) => `${r.id}: ${r.output.slice(-1500)}`).join("\n\n"), ["regression"]);
      addRisk(ctx, { risco: `suíte da etapa ${s} falhando após ${this.state.stageFixRounds} rodadas: ${gates.failed.join(", ")}`, probabilidade: "alta", impacto: "alto", sugestao: "revisar manualmente antes de aprovar" });
      suiteNote += " (limite de rodadas de correção atingido)";
    }
    const dir = checkpointDir(ctx, s);
    const shots = await this.deps.capture(ctx, this.appAbs(wt), join(dir, "screenshots"));
    let uiVerdict: string | undefined;
    if (shots.length) {
      const implFamilies = readEvents(ctx).filter((e) => e.stage === s && String(e.role).startsWith("implement") && e.outcome === "success").map((e) => e.family);
      const top = implFamilies.sort((a, b) => implFamilies.filter((x) => x === b).length - implFamilies.filter((x) => x === a).length)[0] ?? "";
      const v = await reviewUi({ ctx, rt: this.rt, f: { id: `stage-${s}`, stage: s, tags: ["ui"] }, title: `Revisão visual completa da etapa ${s}`, cwd: wt, attempt: this.state.stageFixRounds, implementerFamily: top, screenshots: shots });
      uiVerdict = `Nota ${v.score} — ${v.pass ? "aprovado" : "reprovado"}\n${formatIssues([v])}`;
      if (!v.pass && canFix) return this.addFixFeature(s, "Revisão visual completa da etapa reprovou", formatIssues([v]), ["ui"]);
    }
    const retro = await this.retro("stage");
    await this.syncPromotedLessons(wt);
    const preview = await this.deps.deployPreview(ctx, wt, s).catch((e) => ({ url: undefined, note: String(e.message) }));
    buildCheckpoint(ctx, { stage: s, previewUrl: preview.url, previewNote: preview.note, screenshots: shots, aprendizados: retro?.aprendizados, comoTestar: retro?.comoTestar, uiVerdict, suiteNote });
    this.set("CHECKPOINT_READY");
  }

  private addFixFeature(stage: number, title: string, details: string, tags: string[]) {
    const all = loadFeatures(this.ctx);
    this.state.stageFixRounds++;
    all.features.push({
      id: `F-${stage}.fix-${this.state.stageFixRounds}`, stage, title, description: details.slice(0, 8000), specRefs: [], covers: [],
      acceptance: ["Todos os gates obrigatórios da etapa passam na suíte completa", "Nenhum teste protegido é alterado"],
      tests: [], protectedTests: [...new Set(stageFeatures(all, stage).filter((f) => f.status === "passing").flatMap((f) => f.protectedTests))], tags, difficulty: "hard",
      dependsOn: [], status: "failing", attempts: 0, costUsd: 0, history: [], origin: [],
    });
    saveFeatures(this.ctx, all);
    this.set("STAGE_RUNNING");
  }

  /** Promoted lessons become part of app/AGENTS.md on the current branch. */
  private async syncPromotedLessons(stageWt: string) {
    const ls = promotedLessons(this.ctx);
    const f = join(this.appAbs(stageWt), "AGENTS.md");
    if (!ls.length || !existsSync(f)) return;
    const marker = "## Lições promovidas pelo harness";
    const base = readFileSync(f, "utf8").split(marker)[0].trimEnd();
    writeFileSync(f, `${base}\n\n${marker}\n\n${ls.map((l) => `- ${l.rule} (${l.id})`).join("\n")}\n`);
    await this.commitToBranch(stageWt, "docs(agents): lições promovidas pelo harness");
  }

  private async publishCheckpoint() {
    const s = this.state.stage;
    (this.state.stageTimes[s] ??= { startedAt: new Date().toISOString(), activeMs: 0 }).finishedAt = new Date().toISOString();
    this.set("AWAITING_APPROVAL");
    await g.commitPaths(this.ctx.root, [".harness", "checkpoints"], `chore(harness): checkpoint etapa ${s}`).catch((e) => log(`commit do checkpoint falhou: ${e.message}`));
    await notify(this.ctx, "checkpoint_ready", `etapa ${s} pronta para teste: checkpoints/etapa-${s}/`, { stage: s });
  }

  // ---------- approval ----------

  async approve(): Promise<Phase | string> {
    const ctx = this.ctx;
    this.state = loadState(ctx) ?? (() => { throw new Error("nenhuma execução"); })();
    if (this.state.phase === "PAUSED_SPEC_CHANGE") {
      const md = existsSync(join(ctx.root, "checkpoints", "mudanca-spec.md")) ? readFileSync(join(ctx.root, "checkpoints", "mudanca-spec.md"), "utf8") : "";
      if (!(await this.deps.confirm(`${md.slice(0, 3000)}\n\nAceitar a nova spec/design e continuar?`))) return "mudança não aceita";
      freezeSpec(ctx);
      const all = loadFeatures(ctx);
      all.specHash = storedHash(ctx);
      saveFeatures(ctx, all);
      this.set(this.state.pausedFrom ?? "STAGE_RUNNING");
      return this.run();
    }
    if (this.state.phase !== "AWAITING_APPROVAL") return `nada para aprovar (fase ${this.state.phase})`;
    await this.useBranch();
    const s = this.state.stage;
    const dir = checkpointDir(ctx, s);
    const aprovacao = readFileSync(join(dir, "APROVACAO.md"), "utf8"), duvidas = existsSync(join(dir, "DUVIDAS.md")) ? readFileSync(join(dir, "DUVIDAS.md"), "utf8") : "";
    let a: Approval = parseApprovalFiles(aprovacao, duvidas);
    try {
      const r = await this.rt.invoke({ role: "approval_parser", taskId: `approve-${s}`, stage: s, attempt: 1, cwd: ctx.root, prompt: render(ctx, "approval_parser", { aprovacao, duvidas, features: stageFeatures(loadFeatures(ctx), s).filter((f) => f.authors).map((f) => `- ${f.id} ${f.title} (arquivos: ${f.authors!.files.slice(0, 15).join(", ")})`).join("\n") || "-" }), schema: ApprovalSchema });
      if (r.data) a = { ...r.data, respostasDuvidas: r.data.respostasDuvidas.map((x) => ({ ...x, resposta: resolveAnswer(duvidas, x.id, x.resposta) })) };
    } catch (e) {
      if (!(e instanceof NoWorkerError)) throw e;
    }
    const ajustes = a.ajustes.map((x) => (typeof x === "string" ? { titulo: x, descricao: x, criterios: [x], tags: [] as string[], features: [] as string[] } : x));
    if (!a.aprovado && !ajustes.length) return `✖ APROVACAO.md da etapa ${s} não está preenchido (Status: aprovado, ou ajustes + lista). Nada mudou.`;
    const summary = [`Etapa ${s}: ${a.aprovado && !ajustes.length ? "APROVADA" : "AJUSTES"}`, ...ajustes.map((x) => `  ajuste: ${x.titulo}`), ...a.respostasDuvidas.map((r) => `  ${r.id}: ${r.resposta}`)].join("\n");
    if (!(await this.deps.confirm(summary))) return "✖ aprovação cancelada: nada mudou";

    const wt = await this.stageWt(s);
    if (a.respostasDuvidas.length) {
      const decisions = join(wt, ctx.config.project.decisionsFile);
      appendFileSync(decisions, `\n\n## Respostas do checkpoint da etapa ${s}\n\n${a.respostasDuvidas.map((r) => `- ${r.id}${r.pergunta ? ` (${r.pergunta})` : ""}: ${r.resposta}`).join("\n")}\n`);
      await this.commitToBranch(wt, `docs(decisoes): respostas do checkpoint da etapa ${s}`);
      for (const r of a.respostasDuvidas) addLesson(ctx, { rule: `Decisão do humano: ${r.pergunta ? `${r.pergunta} → ` : ""}${r.resposta}`, evidence: [`checkpoints/etapa-${s}/DUVIDAS.md#${r.id}`] });
      markAnswered(ctx, a.respostasDuvidas.map((r) => r.id));
    }
    if (ajustes.length) {
      const all = loadFeatures(ctx);
      const n = all.features.filter((f) => f.id.startsWith(`F-${s}.adj-`)).length;
      ajustes.forEach((x, i) => all.features.push({
        id: `F-${s}.adj-${String(n + i + 1).padStart(2, "0")}`, stage: s, title: x.titulo, description: x.descricao || x.titulo, specRefs: [], covers: [],
        acceptance: x.criterios.length ? x.criterios : [x.titulo], tests: [], protectedTests: [], tags: x.tags.length ? x.tags : ["ui"],
        difficulty: "normal", dependsOn: [], status: "failing", attempts: 0, costUsd: 0, history: [], origin: x.features,
      }));
      saveFeatures(ctx, all);
      this.state.stageFixRounds = 0;
      this.set("STAGE_RUNNING");
      this.progress(`etapa ${s}: ${ajustes.length} ajuste(s) viraram features F-${s}.adj-*; rodando agora`);
      return this.run();
    }
    const visual = ctx.config.gates.G11;
    if (visual?.updateCmd && s >= visual.fromStage) {
      await this.deps.runGates({ ...ctx, config: { ...ctx.config, gates: { G11: { ...visual, cmd: visual.updateCmd } } } }, wt, { stage: s, mode: "stage" });
      await this.commitToBranch(wt, `test(visual): baseline aprovada na etapa ${s}`);
    }
    await g.removeWorktree(ctx.repo, `stage-${s}`);
    this.progress(`✔ etapa ${s} aprovada${a.respostasDuvidas.length ? ` · ${a.respostasDuvidas.length} resposta(s) em ${ctx.config.project.decisionsFile}` : ""} · commits em ${this.branch}`);
    const next = this.firstStageFrom(s + 1);
    Object.assign(this.state, { stage: next ?? s, stageFixRounds: 0, budgetAlerts: [] });
    this.set(next === undefined ? "DONE" : "STAGE_RUNNING");
    await g.commitPaths(ctx.root, [".harness", "checkpoints"], `chore(harness): etapa ${s} aprovada`).catch(() => null);
    // the next stage starts only on `harness resume`, after the human switches to that stage's branch
    return next === undefined ? this.run() : this.state.phase;
  }

  // ---------- learning ----------

  private async retro(kind: "periodic" | "stage") {
    const ctx = this.ctx;
    this.state.featuresSinceRetro = 0;
    this.save();
    const events = readEvents(ctx).slice(-150).map((e) => `${e.id} ${e.featureId ?? e.taskId} ${e.role} ${e.workerId} t${e.attempt} ${e.outcome}${e.failedGates?.length ? ` gates:${e.failedGates}` : ""} $${(e.costUsd ?? 0).toFixed(2)}`).join("\n");
    const lessons = ["project", "harness"].map((f) => existsSync(hp(ctx, "lessons", `${f}.md`)) ? readFileSync(hp(ctx, "lessons", `${f}.md`), "utf8") : "").join("\n");
    const fs = stageFeatures(loadFeatures(ctx), this.state.stage).map((f) => `${f.id} [${f.status}] ${f.title}: ${f.acceptance.join(" | ")}`).join("\n");
    try {
      const r = await this.rt.invoke({ role: "retro", taskId: `retro-${this.state.stage}-${kind}`, stage: this.state.stage, attempt: 1, cwd: ctx.root, prompt: render(ctx, "retro", { kind, events, lessonFiles: lessons, features: fs, stage: String(this.state.stage), baseUrl: ctx.config.browser.baseUrl, basePort: new URL(ctx.config.browser.baseUrl).port }), schema: RetroSchema });
      if (!r.data) return undefined;
      applyRetro(ctx, r.data);
      return r.data;
    } catch (e) {
      if (e instanceof NoWorkerError) return undefined;
      throw e;
    }
  }

  private async postmortem() {
    const ctx = this.ctx;
    const events = readEvents(ctx);
    const summary = `eventos: ${events.length}\n` + Object.entries(events.reduce<Record<string, number>>((a, e) => ((a[`${e.role}/${e.outcome}`] = (a[`${e.role}/${e.outcome}`] ?? 0) + 1), a), {})).map(([k, v]) => `${k}: ${v}`).join("\n");
    const stats = existsSync(hp(ctx, "routing-stats.json")) ? readFileSync(hp(ctx, "routing-stats.json"), "utf8").slice(0, 20000) : "{}";
    try {
      const r = await this.rt.invoke({ role: "postmortem", taskId: "postmortem", stage: this.state.stage, attempt: 1, cwd: ctx.root, prompt: render(ctx, "postmortem", { summary, stats }), schema: PostmortemSchema });
      for (const p of r.data?.proposals ?? []) {
        mkdirSync(hp(ctx, "proposals"), { recursive: true });
        writeFileSync(hp(ctx, "proposals", `${p.id}.diff`), `# ${p.title}\n# ${p.rationale.replace(/\n/g, "\n# ")}\n${p.diff.endsWith("\n") ? p.diff : p.diff + "\n"}`);
      }
    } catch (e) {
      if (!(e instanceof NoWorkerError)) throw e;
    }
    this.state.postmortemDone = true;
    this.save();
    await notify(ctx, "run_finished", "execução concluída: todas as etapas aprovadas");
  }

  // ---------- reporting ----------

  status(): string {
    const s = loadState(this.ctx);
    if (!s) return "Nenhuma execução. Próximo passo: harness doctor → harness smoke → harness start";
    const all = loadFeatures(this.ctx), stageFs = stageFeatures(all, s.stage);
    const count = (fs: Feature[]) => ["passing", "in_progress", "failing", "blocked"].map((k) => `${k}=${fs.filter((f) => f.status === k).length}`).join(" ");
    const icon = s.phase === "AWAITING_APPROVAL" || s.phase === "DONE" ? "✔" : s.phase === "CRASHED" ? "✖" : s.phase.startsWith("PAUSED") ? "⏸" : "▶";
    const t = s.stageTimes[s.stage];
    const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    return [
      `${icon} Fase: ${s.phase}${s.pausedFrom ? ` (de ${s.pausedFrom})` : ""} · Etapa ${s.stage} (${this.ctx.config.stages.find((x) => x.id === s.stage)?.name ?? "?"})`,
      `Etapa atual: ${count(stageFs)}`,
      `Total: ${all.features.length} features — ${count(all.features)}`,
      t ? `Tempo da etapa: ${fmtDur(t.activeMs)} de execução · início ${when(t.startedAt)}${t.finishedAt ? ` · checkpoint ${when(t.finishedAt)}` : ""}` : "",
      `Custo acumulado: US$ ${spent(this.ctx).toFixed(2)} / ${this.ctx.budget.caps.run} (etapa: US$ ${spent(this.ctx, { stage: s.stage }).toFixed(2)} / ${stageCap(this.ctx, s.stage)})`,
      `Próximo passo: ${this.nextStep(s, stageFs)}`,
    ].filter(Boolean).join("\n");
  }

  private nextStep(s: State, stageFs: Feature[]) {
    const dir = `checkpoints/etapa-${s.stage}`;
    if (s.phase === "AWAITING_APPROVAL") {
      const file = join(this.ctx.root, dir, "APROVACAO.md");
      const a = existsSync(file) ? parseApprovalFiles(readFileSync(file, "utf8"), "") : undefined;
      if (a?.ajustes.length) return `${dir}/APROVACAO.md tem ${a.ajustes.length} ajuste(s), ainda não processados: rode harness approve`;
      if (a?.aprovado) return `${dir}/APROVACAO.md está "aprovado", mas a aprovação ainda não foi processada: rode harness approve`;
      return `testar (${dir}/COMO-TESTAR.md), preencher ${dir}/APROVACAO.md e DUVIDAS.md, depois harness approve`;
    }
    if (s.phase === "STAGE_RUNNING" && !stageFs.some((f) => f.attempts > 0 || f.status !== "failing")) return `a etapa ${s.stage} ainda não começou: crie/troque para a branch da etapa e rode harness resume`;
    return {
      INIT: "harness start", STAGE_RUNNING: "harness resume", STAGE_GATES: "harness resume", CHECKPOINT_READY: "harness resume", AWAITING_APPROVAL: "",
      PAUSED_BUDGET: "ajustar budget.yaml e rodar harness resume", PAUSED_QUOTA: "recarregar o crédito do provedor (ou desabilitar o worker em harness.config.yaml) e rodar harness resume",
      PAUSED_SPEC_CHANGE: "revisar checkpoints/mudanca-spec.md e rodar harness approve", PAUSED_MANUAL: "harness resume",
      CRASHED: "ver .harness/crashes.jsonl e rodar harness resume", DONE: "ver .harness/proposals/ (harness apply-proposal <id>)",
    }[s.phase];
  }

  /** Human action only: applies a postmortem proposal to the harness. */
  async applyProposal(id: string) {
    const f = hp(this.ctx, "proposals", `${id}.diff`);
    if (!existsSync(f)) throw new Error(`proposta ${id} não existe`);
    await g.git(this.ctx.root, "apply", f);
    mkdirSync(hp(this.ctx, "proposals", "applied"), { recursive: true });
    renameSync(f, hp(this.ctx, "proposals", "applied", `${id}.diff`));
    return `proposta ${id} aplicada; revise com git diff e faça commit`;
  }
}
