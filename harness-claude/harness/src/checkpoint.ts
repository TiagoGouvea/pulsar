import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { execa } from "execa";
import { z } from "zod";
import type { Ctx } from "./config.js";
import { readLedger, spent, stageCap } from "./budget.js";
import { loadFeatures, stageFeatures } from "./features.js";
import { readEvents } from "./logger.js";
import { gateEnv } from "./gates/browser.js";
import { hp, normText, readJson, readJsonl, walk, writeJson } from "./state.js";

// ---------- spec/design hash and change detection ----------

const files = (ctx: Ctx) => {
  const out = Object.values(ctx.config.project.specFiles).map((f) => join(ctx.repo, f));
  return [...out, ...walk(join(ctx.repo, ctx.config.project.designDir))].sort();
};

export function computeHash(ctx: Ctx) {
  const h = createHash("sha256");
  for (const f of files(ctx)) h.update(relative(ctx.repo, f)).update(existsSync(f) ? readFileSync(f) : "");
  return h.digest("hex");
}

export const storedHash = (ctx: Ctx) => (existsSync(hp(ctx, "spec.hash")) ? readFileSync(hp(ctx, "spec.hash"), "utf8").trim() : "");

/** Records the hash and a snapshot of the spec texts (to diff on change). */
export function freezeSpec(ctx: Ctx) {
  writeFileSync(hp(ctx, "spec.hash"), computeHash(ctx) + "\n");
  for (const [alias, f] of Object.entries(ctx.config.project.specFiles)) {
    if (!existsSync(join(ctx.repo, f))) continue;
    mkdirSync(hp(ctx, "spec-snapshot"), { recursive: true });
    copyFileSync(join(ctx.repo, f), hp(ctx, "spec-snapshot", alias));
  }
}

/** checkpoints/mudanca-spec.md: unified diff + features whose referenced sections changed. */
export async function writeSpecChange(ctx: Ctx) {
  const parts: string[] = ["# Mudança na spec/design detectada\n", "O harness pausou (PAUSED_SPEC_CHANGE). Revise e rode `harness approve` para aceitar.\n"];
  const changed: string[] = [];
  for (const [alias, f] of Object.entries(ctx.config.project.specFiles)) {
    const snap = hp(ctx, "spec-snapshot", alias);
    if (!existsSync(snap)) continue;
    const d = await execa("git", ["diff", "--no-index", "--unified=2", snap, join(ctx.repo, f)], { reject: false });
    if (!d.stdout) continue;
    changed.push(alias);
    parts.push(`## ${alias}\n\n\`\`\`diff\n${String(d.stdout).slice(0, 30000)}\n\`\`\`\n`);
  }
  const affected = loadFeatures(ctx).features.filter((ft) => ft.specRefs.some((r) => changed.includes(r.split("#")[0])));
  parts.push(`## Impacto\n\nArquivos alterados: ${changed.join(", ") || "(somente design)"}\n\nFeatures que referenciam os arquivos alterados (${affected.length}):\n${affected.map((x) => `- ${x.id} [${x.status}] ${x.title}`).join("\n") || "- nenhuma"}\n`);
  mkdirSync(join(ctx.root, "checkpoints"), { recursive: true });
  writeFileSync(join(ctx.root, "checkpoints", "mudanca-spec.md"), parts.join("\n"));
}

// ---------- inbox (questions / risks) ----------

export interface Question { featureId?: string; pergunta: string; escolhido?: string; alternativas?: unknown; impacto?: string }
export interface Risk { featureId?: string; risco: string; probabilidade?: string; impacto?: string; sugestao?: string; status?: string }

export const addQuestion = (ctx: Ctx, q: Question) => appendRow(ctx, "questions", q);
export const addRisk = (ctx: Ctx, r: Risk) => appendRow(ctx, "risks", r);
function appendRow(ctx: Ctx, kind: string, row: object) {
  mkdirSync(hp(ctx, "inbox"), { recursive: true });
  writeFileSync(hp(ctx, "inbox", `${kind}.jsonl`), JSON.stringify({ ts: new Date().toISOString(), ...row }) + "\n", { flag: "a" });
}

