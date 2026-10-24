import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, platform, totalmem } from "node:os";
import { join } from "node:path";
import { execa } from "execa";
import { z } from "zod";
import { baseEnv } from "./adapters/exec.js";
import { requiredEnv } from "./adapters/index.js";
import { type Ctx, enabledWorkers, PLACEHOLDER, providerOf } from "./config.js";
import { loadFeatures, uncovered } from "./features.js";
import * as g from "./git.js";
import { Runtime } from "./invoke.js";
import { logEvent } from "./logger.js";
import { acceptanceCriteria, designRefs } from "./prompts.js";
import { recordStats } from "./router.js";
import { hp } from "./state.js";

type Level = "ok" | "warn" | "fail" | "info";
interface Check { level: Level; item: string; detail: string }

const sh = (cmd: string, args: string[], cwd?: string, timeout = 30_000) =>
  execa(cmd, args, { cwd, env: baseEnv(), extendEnv: false, reject: false, timeout });

async function version(bin: string) {
  const r = await sh(bin, ["--version"]).catch(() => undefined);
  return r && r.exitCode === 0 ? String(r.stdout || r.stderr).split("\n")[0].trim() : undefined;
}

export async function doctor(ctx: Ctx, o: { auth?: boolean; emulators?: boolean } = {}): Promise<{ ok: boolean; checks: Check[] }> {
  const checks: Check[] = [];
  const add = (level: Level, item: string, detail: string) => checks.push({ level, item, detail });
  const workers = enabledWorkers(ctx).filter((w) => w.cli !== "fake");
  const clis = new Set<string>(workers.map((w) => w.cli));

  // binaries
  const bins: [string, boolean, string][] = [
    ["node", true, "instale Node LTS"], ["npm", true, ""], ["yarn", true, "npm i -g yarn (os gates do app usam yarn)"], ["git", true, ""],
    ["java", true, "brew install openjdk (emuladores do Firebase)"], ["firebase", true, "npm i -g firebase-tools"],
    ...(["claude", "codex", "gemini", "pi"] as const).map((c): [string, boolean, string] => [c, clis.has(c), c === "gemini" ? "npm i -g @google/gemini-cli" : `instale a CLI ${c}`]),
  ];
  for (const [b, required, hint] of bins) {
    const v = await version(b);
    if (v) add("ok", `bin ${b}`, v);
    else add(required ? "fail" : "info", `bin ${b}`, required ? `não encontrado — ${hint}` : "não usado por workers habilitados");
  }
  const pwCache = join(homedir(), platform() === "darwin" ? "Library/Caches/ms-playwright" : ".cache/ms-playwright");
  add(existsSync(pwCache) && readdirSync(pwCache).some((d) => d.startsWith("chromium")) ? "ok" : "fail", "playwright browsers", existsSync(pwCache) ? pwCache : "rode `npx playwright install chromium`");

  // workers config + env
  for (const w of workers) {
    if (w.model.includes(PLACEHOLDER)) add("fail", `worker ${w.id}`, `model "${w.model}" — preencha em harness.config.yaml (ou enabled: false)`);
    const missing = requiredEnv(w).filter((src) => !ctx.env[src]);
    if (missing.length) add("fail", `env ${w.id}`, `faltando no .env: ${[...new Set(missing)].join(", ")}`);
    const p = ctx.prices[w.id];
    if (w.billing === "api" && !(p && typeof p.input === "number" && typeof p.output === "number")) add("fail", `preço ${w.id}`, "preencha input/output (USD por 1M tokens) em prices.yaml");
  }
  if (!existsSync(join(ctx.root, ".env"))) add("fail", ".env", "copie .env.example para .env e preencha as chaves");
  add("info", "segurança", "rode o harness num usuário dedicado do macOS ou num devcontainer; workers só recebem as vars injetadas");

  // auth (minimal real call per provider)
  if (o.auth !== false) {
    const rt = new Runtime(ctx);
    const seen = new Set<string>();
    for (const w of workers) {
      const prov = providerOf(w);
      if (seen.has(prov) || w.model.includes(PLACEHOLDER) || !(await version(w.cli))) continue;
      seen.add(prov);
      const dir = hp(ctx, "doctor", w.id);
      mkdirSync(dir, { recursive: true });
      const r = await rt.invoke({ role: "doctor", taskId: "doctor", stage: -1, attempt: 1, cwd: dir, prompt: "Responda apenas com a palavra OK.", workerId: w.id, deferEvent: true })
        .catch((e) => ({ outcome: "failure", result: { finalText: String(e.message) } }) as any);
      add(r.outcome === "success" && /ok/i.test(r.result.finalText) ? "ok" : "fail", `auth ${prov} (${w.id})`, r.outcome === "success" ? "respondeu" : String(r.result.finalText).slice(0, 200));
    }
  } else add("info", "auth", "pulado (--no-auth)");

  // LM Studio
  const locals = workers.filter((w) => w.model.startsWith("lmstudio/"));
  if (locals.length) {
    try {
      const r = await fetch(`${ctx.env.LMSTUDIO_BASE_URL ?? "http://localhost:1234/v1"}/models`, { signal: AbortSignal.timeout(3000) });
      const ids: string[] = ((await r.json()) as any).data?.map((m: any) => m.id) ?? [];
      for (const w of locals) add(ids.includes(w.model.slice(9)) ? "ok" : "fail", `lmstudio ${w.id}`, ids.includes(w.model.slice(9)) ? "modelo listado" : `não listado em /v1/models (${ids.join(", ") || "vazio"})`);
    } catch {
      add("fail", "lmstudio", "endpoint não responde — abra o LM Studio (server) ou desabilite os workers locais");
    }
    const need = Math.max(...locals.map((w) => w.requiresFreeRamGb ?? 0));
    if (need) add(totalmem() / 2 ** 30 >= need + 8 ? "ok" : "warn", "RAM", `${(totalmem() / 2 ** 30).toFixed(0)} GB total; maior modelo local pede ${need} GB livres`);
  }

  // Firebase
  const fbProject = ctx.env.FIREBASE_PROJECT_ID;
  if (!fbProject) add("fail", "firebase projeto", "FIREBASE_PROJECT_ID vazio no .env");
  else if (await version("firebase")) {
    const r = await sh("firebase", ["projects:list", "--json"], undefined, 60_000);
    add(String(r.stdout).includes(`"${fbProject}"`) ? "ok" : "fail", "firebase projeto", String(r.stdout).includes(`"${fbProject}"`) ? fbProject : `${fbProject} não acessível (firebase login?)`);
  }
  const sa = ctx.env.GOOGLE_APPLICATION_CREDENTIALS && join(ctx.root, ctx.env.GOOGLE_APPLICATION_CREDENTIALS);
  try {
    const j = sa && JSON.parse(readFileSync(sa, "utf8"));
    add(j?.client_email && j?.private_key ? "ok" : "fail", "service account", j?.client_email ?? "GOOGLE_APPLICATION_CREDENTIALS ausente/inválido");
  } catch {
    add("fail", "service account", `arquivo inválido ou ausente: ${sa ?? "(não definido)"}`);
  }
  if (o.emulators !== false && (await version("firebase")) && (await version("java"))) {
    const dir = hp(ctx, "doctor", "emulators");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "firebase.json"), JSON.stringify({ emulators: { firestore: { port: 18089 }, auth: { port: 19099 }, ui: { enabled: false } } }));
    const r = await sh("firebase", ["emulators:exec", "--only", "firestore,auth", "--project", "demo-harness", "echo EMU_OK"], dir, 180_000);
    add(String(r.stdout).includes("EMU_OK") ? "ok" : "fail", "emuladores", String(r.stdout).includes("EMU_OK") ? "sobem e descem" : String(r.stderr || r.stdout).slice(-200));
    rmSync(dir, { recursive: true, force: true });
  }
  add("info", "Firebase Hosting", "habilite Hosting no projeto dev (preview channels); Blaze só se push/Functions estiverem no escopo, com alerta de orçamento");

  // human inputs
  for (const [alias, f] of Object.entries(ctx.config.project.specFiles)) add(existsSync(join(ctx.root, f)) ? "ok" : "fail", `spec ${alias}`, f);
  const d = designRefs(ctx);
  add(existsSync(join(ctx.root, d.tokens)) ? "ok" : "fail", "design tokens", d.tokens);
  add(d.screens.length >= 3 ? "ok" : "fail", "mockups", `${d.screens.length} em ${ctx.config.project.designDir}/screens (mínimo 3)`);
  add(existsSync(join(ctx.root, ctx.config.project.decisionsFile)) ? "ok" : "fail", "decisões", ctx.config.project.decisionsFile);
  const ac = acceptanceCriteria(ctx);
  add(ac.length ? "ok" : "fail", "critérios de aceite", `${ac.length} na seção ${ctx.config.project.acceptanceSection} da spec`);
  const feats = loadFeatures(ctx);
  if (feats.features.length) {
    const miss = uncovered(feats, ac.map((a) => a.id));
    add(miss.length ? "fail" : "ok", "cobertura features.json", miss.length ? `sem feature: ${miss.join(", ")}` : "todos os critérios cobertos");
  }

  // git
  try {
    add((await g.isClean(ctx.root)) ? "ok" : "fail", "git limpo", (await g.isClean(ctx.root)) ? "sem mudanças pendentes" : "faça commit das mudanças antes do start");
    add((await g.hasRemote(ctx.root)) ? "ok" : "warn", "git remoto", (await g.hasRemote(ctx.root)) ? "configurado" : "nenhum remote (git remote add origin …)");
    const b = await g.currentBranch(ctx.root);
    add(b === ctx.config.project.mainBranch ? "ok" : "warn", "git branch", b === ctx.config.project.mainBranch ? b : `checkout atual é ${b}; as etapas aprovadas são mescladas em ${ctx.config.project.mainBranch}`);
  } catch (e) {
    add("fail", "git", (e as Error).message);
  }

  // budget + limits + machine
  add("ok", "budget.yaml / prices.yaml", `válidos (teto da execução US$ ${ctx.budget.caps.run})`);
  add("info", "limites externos", "configure: guardrail diário por chave no OpenRouter, limite mensal nos consoles Anthropic e OpenAI, alertas de orçamento no GCP; uma chave por provedor dedicada ao harness");
  const df = await sh("df", ["-k", ctx.root]);
  const freeGb = Number(String(df.stdout).split("\n")[1]?.split(/\s+/)[3] ?? 0) / 2 ** 20;
  add(freeGb >= 20 ? "ok" : "fail", "disco livre", `${freeGb.toFixed(0)} GB (mínimo 20)`);
  if (platform() === "darwin") add("info", "macOS", "rode com `caffeinate -dimsu ./harness/bin/harness start` e o Mac na tomada");

  return { ok: !checks.some((c) => c.level === "fail"), checks };
}

