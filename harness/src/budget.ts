import { type Ctx, enabledWorkers, providerOf } from "./config.js";
import type { Usage, WorkerSpec } from "./adapters/types.js";
import { loadFeatures } from "./features.js";
import { appendJsonl, hp, readJsonl } from "./state.js";

export interface LedgerRow {
  ts: string; workerId: string; provider: string; role: string; featureId?: string; stage: number;
  tokensIn: number; tokensOut: number; costUsd: number; billing: string;
}
export type Cap = "feature" | "stage" | "run" | "provider";

const TIER_EST: Record<string, number> = { high: 1.0, mid: 0.4, low: 0.05, local: 0 };
const file = (ctx: Ctx) => hp(ctx, "ledger.jsonl");
export const readLedger = (ctx: Ctx) => readJsonl<LedgerRow>(file(ctx));
const sum = (rows: LedgerRow[]) => rows.reduce((a, r) => a + r.costUsd, 0);
const today = () => new Date().toISOString().slice(0, 10);

/** CLI-reported cost first, else prices.yaml; subscription/local have marginal cost 0. */
export function costOf(ctx: Ctx, w: WorkerSpec, u: Usage): number {
  if (w.billing !== "api") return 0;
  if (typeof u.costUsd === "number") return u.costUsd;
  const p = ctx.prices[w.id];
  const n = (v: unknown) => (typeof v === "number" ? v : 0);
  if (!p) return 0;
  const cached = u.cachedTokens ?? 0;
  return (n(p.input) * u.inputTokens + n(p.output) * u.outputTokens + n(p.cached ?? p.input) * cached) / 1e6;
}

export function record(ctx: Ctx, w: WorkerSpec, role: string, stage: number, featureId: string | undefined, u: Usage): LedgerRow {
  const row: LedgerRow = {
    ts: new Date().toISOString(), workerId: w.id, provider: providerOf(w), role, featureId, stage,
    tokensIn: u.inputTokens, tokensOut: u.outputTokens, costUsd: costOf(ctx, w, u), billing: w.billing,
  };
  appendJsonl(file(ctx), row);
  return row;
}

export function spent(ctx: Ctx, f: { stage?: number; featureId?: string; provider?: string; day?: string } = {}, rows = readLedger(ctx)) {
  return sum(rows.filter((r) =>
    (f.stage === undefined || r.stage === f.stage) && (f.featureId === undefined || r.featureId === f.featureId) &&
    (f.provider === undefined || r.provider === f.provider) && (f.day === undefined || r.ts.startsWith(f.day))));
}

/** Historical average for worker x role (last 20 calls), else a tier default. */
export function estimate(ctx: Ctx, w: WorkerSpec, role: string, rows = readLedger(ctx)) {
  if (w.billing !== "api") return 0;
  const hist = rows.filter((r) => r.workerId === w.id && r.role === role).slice(-20);
  return hist.length ? sum(hist) / hist.length : TIER_EST[w.tier];
}

/** First cap that the estimated call would break, or null. */
export function breach(ctx: Ctx, w: WorkerSpec, est: number, s: { stage: number; featureId?: string }): Cap | null {
  const rows = readLedger(ctx);
  const c = ctx.budget.caps;
  if (spent(ctx, {}, rows) + est > c.run) return "run";
  if (spent(ctx, { stage: s.stage }, rows) + est > c.stage) return "stage";
  const prov = providerOf(w);
  if (c.dailyByProvider[prov] !== undefined && spent(ctx, { provider: prov, day: today() }, rows) + est > c.dailyByProvider[prov]) return "provider";
  if (s.featureId && spent(ctx, { featureId: s.featureId }, rows) + est > c.feature) return "feature";
  return null;
}

/** Highest usage ratio between run and current stage caps (drives alerts and prefer_cheap). */
export function usageRatio(ctx: Ctx, stage: number) {
  const rows = readLedger(ctx);
  return Math.max(spent(ctx, {}, rows) / ctx.budget.caps.run, spent(ctx, { stage }, rows) / ctx.budget.caps.stage);
}

const table = (title: string, groups: Record<string, LedgerRow[]>) =>
  `\n${title}\n` + Object.entries(groups).sort(([, a], [, b]) => sum(b) - sum(a))
    .map(([k, rs]) => `  ${k.padEnd(22)} US$ ${sum(rs).toFixed(2).padStart(8)}  chamadas ${String(rs.length).padStart(4)}  tokens ${rs.reduce((a, r) => a + r.tokensIn + r.tokensOut, 0)}`).join("\n");

const groupBy = (rows: LedgerRow[], fn: (r: LedgerRow) => string) =>
  rows.reduce<Record<string, LedgerRow[]>>((a, r) => ((a[fn(r)] ??= []).push(r), a), {});

export function report(ctx: Ctx): string {
  const rows = readLedger(ctx);
  const passing = loadFeatures(ctx).features.filter((f) => f.status === "passing");
  const featCost = passing.length ? spent(ctx, {}, rows.filter((r) => passing.some((f) => f.id === r.featureId))) / passing.length : 0;
  const subs = rows.filter((r) => r.billing === "subscription");
  return [
    `Gasto total: US$ ${sum(rows).toFixed(2)} de US$ ${ctx.budget.caps.run} (teto da execução)`,
    table("Por etapa:", groupBy(rows, (r) => `etapa ${r.stage}`)),
    table("Por worker:", groupBy(rows, (r) => r.workerId)),
    table("Por papel:", groupBy(rows, (r) => r.role)),
    table("Por provedor:", groupBy(rows, (r) => r.provider)),
    `\nCusto médio por feature aprovada: US$ ${featCost.toFixed(2)} (${passing.length} aprovadas)`,
    subs.length ? `Assinaturas (custo marginal 0): ${Object.entries(groupBy(subs, (r) => r.workerId)).map(([k, v]) => `${k}=${v.length} prompts`).join(", ")}` : "",
    `Workers habilitados: ${enabledWorkers(ctx).map((w) => w.id).join(", ")}`,
  ].join("\n");
}
