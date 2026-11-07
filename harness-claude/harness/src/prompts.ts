import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { Ctx } from "./config.js";
import { type Feature, loadFeatures } from "./features.js";
import { loadProtected } from "./gates/protected.js";
import { selectLessons } from "./learning.js";
import { hp, walk } from "./state.js";

export const HARNESS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Extracts the last JSON object of an agent answer (```json block or trailing {...}). */
/** Every JSON object a model answer may hold, most likely first: fenced blocks, then top-level {...} spans, last to first.
 *  Models vary a lot (prose around, several blocks, trailing commas, English keys), so callers validate each against a schema. */
export function jsonCandidates(text: string): unknown[] {
  const raw = [...text.matchAll(/```(?:json)?\s*\n([\s\S]*?)```/g)].map((m) => m[1]).reverse();
  const t = text.slice(-40000);
  const spans: string[] = [];
  let depth = 0, start = -1, str = false, esc = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (str) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') str = false; continue; }
    if (c === '"') str = true;
    else if (c === "{") { if (depth++ === 0) start = i; }
    else if (c === "}" && depth > 0 && --depth === 0) spans.push(t.slice(start, i + 1));
  }
  const out: unknown[] = [];
  for (const s of [...raw, ...spans.reverse()]) {
    for (const v of [s, s.replace(/,\s*([}\]])/g, "$1")]) {   // tolerate trailing commas
      try { out.push(JSON.parse(v)); break; } catch { /* next */ }
    }
  }
  return out;
}

export const extractJson = (text: string): unknown => jsonCandidates(text)[0];

// English (or variant) keys models use instead of the Portuguese ones of the schemas
const KEY_ALIASES: Record<string, string> = {
  severity: "severidade", file: "arquivo", path: "arquivo", description: "descricao", descrição: "descricao", suggestion: "sugestao", sugestão: "sugestao",
  screen: "tela", passed: "pass", approved: "pass", rootCause: "causaRaiz", root_cause: "causaRaiz", category: "categoria", pattern: "padrao", padrão: "padrao",
  hint: "dica", tip: "dica", answers: "respostasDuvidas", adjustments: "ajustes", criteria: "porCriterio",
};
export function aliasKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(aliasKeys);
  if (!v || typeof v !== "object") return v;
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k in KEY_ALIASES && !(KEY_ALIASES[k] in v) ? KEY_ALIASES[k] : k, aliasKeys(x)]));
}

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Text of a spec section from a ref like "spec.md#4.4" or "spec.md#10-criterios-de-aceite". */
export function specSection(ctx: Ctx, ref: string): string {
  const [alias, anchor = ""] = ref.split("#");
  const file = ctx.config.project.specFiles[alias] ?? alias;
  if (!existsSync(join(ctx.repo, file))) return "";
  const lines = readFileSync(join(ctx.repo, file), "utf8").split("\n");
  const a = slug(anchor);
  const start = lines.findIndex((l) => {
    const h = l.match(/^(#+)\s+(.*)$/);
    if (!h) return false;
    const s = slug(h[2]);
    return a !== "" && (s === a || s.startsWith(a + "-") || s.startsWith(a.replace(/\./g, "-") + "-"));
  });
  if (start < 0) return "";
  const level = lines[start].match(/^#+/)![0].length;
  const end = lines.findIndex((l, i) => i > start && /^#+\s/.test(l) && l.match(/^#+/)![0].length <= level);
  return lines.slice(start, end < 0 ? undefined : end).join("\n").trim();
}

/** Acceptance criteria checkboxes of the spec, numbered AC-01, AC-02… */
export function acceptanceCriteria(ctx: Ctx) {
  const alias = Object.keys(ctx.config.project.specFiles)[0];
  return specSection(ctx, `${alias}#${ctx.config.project.acceptanceSection}`).split("\n")
    .filter((l) => /^\s*-\s*\[[ x]\]/.test(l))
    .map((l, i) => ({ id: `AC-${String(i + 1).padStart(2, "0")}`, text: l.replace(/^\s*-\s*\[[ x]\]\s*/, "") }));
}

