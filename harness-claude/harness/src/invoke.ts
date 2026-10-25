import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { z } from "zod";
import { adapters, workerEnv } from "./adapters/index.js";
import { FatalError, type Role, type WorkerResult, type WorkerSpec } from "./adapters/types.js";
import { breach, type Cap, estimate, record, usageRatio } from "./budget.js";
import { type Ctx, enabledWorkers } from "./config.js";
import { log, logEvent } from "./logger.js";
import { extractJson } from "./prompts.js";
import { candidates, pick, recordStats } from "./router.js";
import { hp } from "./state.js";

export class BudgetError extends Error { constructor(public cap: Cap) { super(`teto de orçamento atingido: ${cap}`); } }
export class NoWorkerError extends Error {}

export interface InvokeReq<T = unknown> {
  role: Role;
  taskId: string;
  stage: number;
  attempt: number;
  cwd: string;
  prompt: string;
  featureId?: string;
  attachments?: string[];
  schema?: z.ZodType<T>;
  tags?: string[];
  excludeFamilies?: string[];
  excludeWorkers?: string[];
  workerId?: string;       // force a worker (smoke, tournament)
  deferEvent?: boolean;    // caller logs the attempt event itself (feature attempts)
}

export interface InvokeRes<T = unknown> {
  worker: WorkerSpec;
  result: WorkerResult;
  data?: T;
  outcome: "success" | "failure" | "timeout" | "invalid_json";
  costUsd: number;
  eventId?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Single entry point for every worker call: routing, budget, ledger, transcript, JSON validation. */
export class Runtime {
  busy = new Map<string, number>();
  unavailable = new Set<string>();
  constructor(public ctx: Ctx, public opts: { rng?: () => number; onSpend?: (stage: number) => Promise<void> } = {}) {}

  preferCheap = (stage: number) => usageRatio(this.ctx, stage) >= 0.8;

  async invoke<T>(r: InvokeReq<T>): Promise<InvokeRes<T>> {
    const adapter = (w: WorkerSpec) => adapters[w.cli];
    let w: WorkerSpec;
    for (;;) {
      w = await this.choose(r);
      this.busy.set(w.id, (this.busy.get(w.id) ?? 0) + 1);
      const err = await adapter(w).prepare?.(w, this.ctx.env);
      if (!err) break;
      // e.g. LM Studio refused to load the model: exclude it for this run and pick another worker
      this.busy.set(w.id, (this.busy.get(w.id) ?? 1) - 1);
      this.unavailable.add(w.id);
      log(`worker ${w.id} indisponível: ${err.slice(0, 200)}`);
      if (r.workerId) throw new NoWorkerError(`worker ${w.id} indisponível: ${err}`);
    }
    try {
      const dir = hp(this.ctx, "runs", r.taskId);
      mkdirSync(dir, { recursive: true });
      const base = `${r.attempt}-${r.role}-${w.id}`;
      writeFileSync(join(dir, `${base}.prompt.md`), r.prompt);
      let result = await this.exec(w, r, r.prompt, join(dir, `${base}.jsonl`));
      let costUsd = record(this.ctx, w, r.role, r.stage, r.featureId, result.usage).costUsd;
      let outcome: InvokeRes["outcome"] = result.timedOut ? "timeout" : result.ok ? "success" : "failure";
      let data: T | undefined;
      if (outcome === "success" && r.schema) {
        data = this.parse(r.schema, result.finalText);
        if (data === undefined) {
          // one formatting retry, same worker, previous answer as context
          const retry = `Sua resposta anterior não terminou com um bloco JSON válido no formato exigido.\nResposta anterior (final):\n${result.finalText.slice(-4000)}\n\nNÃO refaça o trabalho e NÃO repita o JSON da feature. Responda SOMENTE com o bloco \`\`\`json final no formato pedido nas instruções abaixo (se o papel não definir outro, use {"summary","filesChanged","testsRun","confidence","notes"}).\n\n${r.prompt.slice(-6000)}`;
          result = await this.exec(w, r, retry, join(dir, `${base}.format-retry.jsonl`));
          costUsd += record(this.ctx, w, r.role, r.stage, r.featureId, result.usage).costUsd;
          data = result.ok ? this.parse(r.schema, result.finalText) : undefined;
          if (data === undefined) outcome = "invalid_json";
        }
      }
      let eventId: string | undefined;
      if (!r.deferEvent) {
        eventId = logEvent(this.ctx, {
          taskId: r.taskId, featureId: r.featureId, stage: r.stage, role: r.role, workerId: w.id, family: w.family,
          attempt: r.attempt, outcome, tokens: { in: result.usage.inputTokens, out: result.usage.outputTokens },
          costUsd, durationMs: result.durationMs, tags: r.tags,
        });
        recordStats(this.ctx, w.id, r.role, r.tags ?? [], { success: outcome === "success", costUsd, durationMs: result.durationMs });
      }
      await this.opts.onSpend?.(r.stage);
      return { worker: w, result, data, outcome, costUsd, eventId };
    } finally {
      await adapter(w).release?.(w, this.ctx.env).catch(() => undefined);
      this.busy.set(w.id, (this.busy.get(w.id) ?? 1) - 1);
    }
  }

  private parse<T>(schema: z.ZodType<T>, text: string): T | undefined {
    const r = schema.safeParse(extractJson(text));
    return r.success ? r.data : undefined;
  }

  /** Worker crashes never take the orchestrator down (except FatalError). */
  private async exec(w: WorkerSpec, r: InvokeReq<any>, prompt: string, transcriptPath: string): Promise<WorkerResult> {
    try {
      return await adapters[w.cli].run(w, { workerId: w.id, role: r.role, cwd: r.cwd, prompt, attachments: r.attachments, taskId: r.taskId, attempt: r.attempt }, { transcriptPath, env: workerEnv(this.ctx, w) });
    } catch (e) {
      if (e instanceof FatalError) throw e;
      return { ok: false, exitCode: -1, finalText: String(e), usage: { inputTokens: 0, outputTokens: 0 }, durationMs: 0, transcriptPath };
    }
  }

  private async choose(r: InvokeReq<any>): Promise<WorkerSpec> {
    if (r.workerId) {
      const w = enabledWorkers(this.ctx).find((x) => x.id === r.workerId);
      if (!w) throw new NoWorkerError(`worker ${r.workerId} não habilitado`);
      const b = breach(this.ctx, w, estimate(this.ctx, w, r.role), { stage: r.stage, featureId: r.featureId });
      if (b) throw new BudgetError(b);
      return w;
    }
    const exclude = [...(r.excludeWorkers ?? [])];
    let lastBreach: Cap | null = null;
    for (;;) {
      const o = { role: r.role, tags: r.tags, excludeFamilies: r.excludeFamilies, excludeWorkers: exclude, unavailable: this.unavailable, preferCheap: this.preferCheap(r.stage) };
      const w = pick(this.ctx, { ...o, busy: this.busy, rng: this.opts.rng });
      if (!w) {
        if (candidates(this.ctx, o).length) { await sleep(200); continue; }   // all busy: wait for a slot
        if (lastBreach) throw new BudgetError(lastBreach);
        throw new NoWorkerError(`nenhum worker disponível para ${r.role}`);
      }
      if (adapters[w.cli].available && !(await adapters[w.cli].available!(w, this.ctx.env))) {
        this.unavailable.add(w.id);
        continue;
      }
      const b = breach(this.ctx, w, estimate(this.ctx, w, r.role), { stage: r.stage, featureId: r.featureId });
      if (b) { lastBreach = b; exclude.push(w.id); continue; }
      return w;
    }
  }
}