export function formatDoctor(r: { ok: boolean; checks: Check[] }) {
  const icon: Record<Level, string> = { ok: "✔", warn: "!", fail: "✘", info: "i" };
  const fails = r.checks.filter((c) => c.level === "fail");
  return [
    ...r.checks.map((c) => `${icon[c.level]} ${c.item.padEnd(28)} ${c.detail}`),
    "",
    r.ok ? "doctor: OK — pode rodar `harness smoke` e depois `harness start`" : `doctor: ${fails.length} item(ns) crítico(s) para configurar:\n${fails.map((c) => `  - ${c.item}: ${c.detail}`).join("\n")}`,
  ].join("\n");
}

const HelloFinal = z.object({ summary: z.string() }).passthrough();

/** Real micro-task with each enabled worker; results become routing priors (role "smoke"). */
export async function smoke(ctx: Ctx, only?: string[]) {
  const rt = new Runtime(ctx);
  const rows: string[] = [];
  const workers = enabledWorkers(ctx).filter((w) => (only?.length ? only.includes(w.id) : w.cli !== "fake" || enabledWorkers(ctx).every((x) => x.cli === "fake")));
  for (const w of workers) {
    const dir = hp(ctx, "smoke", w.id);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    await g.git(dir, "init", "-q");
    const prompt = "Crie `hello.ts` exportando `export function hello(name: string): string` que retorna `Olá, ${name}!` e um teste `hello.test.ts` (vitest) que verifica `hello(\"Pulsar\") === \"Olá, Pulsar!\"`. Não instale dependências. Termine com um bloco ```json {\"summary\": \"...\", \"filesChanged\": [...], \"testsRun\": [], \"confidence\": \"high\", \"notes\": \"\"}```.";
    const r = await rt.invoke({ role: "smoke", taskId: `smoke-${w.id}`, stage: -1, attempt: 1, cwd: dir, prompt, workerId: w.id, schema: HelloFinal, deferEvent: true })
      .catch((e) => ({ outcome: "failure", costUsd: 0, worker: w, result: { durationMs: 0, finalText: String(e.message), usage: { inputTokens: 0, outputTokens: 0 } } }) as any);
    const ok = r.outcome === "success" && existsSync(join(dir, "hello.ts")) && readFileSync(join(dir, "hello.ts"), "utf8").includes("Olá") && existsSync(join(dir, "hello.test.ts"));
    logEvent(ctx, { taskId: `smoke-${w.id}`, stage: -1, role: "smoke", workerId: w.id, family: w.family, attempt: 1, outcome: ok ? "success" : "failure", costUsd: r.costUsd, durationMs: r.result.durationMs });
    recordStats(ctx, w.id, "smoke", [], { success: ok, costUsd: r.costUsd, durationMs: r.result.durationMs });
    rows.push(`${ok ? "✔" : "✘"} ${w.id.padEnd(14)} ${(r.result.durationMs / 1000).toFixed(1).padStart(6)}s  US$ ${r.costUsd.toFixed(4)}  ${ok ? "" : `(${r.outcome}) ${String(r.result.finalText).slice(0, 120).replace(/\n/g, " ")}`}`);
  }
  return rows.join("\n") + `\n\nResultados gravados em .harness/routing-stats.json como prior (papel "smoke").`;
}
