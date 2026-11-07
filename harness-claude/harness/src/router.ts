import { readLedger, typicalCost } from "./budget.js";
import { type Ctx, enabledWorkers } from "./config.js";
import type { WorkerSpec } from "./adapters/types.js";
import { hp, readJson, writeJson } from "./state.js";

export interface Stat { tentativas: number; sucessos: number; custoMedio: number; duracaoMedia: number; falhasPorGate: Record<string, number> }
export type RoutingStats = Record<string, Stat>;

export interface PickOpts {
  role: string;
  tags?: string[];
  excludeFamilies?: string[];
  excludeWorkers?: string[];
  busy?: Map<string, number>;
  unavailable?: Set<string>;
  preferCheap?: boolean;
  rng?: () => number;
}

const statsFile = (ctx: Ctx) => hp(ctx, "routing-stats.json");
export const loadStats = (ctx: Ctx): RoutingStats => readJson(statsFile(ctx), {});
const key = (w: string, role: string, tag = "*") => `${w}|${role}|${tag}`;

/** Eligible workers for a role, honoring family rule, vision, availability, concurrency and local exclusivity. */
export function candidates(ctx: Ctx, o: PickOpts): WorkerSpec[] {
  const role = ctx.config.roles[o.role];
  if (!role) throw new Error(`papel desconhecido: ${o.role}`);
  const busy = o.busy ?? new Map();
  const localBusy = enabledWorkers(ctx).some((w) => w.tier === "local" && (busy.get(w.id) ?? 0) > 0);
  const ok = (w: WorkerSpec) =>
    !o.excludeWorkers?.includes(w.id) && !o.unavailable?.has(w.id) && !o.excludeFamilies?.includes(w.family) &&
    (role.requires !== "vision" || w.vision) && (busy.get(w.id) ?? 0) < w.concurrency && !(w.tier === "local" && localBusy);
  const enabled = enabledWorkers(ctx);
  let list = role.pool.map((id) => enabled.find((w) => w.id === id)).filter((w): w is WorkerSpec => !!w && ok(w));
  // reviewers must never share the implementer family: fall back to any enabled worker of another family
  if (!list.length && role.rule) list = enabled.filter(ok);
  if (o.preferCheap && list.some((w) => w.tier === "low" || w.tier === "local")) list = list.filter((w) => w.tier === "low" || w.tier === "local");
  return list;
}

/** Value of an hour of waiting, in US$: a slow model costs time too (glm-or: cheap per token, 15 min per attempt). */
const TIME_USD_PER_HOUR = 2;

/** Inverse of the expected cost of one success: (cost per call + waiting time) / Laplace-smoothed success rate.
 * Without history in the role, cost comes from `coldCost` (prices.yaml); smoke priors only count for success. */
export function score(stats: RoutingStats, w: WorkerSpec, role: string, tags: string[] = [], coldCost = 0) {
  const s = [key(w.id, role), ...tags.map((t) => key(w.id, role, t))].map((k) => stats[k]).filter(Boolean);
  const prior = stats[key(w.id, "smoke")];
  const n = s.reduce((a, x) => a + x.tentativas, 0) + (prior?.tentativas ?? 0);
  const ok = s.reduce((a, x) => a + x.sucessos, 0) + (prior?.sucessos ?? 0);
  const cost = s[0]?.custoMedio ?? coldCost;
  const dur = s[0]?.duracaoMedia ?? 600_000;
  return ((ok + 1) / (n + 2)) / (cost + (dur / 3_600_000) * TIME_USD_PER_HOUR + 0.01);
}

/** Bandit choice: best score, or a random other candidate with probability explorationRate. */
export function pick(ctx: Ctx, o: PickOpts): WorkerSpec | undefined {
  const list = candidates(ctx, o);
  if (list.length <= 1) return list[0];
  const stats = loadStats(ctx);
  const rows = readLedger(ctx);
  const sc = new Map(list.map((w) => [w.id, score(stats, w, o.role, o.tags, typicalCost(ctx, w, o.role, rows))]));
  const ranked = [...list].sort((a, b) => sc.get(b.id)! - sc.get(a.id)!);
  const rng = o.rng ?? Math.random;
  return rng() < ctx.config.routing.explorationRate ? ranked[1 + Math.floor(rng() * (ranked.length - 1))] : ranked[0];
}

export function recordStats(ctx: Ctx, workerId: string, role: string, tags: string[], r: { success: boolean; costUsd: number; durationMs: number; failedGates?: string[] }) {
  const stats = loadStats(ctx);
  for (const k of [key(workerId, role), ...tags.map((t) => key(workerId, role, t))]) {
    const s = (stats[k] ??= { tentativas: 0, sucessos: 0, custoMedio: 0, duracaoMedia: 0, falhasPorGate: {} });
    s.tentativas++;
    s.sucessos += r.success ? 1 : 0;
    s.custoMedio += (r.costUsd - s.custoMedio) / s.tentativas;
    s.duracaoMedia += (r.durationMs - s.duracaoMedia) / s.tentativas;
    for (const g of r.failedGates ?? []) s.falhasPorGate[g] = (s.falhasPorGate[g] ?? 0) + 1;
  }
  writeJson(statsFile(ctx), stats);
}
