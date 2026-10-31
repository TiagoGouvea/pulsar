import { existsSync, readFileSync, statSync } from "node:fs";
import { readLedger, spent } from "./budget.js";
import type { Ctx } from "./config.js";
import { fmtDur, readEvents } from "./logger.js";
import { hp, readJsonl } from "./state.js";

export interface ReviewRow { ts: string; stage: number; featureId: string; kind: string; workerId?: string; pass: boolean; score: number }

/** Per role x model: attempts, technical success, review verdicts, failed gates, mean cost and time. */
export function modelsReport(ctx: Ctx, stage?: number): string {
  const inStage = (r: { stage: number }) => stage === undefined || r.stage === stage;
  const evs = readEvents(ctx).filter(inStage);
  const ledger = readLedger(ctx).filter(inStage);
  const reviews = readJsonl<ReviewRow>(hp(ctx, "reviews.jsonl")).filter(inStage);
  const groups = new Map<string, typeof evs>();
  for (const e of evs) groups.set(`${e.role}|${e.workerId}`, [...(groups.get(`${e.role}|${e.workerId}`) ?? []), e]);
  const rows = [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([k, es]) => {
    const [role, worker] = k.split("|");
    const ok = es.filter((e) => e.outcome === "success").length;
    const cost = ledger.filter((r) => r.workerId === worker && r.role === role).reduce((a, r) => a + r.costUsd, 0);
    const rv = reviews.filter((r) => r.workerId === worker && `review_${r.kind}` === role);
    const gates = Object.entries(es.flatMap((e) => e.failedGates ?? []).reduce<Record<string, number>>((a, g) => ((a[g] = (a[g] ?? 0) + 1), a), {})).map(([g, n]) => `${g}×${n}`).join(" ");
    return [role, worker, `${ok}/${es.length}`, `${Math.round((100 * ok) / es.length)}%`, rv.length ? `${rv.filter((r) => r.pass).length}✔ ${rv.filter((r) => !r.pass).length}✖` : "", `US$${(cost / es.length).toFixed(3)}`, `US$${cost.toFixed(2)}`, fmtDur(es.reduce((a, e) => a + (e.durationMs ?? 0), 0) / es.length), gates];
  });
  const head = ["papel", "modelo", "ok", "%", "veredito", "custo/chamada", "custo total", "tempo médio", "gates que falharam"];
  const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (r: string[]) => r.map((c, i) => c.padEnd(w[i])).join("  ").trimEnd();
  return [
    `Performance por modelo — ${stage === undefined ? "todas as etapas" : `etapa ${stage}`} (US$ ${spent(ctx, stage === undefined ? {} : { stage }).toFixed(2)})`,
    "ok = chamada concluída (implement: passou gates e revisão); veredito = aprovou/reprovou como revisor",
    "", line(head), ...rows.map(line),
  ].join("\n");
}

/** Ledger vs what the providers report (OpenRouter key usage; Anthropic/OpenAI need admin keys). */
export async function costsReport(ctx: Ctx): Promise<string> {
  const rows = readLedger(ctx);
  const since = rows[0]?.ts ?? new Date().toISOString();
  const mine = (p: string) => `ledger US$ ${spent(ctx, { provider: p }, rows).toFixed(2)}`;
  const get = async (url: string, headers: Record<string, string>) => {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
    return r.json() as Promise<any>;
  };
  const line = async (name: string, p: string, fn?: () => Promise<string>) => `${name.padEnd(11)} ${mine(p).padEnd(18)} ${fn ? await fn().catch((e) => `erro: ${e.message}`) : "sem chave de consulta"}`;
  const e = ctx.env;
  return [
    `Gasto registrado vs. provedor (desde ${since.slice(0, 10)})`,
    await line("openrouter", "openrouter", e.OPENROUTER_API_KEY ? async () => {
      const d = (await get("https://openrouter.ai/api/v1/key", { authorization: `Bearer ${e.OPENROUTER_API_KEY}` })).data;
      return `provedor US$ ${Number(d.usage).toFixed(2)} (uso total da chave; limite ${d.limit ?? "-"}, restante ${d.limit_remaining?.toFixed?.(2) ?? "-"})`;
    } : undefined),
    await line("anthropic", "anthropic", e.ANTHROPIC_ADMIN_KEY ? async () => {
      const d = await get(`https://api.anthropic.com/v1/organizations/cost_report?starting_at=${since.slice(0, 10)}T00:00:00Z&limit=31`, { "x-api-key": e.ANTHROPIC_ADMIN_KEY!, "anthropic-version": "2023-06-01" });
      const cents = (d.data ?? []).flatMap((b: any) => b.results ?? []).reduce((a: number, r: any) => a + Number(r.amount ?? 0), 0);
      return `provedor US$ ${(cents / 100).toFixed(2)} (organização inteira)`;
    } : undefined),
    await line("openai", "openai", e.OPENAI_ADMIN_KEY ? async () => {
      const d = await get(`https://api.openai.com/v1/organization/costs?start_time=${Math.floor(Date.parse(since.slice(0, 10)) / 1000)}&limit=31`, { authorization: `Bearer ${e.OPENAI_ADMIN_KEY}` });
      const usd = (d.data ?? []).flatMap((b: any) => b.results ?? []).reduce((a: number, r: any) => a + Number(r.amount?.value ?? 0), 0);
      return `provedor US$ ${usd.toFixed(2)} (organização inteira)`;
    } : undefined),
    "Anthropic e OpenAI só informam custo com Admin API key (ANTHROPIC_ADMIN_KEY / OPENAI_ADMIN_KEY no .env).",
  ].join("\n");
}

/** Follows .harness/console.log (written by the running harness) from another terminal. */
export async function watch(ctx: Ctx) {
  const file = hp(ctx, "console.log");
  let pos = 0;
  if (existsSync(file)) {
    const all = readFileSync(file, "utf8");
    process.stdout.write(all.split("\n").slice(-30).join("\n"));
    pos = Buffer.byteLength(all);
  }
  for (;;) {
    await new Promise((r) => setTimeout(r, 1000));
    if (!existsSync(file) || statSync(file).size <= pos) continue;
    const buf = readFileSync(file).subarray(pos);
    pos += buf.length;
    process.stdout.write(buf.toString());
  }
}