const tail = (file: string, n: number) => (existsSync(file) ? readFileSync(file, "utf8").split("\n").slice(-n).join("\n") : "");

/** Design inputs anywhere under designDir: mockup images, per-screen HTML and the tokens file (tokens.json or DESIGN.md). */
export function designRefs(ctx: Ctx) {
  const files = [...walk(join(ctx.repo, ctx.config.project.designDir))].map((f) => relative(ctx.repo, f)).sort();
  const find = (re: RegExp) => files.find((f) => re.test(f));
  return {
    screens: files.filter((f) => /\.(png|jpe?g|webp)$/i.test(f)),
    html: files.filter((f) => f.endsWith(".html")),
    tokens: find(/(^|\/)tokens\.json$/) ?? find(/(^|\/)DESIGN\.md$/) ?? join(ctx.config.project.designDir, "tokens.json"),
  };
}

/** Scope guard: features still to be built, in this stage or later (their screens/flows are not this feature's job). */
export const otherFeatures = (ctx: Ctx, f: Pick<Feature, "id" | "stage">) =>
  loadFeatures(ctx).features.filter((x) => x.id !== f.id && x.status !== "passing" && x.stage >= f.stage)
    .map((x) => `- ${x.id} (etapa ${x.stage}) ${x.title}`).join("\n") || "(nenhuma)";

/** What G7 checks: tests nobody may edit, and tests of delivered features that may only gain cases. */
const protectedList = (ctx: Ctx, f: Feature) => {
  const passing = new Set(loadFeatures(ctx).features.filter((x) => x.status === "passing").map((x) => x.id));
  const reg = Object.entries(loadProtected(ctx)).filter(([p, e]) => passing.has(e.featureId) && !f.protectedTests.includes(p));
  const fixed = [...f.protectedTests, ...reg.filter(([, e]) => !e.additive).map(([p]) => p)];
  const grow = reg.filter(([, e]) => e.additive).map(([p]) => p);
  return `${fixed.join("\n") || "(nenhum)"}${grow.length ? `\n- Testes de features já entregues: pode acrescentar casos, mas não remova, renomeie nem enfraqueça os existentes:\n${grow.join("\n")}` : ""}`;
};

/** Standard context of a feature task. */
export function featureVars(ctx: Ctx, f: Feature, extra: Record<string, string> = {}) {
  const refs = [...new Set(f.specRefs)].map((r) => `<!-- ${r} -->\n${specSection(ctx, r)}`).join("\n\n").slice(0, 16000);
  const d = designRefs(ctx);
  return {
    feature: JSON.stringify({ ...f, history: undefined }, null, 2),
    specExcerpts: refs || "(sem trechos; leia os arquivos da spec)",
    designRefs: [d.tokens, ...d.screens].join("\n"),
    progress: tail(hp(ctx, "progress.md"), 40),
    protectedFiles: protectedList(ctx, f),
    otherFeatures: otherFeatures(ctx, f),
    tags: f.tags.join(", "),
    ...extra,
  };
}

/** Template of the role + common rules + filtered lessons. */
export function render(ctx: Ctx, role: string, vars: Record<string, string>, tags: string[] = []): string {
  const read = (n: string) => (existsSync(join(HARNESS_DIR, "prompts", `${n}.md`)) ? readFileSync(join(HARNESS_DIR, "prompts", `${n}.md`), "utf8") : "");
  const body = role === "implement_hard" ? `${read("implement")}\n${read("implement_hard")}` : role === "implement_easy" ? read("implement") : read(role);
  const lessons = selectLessons(ctx, role, tags).map((l) => `- [${l.id}] ${l.rule}`).join("\n") || "(nenhuma)";
  const all: Record<string, string> = {
    specFiles: Object.entries(ctx.config.project.specFiles).map(([a, f]) => `${a} -> ${f}`).join("\n"),
    decisionsFile: ctx.config.project.decisionsFile,
    appDir: ctx.config.project.appDir,
    designDir: ctx.config.project.designDir,
    designTokens: designRefs(ctx).tokens,
    ...vars,
    lessons,
  };
  return `${read("_common")}\n\n${body}`.replace(/\{\{(\w+)\}\}/g, (_, k) => all[k] ?? "");
}