export const answeredIds = (ctx: Ctx): string[] => readJson(hp(ctx, "inbox", "answered.json"), []);
export const markAnswered = (ctx: Ctx, ids: string[]) => writeJson(hp(ctx, "inbox", "answered.json"), [...new Set([...answeredIds(ctx), ...ids])]);

/** Open questions, deduplicated, with stable ids Q-<line>. */
export function openQuestions(ctx: Ctx) {
  const done = new Set(answeredIds(ctx));
  const seen = new Set<string>();
  return readJsonl<Question>(hp(ctx, "inbox", "questions.jsonl"))
    .map((q, i) => ({ ...q, id: `Q-${i + 1}` }))
    .filter((q) => q.pergunta && !done.has(q.id) && !seen.has(normText(q.pergunta)) && seen.add(normText(q.pergunta)));
}


export function duvidasMd(ctx: Ctx, stage: number) {
  const groups = Object.entries(openQuestions(ctx).reduce<Record<string, ReturnType<typeof openQuestions>>>((a, q) => ((a[q.featureId ?? "geral"] ??= []).push(q), a), {}));
  const options = (q: Question) => [q.escolhido ?? "-", ...(Array.isArray(q.alternativas) ? q.alternativas : q.alternativas ? [String(q.alternativas)] : [])]
    .map((o, i) => `${String.fromCharCode(65 + i)}) ${o}${i ? "" : " (padrão)"}`).join("\n");
  return `# Dúvidas — etapa ${stage}\n\nResponda na linha \`Resposta:\` com a letra da opção (ex.: \`B\`) ou com texto livre. Itens sem resposta mantêm a opção A (padrão).\n\n` +
    (groups.map(([g, qs]) => `## ${g}\n\n` + qs.map((q) => `### ${q.id}\n**Pergunta:** ${q.pergunta}\n**Impacto:** ${q.impacto ?? "-"}\n${options(q)}\nResposta: \n`).join("\n")).join("\n") || "Nenhuma dúvida aberta.\n");
}

function riscosMd(ctx: Ctx, stage: number) {
  const rs = readJsonl<Risk>(hp(ctx, "inbox", "risks.jsonl"));
  return `# Riscos — etapa ${stage}\n\n| # | Feature | Risco | Prob. | Impacto | Sugestão | Status |\n|---|---|---|---|---|---|---|\n` +
    rs.map((r, i) => `| R-${i + 1} | ${r.featureId ?? "-"} | ${r.risco} | ${r.probabilidade ?? "-"} | ${r.impacto ?? "-"} | ${r.sugestao ?? "-"} | ${r.status ?? "aberto"} |`).join("\n") + "\n";
}

// ---------- checkpoint package ----------

export const checkpointDir = (ctx: Ctx, stage: number, partial = false) => join(ctx.root, "checkpoints", `etapa-${stage}${partial ? "-parcial" : ""}`);

export interface CheckpointInput { stage: number; partialReason?: string; previewUrl?: string; previewNote?: string; screenshots?: string[]; aprendizados?: string; comoTestar?: string; uiVerdict?: string; suiteNote?: string }

