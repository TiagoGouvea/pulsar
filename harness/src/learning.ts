import { existsSync, readFileSync } from "node:fs";
import { parse, stringify } from "yaml";
import { z } from "zod";
import type { Ctx } from "./config.js";
import { hp, writeAtomic } from "./state.js";

export const LessonSchema = z.object({
  id: z.string(),
  scope: z.object({ roles: z.array(z.string()).default([]), tags: z.array(z.string()).default([]) }),
  rule: z.string().min(5),
  evidence: z.array(z.string()).min(1),
  added: z.string(),
  hits: z.number().default(0),
  helped: z.number().default(0),
  helpedRate: z.number().nullable().default(null),
  status: z.enum(["active", "retired", "promoted"]).default("active"),
});
export type Lesson = z.infer<typeof LessonSchema>;
export type LessonFile = "project" | "harness";

const MAX_ACTIVE = 60;
const HEADER: Record<LessonFile, string> = {
  project: "# Lições do projeto (geradas pelo harness). Formato YAML.\n",
  harness: "# Lições do harness — sobrevivem entre projetos. Formato YAML.\n",
};

const path = (ctx: Ctx, f: LessonFile) => hp(ctx, "lessons", `${f}.md`);

export function loadLessons(ctx: Ctx, f: LessonFile): Lesson[] {
  if (!existsSync(path(ctx, f))) return [];
  const data = parse(readFileSync(path(ctx, f), "utf8")) ?? [];
  return z.array(LessonSchema).parse(data);
}
export const saveLessons = (ctx: Ctx, f: LessonFile, ls: Lesson[]) =>
  writeAtomic(path(ctx, f), HEADER[f] + (ls.length ? stringify(ls) : "[]\n"));

const all = (ctx: Ctx) => [...loadLessons(ctx, "project"), ...loadLessons(ctx, "harness")];
const norm = (s: string) => s.toLowerCase().replace(/\W+/g, " ").trim();

/** Adds a lesson. Lessons without evidence or duplicated rules are rejected. */
export function addLesson(ctx: Ctx, l: { scope?: Lesson["scope"]; rule: string; evidence: string[] }, file: LessonFile = "project"): Lesson | null {
  if (!l.evidence?.length || !l.rule?.trim()) return null;
  if (all(ctx).some((x) => x.status !== "retired" && norm(x.rule) === norm(l.rule))) return null;
  const n = Math.max(0, ...all(ctx).map((x) => Number(x.id.slice(2)) || 0)) + 1;
  const lesson = LessonSchema.parse({
    id: `L-${String(n).padStart(3, "0")}`, scope: l.scope ?? { roles: [], tags: [] }, rule: l.rule.trim(),
    evidence: l.evidence, added: new Date().toISOString().slice(0, 10),
  });
  const ls = [...loadLessons(ctx, file), lesson];
  saveLessons(ctx, file, enforceMax(ls));
  return lesson;
}

/** Keeps at most MAX_ACTIVE active lessons per file, retiring the least effective. */
function enforceMax(ls: Lesson[]) {
  const active = ls.filter((l) => l.status === "active").sort((a, b) => (a.helpedRate ?? 0.5) - (b.helpedRate ?? 0.5));
  for (const l of active.slice(0, Math.max(0, active.length - MAX_ACTIVE))) l.status = "retired";
  return ls;
}

const roleMatches = (scopeRoles: string[], role: string) =>
  !scopeRoles.length || scopeRoles.includes(role) || (role === "implement_hard" && scopeRoles.includes("implement"));

/** Active lessons for a role/tags, best helpedRate then most recent, max 10. */
export function selectLessons(ctx: Ctx, role: string, tags: string[], max = 10): Lesson[] {
  return all(ctx)
    .filter((l) => l.status === "active" && roleMatches(l.scope.roles, role) && (!l.scope.tags.length || l.scope.tags.some((t) => tags.includes(t))))
    .sort((a, b) => (b.helpedRate ?? 0.5) - (a.helpedRate ?? 0.5) || b.added.localeCompare(a.added))
    .slice(0, max);
}

/** Updates hits/helpedRate of injected lessons; applies retirement (>=8 hits, <0.3) and promotion (>=5 hits, >=0.7). */
export function recordLessonOutcome(ctx: Ctx, ids: string[], helped: boolean) {
  if (!ids.length) return;
  for (const f of ["project", "harness"] as const) {
    const ls = loadLessons(ctx, f);
    let changed = false;
    for (const l of ls.filter((x) => ids.includes(x.id))) {
      l.hits++;
      l.helped += helped ? 1 : 0;
      l.helpedRate = l.helped / l.hits;
      if (l.status === "active" && l.hits >= 8 && l.helpedRate < 0.3) l.status = "retired";
      else if (l.status === "active" && l.hits >= 5 && l.helpedRate >= 0.7) l.status = "promoted";
      changed = true;
    }
    if (changed) saveLessons(ctx, f, ls);
  }
}

export const RetroSchema = z.object({
  create: z.array(z.object({ scope: LessonSchema.shape.scope.optional(), rule: z.string(), evidence: z.array(z.string()), file: z.enum(["project", "harness"]).optional() })).default([]),
  edit: z.array(z.object({ id: z.string(), rule: z.string() })).default([]),
  retire: z.array(z.string()).default([]),
  promote: z.array(z.string()).default([]),
  aprendizados: z.string().default(""),
  comoTestar: z.string().optional(),
});
export type Retro = z.infer<typeof RetroSchema>;

/** Applies the retro output to the lesson files. */
export function applyRetro(ctx: Ctx, r: Retro) {
  for (const f of ["project", "harness"] as const) {
    const ls = loadLessons(ctx, f);
    for (const l of ls) {
      const e = r.edit.find((x) => x.id === l.id);
      if (e) l.rule = e.rule;
      if (r.retire.includes(l.id)) l.status = "retired";
      if (r.promote.includes(l.id)) l.status = "promoted";
    }
    saveLessons(ctx, f, ls);
  }
  return r.create.map((c) => addLesson(ctx, c, c.file ?? "project")).filter(Boolean) as Lesson[];
}

export const promotedLessons = (ctx: Ctx) => all(ctx).filter((l) => l.status === "promoted");

export const PostmortemSchema = z.object({
  proposals: z.array(z.object({ id: z.string().regex(/^[\w-]+$/), title: z.string(), rationale: z.string().default(""), diff: z.string() })).default([]),
});
