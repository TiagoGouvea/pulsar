import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "../config.js";
import { runProcess } from "../adapters/exec.js";
import { git } from "../git.js";
import { mutex } from "../state.js";
import { gateEnv } from "./browser.js";
import { privacyGate } from "./privacy-leak.js";
import { checkProtected } from "./protected.js";
import { a11yGate, layoutGate, lighthouseGate } from "./quality.js";

export interface GateResult { id: string; name: string; ok: boolean; required: boolean; skipped?: string; durationMs: number; output: string }
export interface GateReport { ok: boolean; mode: "feature" | "stage"; stage: number; failed: string[]; results: GateResult[] }
export interface GateOpts { stage: number; mode: "feature" | "stage"; base?: string; only?: string[]; featureId?: string }
export type RunGates = (ctx: Ctx, cwd: string, o: GateOpts) => Promise<GateReport>;

const SECRET_PATTERNS = [
  /sk-ant-[A-Za-z0-9_-]{20,}/, /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/, /AIza[0-9A-Za-z_-]{35}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{36,}/, /\bxox[abpr]-[A-Za-z0-9-]{10,}/, /"private_key"\s*:/,
];

/** G13: added lines of the diff must not contain key patterns, real .env values or .env files. */
export async function scanSecrets(ctx: Ctx, cwd: string, base?: string) {
  const ref = base ?? (await git(cwd, "rev-list", "--max-parents=0", "HEAD")).split("\n")[0];
  const d = await git(cwd, "diff", ref, "--", ".", ":(exclude).harness");
  const values = Object.values(ctx.env).filter((v): v is string => !!v && v.length >= 12 && !/^https?:\/\//.test(v));
  const problems: string[] = [];
  let fileName = "";
  for (const l of d.split("\n")) {
    if (l.startsWith("+++ ")) {
      fileName = l.slice(6);
      if (/(^|\/)\.env(\.|$)/.test(fileName) && !fileName.endsWith(".env.example")) problems.push(`${fileName}: arquivo .env não pode ser versionado`);
    } else if (l.startsWith("+") && (SECRET_PATTERNS.some((p) => p.test(l)) || values.some((v) => l.includes(v)))) {
      problems.push(`${fileName}: possível segredo: ${l.slice(0, 40)}…`);
    }
  }
  return { ok: !problems.length, output: problems.join("\n") || "nenhum segredo no diff" };
}

/** Gates share emulators/ports, so gate runs are serialized across parallel tasks. */
const serialized = mutex();

export const runGates: RunGates = (ctx, cwd, o) => serialized(async () => {
  const appAbs = join(cwd, ctx.config.project.appDir);
  const results: GateResult[] = [];
  for (const [id, g] of Object.entries(ctx.config.gates)) {
    if (o.only && !o.only.includes(id)) continue;
    const skip = o.stage < g.fromStage ? `a partir da etapa ${g.fromStage}` : g.scope === "stage" && o.mode === "feature" ? "só no fim de etapa" : undefined;
    const start = Date.now();
    if (skip) { results.push({ id, name: g.name, ok: true, required: g.required, skipped: skip, durationMs: 0, output: "" }); continue; }
    let r: { ok: boolean; output: string };
    try {
      if (g.builtin === "protected") r = await checkProtected(ctx, cwd, o.featureId);
      else if (g.builtin === "secrets") r = await scanSecrets(ctx, cwd, o.base);
      else if (!existsSync(appAbs)) r = { ok: false, output: `${ctx.config.project.appDir}/ não existe` };
      else if (g.builtin === "privacy") r = await privacyGate(ctx, appAbs);
      else if (g.builtin === "a11y") r = await a11yGate(ctx, appAbs);
      else if (g.builtin === "layout") r = await layoutGate(ctx, appAbs);
      else if (g.builtin === "lighthouse") r = await lighthouseGate(ctx, appAbs);
      else {
        const p = await runProcess("sh", ["-c", g.cmd!], { cwd: appAbs, env: gateEnv(ctx), timeoutMs: 30 * 60_000 });
        r = { ok: p.exitCode === 0 && !p.timedOut, output: (p.timedOut ? "TIMEOUT\n" : "") + p.all.slice(-6000) };
      }
    } catch (e) {
      r = { ok: false, output: String((e as Error).message ?? e) };
    }
    results.push({ id, name: g.name, required: g.required, durationMs: Date.now() - start, ...r });
  }
  const failed = results.filter((r) => !r.ok && r.required).map((r) => r.id);
  return { ok: failed.length === 0, mode: o.mode, stage: o.stage, failed, results };
});
