import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { Ctx } from "./config.js";
import type { Feature } from "./features.js";
import type { GateReport } from "./gates/run-gates.js";
import { NoWorkerError, type Runtime } from "./invoke.js";
import { designRefs, HARNESS_DIR, render } from "./prompts.js";

const Issue = z.object({
  severidade: z.enum(["blocker", "major", "minor"]).catch("major"),
  arquivo: z.string().default(""),
  descricao: z.string(),
  sugestao: z.string().default(""),
});
export const ReviewCodeSchema = z.object({ pass: z.boolean(), score: z.number().min(0).max(10), issues: z.array(Issue).default([]) });
export const ReviewUiSchema = z.object({ pass: z.boolean(), score: z.number().min(0).max(10), porCriterio: z.record(z.string(), z.number()).default({}), issues: z.array(z.any()).default([]) });
export const TriageSchema = z.object({ causaRaiz: z.string(), categoria: z.enum(["test", "type", "lint", "logic", "env", "flaky", "design"]).catch("logic"), padrao: z.boolean(), dica: z.string() });
export const JudgeSchema = z.object({ winner: z.number().int().min(0), reason: z.string().default("") });
export const FeaturesReviewSchema = z.object({ pass: z.boolean(), issues: z.array(z.string()).default([]) });

export interface Verdict { kind: "code" | "ui" | "features"; pass: boolean; score: number; issues: unknown[]; workerId?: string; porCriterio?: Record<string, number> }

export const CRITICAL_UI = ["c1", "c2", "c3"];
export const codeRules = (r: z.infer<typeof ReviewCodeSchema>) => r.pass && r.score >= 7 && !r.issues.some((i) => i.severidade === "blocker");
export const uiRules = (r: z.infer<typeof ReviewUiSchema>) => r.pass && r.score >= 7.5 && CRITICAL_UI.every((c) => (r.porCriterio[c] ?? 10) >= 6);

interface Base { rt: Runtime; f: Pick<Feature, "id" | "stage" | "tags">; cwd: string; attempt: number; implementerFamily: string }

/** Calls a reviewer of another family; an unusable answer is retried once with a different reviewer. */
async function review<T>(b: Base, role: "review_code" | "review_ui", prompt: string, schema: z.ZodType<T>, attachments?: string[], excludeFamilies = [b.implementerFamily]) {
  const tried: string[] = [];
  for (let i = 0; i < 2; i++) {
    try {
      const r = await b.rt.invoke({ role, taskId: b.f.id, featureId: b.f.id.startsWith("F-") ? b.f.id : undefined, stage: b.f.stage, attempt: b.attempt, cwd: b.cwd, prompt, schema, attachments, tags: b.f.tags, excludeFamilies, excludeWorkers: tried });
      if (r.data) return { data: r.data, workerId: r.worker.id };
      tried.push(r.worker.id);
    } catch (e) {
      if (e instanceof NoWorkerError) break;
      throw e;
    }
  }
  return undefined;
}

const noReviewer = (kind: Verdict["kind"]): Verdict => ({ kind, pass: false, score: 0, issues: [{ severidade: "blocker", descricao: "nenhum avaliador de outra família respondeu com JSON válido" }] });

export async function reviewCode(b: Base & { ctx: Ctx; feature: Feature; diff: string; gates: GateReport }): Promise<Verdict> {
  const prompt = render(b.ctx, "review_code", {
    feature: JSON.stringify({ id: b.feature.id, title: b.feature.title, description: b.feature.description, acceptance: b.feature.acceptance, specRefs: b.feature.specRefs }, null, 2),
    diff: b.diff.slice(0, 60000),
    gateReport: b.gates.results.map((r) => `${r.id} ${r.name}: ${r.skipped ? "pulado" : r.ok ? "ok" : "FALHOU"}`).join("\n"),
  }, b.f.tags);
  const r = await review(b, "review_code", prompt, ReviewCodeSchema);
  return r ? { kind: "code", pass: codeRules(r.data), score: r.data.score, issues: r.data.issues, workerId: r.workerId } : noReviewer("code");
}

const rubric = () => readFileSync(join(HARNESS_DIR, "rubrics", "design.md"), "utf8");

export async function reviewUi(b: Base & { ctx: Ctx; title: string; screenshots: string[] }): Promise<Verdict> {
  const d = designRefs(b.ctx);
  const tokensPath = join(b.ctx.root, d.tokens);
  const prompt = render(b.ctx, "review_ui", {
    feature: `${b.f.id} — ${b.title}`,
    rubric: rubric(),
    tokens: existsSync(tokensPath) ? readFileSync(tokensPath, "utf8").slice(0, 8000) : "(tokens.json ausente)",
    screenshots: b.screenshots.join("\n"),
    mockups: d.screens.join("\n"),
  }, b.f.tags);
  const attachments = [...b.screenshots, ...d.screens.map((s) => join(b.ctx.root, s))].slice(0, 40);
  const r = await review(b, "review_ui", prompt, ReviewUiSchema, attachments);
  return r ? { kind: "ui", pass: uiRules(r.data), score: r.data.score, issues: r.data.issues, porCriterio: r.data.porCriterio, workerId: r.workerId } : noReviewer("ui");
}

/** INIT: features.json is reviewed by a family different from the initializer's. */
export async function reviewFeatures(b: Base & { ctx: Ctx; featuresJson: string; acceptance: string }): Promise<Verdict> {
  const prompt = render(b.ctx, "review_features", { featuresJson: b.featuresJson.slice(0, 80000), acceptance: b.acceptance });
  const r = await review(b, "review_code", prompt, FeaturesReviewSchema);
  return r ? { kind: "features", pass: r.data.pass, score: r.data.pass ? 10 : 0, issues: r.data.issues, workerId: r.workerId } : noReviewer("features");
}

/** Tournament judge: picks the best of the diffs (index), judged by a family not among the contenders. */
export async function judge(b: Base & { ctx: Ctx; feature: Feature; diffs: string[]; families: string[] }): Promise<number> {
  const prompt = render(b.ctx, "judge", {
    feature: JSON.stringify({ id: b.feature.id, title: b.feature.title, acceptance: b.feature.acceptance }, null, 2),
    diffs: b.diffs.map((d, i) => `### Candidato ${i}\n\`\`\`diff\n${d.slice(0, 30000)}\n\`\`\``).join("\n\n"),
  }, b.f.tags);
  try {
    const r = await b.rt.invoke({ role: "review_code", taskId: b.f.id, featureId: b.f.id, stage: b.f.stage, attempt: b.attempt, cwd: b.cwd, prompt, schema: JudgeSchema, excludeFamilies: b.families, tags: b.f.tags });
    return r.data && r.data.winner < b.diffs.length ? r.data.winner : 0;
  } catch (e) {
    if (e instanceof NoWorkerError) return 0;
    throw e;
  }
}

export const formatIssues = (vs: Verdict[]) =>
  vs.filter((v) => !v.pass).map((v) => `Avaliação ${v.kind} reprovou (nota ${v.score}):\n${v.issues.map((i: any) => `- [${i.severidade ?? "?"}] ${i.arquivo ?? ""} ${i.descricao ?? JSON.stringify(i)}${i.sugestao ? ` → ${i.sugestao}` : ""}`).join("\n")}`).join("\n\n");
