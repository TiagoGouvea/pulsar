// G7: acceptance tests are immutable for implementers.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { Ctx } from "../config.js";
import { loadFeatures } from "../features.js";
import { git } from "../git.js";
import { hp, readJson, writeJson } from "../state.js";

interface Entry { sha256: string; asserts: number; featureId: string }
type Registry = Record<string, Entry>;

const file = (ctx: Ctx) => hp(ctx, "protected.json");
export const loadProtected = (ctx: Ctx): Registry => readJson(file(ctx), {});
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const countAsserts = (s: string) => (s.match(/\bexpect(\.soft)?\(|\bassert[.(]/g) ?? []).length;
const FORBIDDEN = /\b(?:test|it|describe)\.(?:skip|only|fixme|todo)\b|\b(?:xit|xdescribe|fit|fdescribe)\(|\btest\.fixme\b/;
export const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;

/** Records hash + assert count of the protected tests (paths relative to the repo root). */
export function registerProtected(ctx: Ctx, cwd: string, featureId: string, files: string[]) {
  const reg = loadProtected(ctx);
  for (const f of files) {
    const p = join(cwd, f);
    if (!existsSync(p)) throw new Error(`teste protegido ${f} não existe`);
    const c = readFileSync(p, "utf8");
    reg[f] = { sha256: sha(c), asserts: countAsserts(c), featureId };
  }
  writeJson(file(ctx), reg);
}

function* walk(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", ".git", "coverage", "test-results"].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

/** Checks tests of merged (passing) features plus the current feature's own tests. */
export async function checkProtected(ctx: Ctx, cwd: string, featureId?: string): Promise<{ ok: boolean; output: string }> {
  const problems: string[] = [];
  const merged = new Set(loadFeatures(ctx).features.filter((f) => f.status === "passing").map((f) => f.id));
  for (const [f, e] of Object.entries(loadProtected(ctx)).filter(([, e]) => e.featureId === featureId || merged.has(e.featureId))) {
    const p = join(cwd, f);
    if (!existsSync(p)) {
      // only a violation if the file was ever part of this branch (a feature merged meanwhile is not)
      if (e.featureId === featureId || (await git(cwd, "rev-list", "-1", "HEAD", "--", f).catch(() => ""))) problems.push(`${f}: removido`);
      continue;
    }
    const c = readFileSync(p, "utf8");
    if (sha(c) !== e.sha256) problems.push(`${f}: alterado (asserts ${e.asserts} -> ${countAsserts(c)})`);
  }
  for (const p of walk(join(cwd, ctx.config.project.appDir))) {
    if (!TEST_FILE.test(p)) continue;
    const bad = readFileSync(p, "utf8").split("\n").findIndex((l) => FORBIDDEN.test(l));
    if (bad >= 0) problems.push(`${relative(cwd, p)}:${bad + 1}: uso proibido de skip/only/fixme`);
  }
  return { ok: problems.length === 0, output: problems.join("\n") || "testes protegidos íntegros" };
}