export function buildCheckpoint(ctx: Ctx, c: CheckpointInput) {
  const dir = checkpointDir(ctx, c.stage, !!c.partialReason);
  mkdirSync(join(dir, "screenshots"), { recursive: true });
  const all = loadFeatures(ctx);
  const fs = stageFeatures(all, c.stage);
  const evs = readEvents(ctx).filter((e) => e.stage === c.stage);
  const impl = evs.filter((e) => String(e.role).startsWith("implement"));
  const byWorker = impl.reduce<Record<string, { n: number; ok: number }>>((a, e) => {
    const w = (a[e.workerId] ??= { n: 0, ok: 0 });
    w.n++; w.ok += e.outcome === "success" ? 1 : 0;
    return a;
  }, {});
  const ts = evs.map((e) => Date.parse(e.ts!)).filter(Number.isFinite);
  const hours = ts.length ? (Math.max(...ts) - Math.min(...ts)) / 3.6e6 : 0;
  const stageName = ctx.config.stages.find((s) => s.id === c.stage)?.name ?? "";
  for (const s of (c.screenshots ?? []).filter((x) => existsSync(x))) copyFileSync(s, join(dir, "screenshots", basename(s)));
  const passing = fs.filter((f) => f.status === "passing"), blocked = fs.filter((f) => f.status === "blocked"), pending = fs.filter((f) => !["passing", "blocked"].includes(f.status));

  writeFileSync(join(dir, "RELATORIO.md"), [
    `# Relatório — etapa ${c.stage} (${stageName})${c.partialReason ? ` — PARCIAL: ${c.partialReason}` : ""}`,
    `\n**Preview:** ${c.previewUrl ?? c.previewNote ?? "não publicado"}`,
    `\n## Features entregues (${passing.length}/${fs.length})\n`,
    ...passing.map((f) => `- **${f.id}** ${f.title} — ${f.attempts} tentativa(s), US$ ${f.costUsd.toFixed(2)}${f.covers.length ? ` — critérios: ${f.covers.join(", ")}` : ""}\n${f.acceptance.map((a) => `  - [x] ${a}`).join("\n")}`),
    `\n## Bloqueadas (${blocked.length})\n`, ...blocked.map((f) => `- **${f.id}** ${f.title}: ${f.blockedReason ?? "-"}`),
    pending.length ? `\n## Pendentes (${pending.length})\n\n${pending.map((f) => `- ${f.id} ${f.title} [${f.status}]`).join("\n")}` : "",
    `\n## Custo e tempo\n\n- Custo da etapa: US$ ${spent(ctx, { stage: c.stage }).toFixed(2)} (teto US$ ${stageCap(ctx, c.stage)})`,
    `- Custo acumulado: US$ ${spent(ctx, {}, readLedger(ctx)).toFixed(2)} (teto US$ ${ctx.budget.caps.run})`,
    `- Tempo decorrido: ${hours.toFixed(1)} h · chamadas registradas: ${evs.length}`,
    `\n## Workers (implementação)\n\n| Worker | Tentativas | Sucesso |\n|---|---|---|\n${Object.entries(byWorker).map(([w, s]) => `| ${w} | ${s.n} | ${Math.round((100 * s.ok) / s.n)}% |`).join("\n")}`,
    c.suiteNote ? `\n## Suíte completa\n\n${c.suiteNote}` : "",
    c.uiVerdict ? `\n## Avaliação visual completa\n\n${c.uiVerdict}` : "",
    `\n## Aprendizados\n\n${c.aprendizados || "-"}`,
  ].join("\n") + "\n");
  writeFileSync(join(dir, "COMO-TESTAR.md"), `# Como testar — etapa ${c.stage} (${stageName})\n\nPreview: ${c.previewUrl ?? "(local) yarn dev"}\n\n${c.comoTestar ?? "Roteiro não gerado."}\n`);
  writeFileSync(join(dir, "DUVIDAS.md"), duvidasMd(ctx, c.stage));
  writeFileSync(join(dir, "RISCOS.md"), riscosMd(ctx, c.stage));
  if (!existsSync(join(dir, "APROVACAO.md")))
    writeFileSync(join(dir, "APROVACAO.md"), `# Aprovação — etapa ${c.stage} (${stageName})\n\nStatus: (aprovado / ajustes)\n\n## Ajustes\n\n<!-- um ajuste por linha, ex.: "- O botão Registrar agora deve ficar fixo no rodapé no celular" -->\n- \n`);
  return dir;
}

