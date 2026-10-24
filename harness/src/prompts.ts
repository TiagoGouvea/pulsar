import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Ctx } from "./config.js";
import type { Feature } from "./features.js";
import { selectLessons } from "./learning.js";
import { hp } from "./state.js";

export const HARNESS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Extracts the last JSON object of an agent answer (```json block or trailing {...}). */
export function extractJson(text: string): unknown {
  const blocks = [...text.matchAll(/```(?:json)?\s*\n([\s\S]*?)```/g)].map((m) => m[1]);
  for (const b of blocks.reverse()) {
    try { return JSON.parse(b); } catch { /* next */ }
  }
  const t = text.slice(-20000);
  const end = t.lastIndexOf("}");
  let tries = 0;
  for (let start = t.lastIndexOf("{", end); start >= 0 && tries++ < 500; start = t.lastIndexOf("{", start - 1)) {
    try { return JSON.parse(t.slice(start, end + 1)); } catch { /* widen */ }
  }
  return undefined;
}

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Text of a spec section from a ref like "spec.md#4.4" or "spec.md#10-criterios-de-aceite". */
export function specSection(ctx: Ctx, ref: string): string {
  const [alias, anchor = ""] = ref.split("#");
  const file = ctx.config.project.specFiles[alias] ?? alias;
  if (!existsSync(join(ctx.root, file))) return "";
  const lines = readFileSync(join(ctx.root, file), "utf8").split("\n");
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

export function designRefs(ctx: Ctx) {
  const dir = join(ctx.root, ctx.config.project.designDir, "screens");
  const screens = existsSync(dir) ? readdirSync(dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).map((f) => join(ctx.config.project.designDir, "screens", f)) : [];
  return { screens, tokens: join(ctx.config.project.designDir, "tokens.json") };
}

/** Standard context of a feature task. */
export function featureVars(ctx: Ctx, f: Feature, extra: Record<string, string> = {}) {
  const refs = [...new Set(f.specRefs)].map((r) => `<!-- ${r} -->\n${specSection(ctx, r)}`).join("\n\n").slice(0, 16000);
  const d = designRefs(ctx);
  return {
    feature: JSON.stringify({ ...f, history: undefined }, null, 2),
    specExcerpts: refs || "(sem trechos; leia os arquivos da spec)",
    designRefs: [d.tokens, ...d.screens].join("\n"),
    progress: tail(hp(ctx, "progress.md"), 40),
    protectedFiles: f.protectedTests.join("\n") || "(nenhum)",
    tags: f.tags.join(", "),
    ...extra,
  };
}

/** Template of the role + common rules + filtered lessons. */
export function render(ctx: Ctx, role: string, vars: Record<string, string>, tags: string[] = []): string {
  const read = (n: string) => (existsSync(join(HARNESS_DIR, "prompts", `${n}.md`)) ? readFileSync(join(HARNESS_DIR, "prompts", `${n}.md`), "utf8") : "");
  const body = role === "implement_hard" ? `${read("implement")}\n${read("implement_hard")}` : read(role);
  const lessons = selectLessons(ctx, role, tags).map((l) => `- [${l.id}] ${l.rule}`).join("\n") || "(nenhuma)";
  const all: Record<string, string> = {
    specFiles: Object.entries(ctx.config.project.specFiles).map(([a, f]) => `${a} -> ${f}`).join("\n"),
    decisionsFile: ctx.config.project.decisionsFile,
    appDir: ctx.config.project.appDir,
    ...vars,
    lessons,
  };
  return `${read("_common")}\n\n${body}`.replace(/\{\{(\w+)\}\}/g, (_, k) => all[k] ?? "");
}