// ---------- preview deploy ----------

export async function deployPreview(ctx: Ctx, stageWt: string, stage: number): Promise<{ url?: string; note: string }> {
  const p = ctx.config.preview;
  if (!p.enabled) return { note: "preview desabilitado na config" };
  const appAbs = join(stageWt, ctx.config.project.appDir);
  const env = { ...gateEnv(ctx), ...(ctx.env.GOOGLE_APPLICATION_CREDENTIALS ? { GOOGLE_APPLICATION_CREDENTIALS: join(ctx.root, ctx.env.GOOGLE_APPLICATION_CREDENTIALS) } : {}) };
  const sh = (cmd: string) => execa(cmd.replaceAll("{stage}", String(stage)), { shell: true, cwd: appAbs, env, extendEnv: false, reject: false, timeout: 15 * 60_000 });
  const b = await sh(p.buildCmd);
  if (b.exitCode !== 0) return { note: `build do preview falhou: ${String(b.stderr).slice(-300)}` };
  const d = await sh(p.deployCmd);
  const url = String(d.stdout).match(/https:\/\/[^\s"]+\.web\.app[^\s"]*/)?.[0];
  if (!url) return { note: `deploy do preview falhou: ${String(d.stderr || d.stdout).slice(-300)}` };
  if (p.demoSeedCmd && ctx.env.HARNESS_ALLOW_DEMO_SEED === "1") await sh(p.demoSeedCmd);
  return { url, note: "ok" };
}

// ---------- approval ----------

export const ApprovalSchema = z.object({
  aprovado: z.boolean(),
  ajustes: z.array(z.union([z.string(), z.object({ titulo: z.string(), descricao: z.string().default(""), criterios: z.array(z.string()).default([]), tags: z.array(z.string()).default([]) })])).default([]),
  respostasDuvidas: z.array(z.object({ id: z.string(), pergunta: z.string().default(""), resposta: z.string() })).default([]),
});
export type Approval = z.infer<typeof ApprovalSchema>;

/** Deterministic parser, used when no model is available or as a cross-check. */
/** "B" or "B, but ..." -> the text of option B of that question in DUVIDAS.md (plus any remark); free text as is. */
export function resolveAnswer(duvidas: string, id: string, resposta: string) {
  const [, letter, rest] = resposta.trim().match(/^([A-Z])(?![\p{L}\d])[).:,\s-]*(.*)$/iu) ?? [];
  const block = duvidas.split(new RegExp(`^###\\s*${id}\\s*$`, "m"))[1]?.split(/^###\s/m)[0] ?? "";
  const opt = letter && block.match(new RegExp(`^${letter.toUpperCase()}\\)\\s*(.+?)(?: \\(padrão\\))?$`, "m"))?.[1];
  return opt ? `${opt}${rest ? ` — ${rest}` : ""}` : resposta.trim();
}

export function parseApprovalFiles(aprovacao: string, duvidas: string): Approval {
  const status = aprovacao.match(/^Status:\s*(.+)$/im)?.[1]?.toLowerCase() ?? "";
  const ajustes = (aprovacao.split(/^##\s*Ajustes/im)[1] ?? "").split("\n").map((l) => l.match(/^\s*[-*]\s+(.+)$/)?.[1]?.trim()).filter((x): x is string => !!x);
  const respostasDuvidas = [...duvidas.matchAll(/^###\s*(Q-\d+)\n\*\*Pergunta:\*\*\s*(.*)\n[\s\S]*?^Resposta:[ \t]*(.*)$/gm)]
    .filter((m) => m[3].trim()).map((m) => ({ id: m[1], pergunta: m[2], resposta: resolveAnswer(duvidas, m[1], m[3]) }));
  return { aprovado: /aprovad/.test(status) && !/ajuste/.test(status), ajustes, respostasDuvidas };
}
