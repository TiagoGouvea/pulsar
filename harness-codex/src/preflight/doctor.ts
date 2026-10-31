import { access, constants, readFile, statfs } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import type { HarnessConfig } from "../config/schema.js";
import type { CheckResult } from "../domain/types.js";
import { inspectGitWorkspace } from "../git/workspace.js";
import { probeCandidate } from "../providers/probes.js";
import { safeError, writeJson } from "../utils/core.js";
import { commandAvailable, runProcess } from "../utils/process.js";

const requiredCommands = ["node", "yarn", "git", "rg"];
const HARNESS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function doctor(config?: HarnessConfig): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];
  checks.push({
    id: "machine.platform",
    status: process.platform === "darwin" ? "pass" : "warn",
    scope: "global", importance: "recommended",
    summary: `${process.platform}/${process.arch}`,
    evidence: `${os.cpus().length} CPUs; ${Math.round(os.totalmem() / 1024 ** 3)} GiB de memória nominal.`,
  });
  try {
    const executable = chromium.executablePath();
    await access(executable, constants.X_OK);
    checks.push({ id: "playwright.chromium", status: "pass", scope: "stage", importance: "required", summary: "Chromium do Playwright instalado.", evidence: executable });
  } catch (error) {
    checks.push({ id: "playwright.chromium", status: "block", scope: "stage", importance: "required", summary: "Chromium do Playwright ausente.", evidence: safeError(error), remediation: "Execute `yarn playwright install chromium`." });
  }
  checks.push({
    id: "machine.node",
    status: Number(process.versions.node.split(".")[0]) >= 24 ? "pass" : "block",
    scope: "global", importance: "required", summary: `Node ${process.versions.node}`,
    evidence: process.execPath, remediation: "Instale Node 24 LTS ou superior compatível.",
  });
  for (const command of requiredCommands) {
    const available = await commandAvailable(command);
    checks.push({
      id: `tool.${command}`, status: available ? "pass" : "block", scope: "global", importance: "required",
      summary: available ? `${command} disponível.` : `${command} ausente.`, evidence: available ? "Encontrado no PATH." : "Não encontrado no PATH.",
    });
  }
  const availableMemory = os.freemem();
  checks.push({
    id: "machine.memory",
    status: availableMemory > 4 * 1024 ** 3 ? "pass" : "warn", scope: "stage", importance: "recommended",
    summary: `${(availableMemory / 1024 ** 3).toFixed(1)} GiB reportados como livres.`,
    evidence: "A capacidade nominal não garante que um modelo local e o navegador caibam simultaneamente.",
    remediation: "Descarregue modelos locais ou use um candidato remoto autorizado se houver pressão/swap persistente.",
  });
  if (config) checks.push(...await gitWorkspaceChecks(config));
  return checks;
}

export async function preflight(config: HarnessConfig): Promise<CheckResult[]> {
  const checks = await doctor(config);
  for (const target of [config.project.workspace, ...config.project.specs, ...(config.project.designDirectory ? [config.project.designDirectory] : [])]) {
    try {
      await access(target, constants.R_OK);
      checks.push({ id: `path.${path.basename(target)}`, status: "pass", scope: "global", importance: "required", summary: "Caminho acessível.", evidence: target });
    } catch (error) {
      checks.push({ id: `path.${path.basename(target)}`, status: "block", scope: "global", importance: "required", summary: "Caminho inacessível.", evidence: safeError(error), remediation: target });
    }
  }
  try {
    await access(config.project.workspace, constants.W_OK);
    checks.push({ id: "workspace.write", status: "pass", scope: "stage", importance: "required", summary: "Workspace gravável.", evidence: config.project.workspace });
  } catch (error) {
    checks.push({ id: "workspace.write", status: "block", scope: "stage", importance: "required", summary: "Workspace sem escrita.", evidence: safeError(error) });
  }
  try {
    const fs = await statfs(config.storage.root).catch(() => statfs(path.dirname(config.storage.root)));
    const freeGb = (fs.bavail * fs.bsize) / 1024 ** 3;
    checks.push({ id: "machine.disk", status: freeGb > 5 ? "pass" : "warn", scope: "global", importance: "recommended", summary: `${freeGb.toFixed(1)} GiB livres.`, evidence: config.storage.root });
  } catch (error) {
    checks.push({ id: "machine.disk", status: "warn", scope: "global", importance: "recommended", summary: "Espaço em disco não medido.", evidence: safeError(error) });
  }
  const browser = await runProcess(["yarn", "playwright", "--version"], { cwd: config.configDirectory, timeoutMs: 10_000 });
  checks.push({
    id: "playwright.cli", status: browser.exitCode === 0 ? "pass" : "block", scope: "stage", importance: "required",
    summary: browser.exitCode === 0 ? browser.stdout.trim() : "Playwright indisponível.", evidence: browser.stderr || browser.stdout,
    remediation: "Execute `yarn install` e, quando for usar navegador, `yarn playwright install chromium`.",
  });
  for (const candidate of config.models.filter((item) => item.enabled && item.executor === config.execution.executor)) {
    checks.push(...await probeCandidate(config, candidate));
  }
  if (config.project.profile.includes("firebase")) {
    checks.push(...firebaseChecklist());
    checks.push(...await firebaseProjectChecks(config));
  }
  return checks;
}

export async function firebaseProjectChecks(config: HarnessConfig): Promise<CheckResult[]> {
  const workspace = config.project.workspace;
  const checks: CheckResult[] = [];
  let firebaseConfig: Record<string, unknown> = {};
  let packageJson: Record<string, unknown> = {};
  try { firebaseConfig = JSON.parse(await readFile(path.join(workspace, "firebase.json"), "utf8")) as Record<string, unknown>; }
  catch (error) {
    checks.push({ id: "firebase.emulator-config", status: "block", scope: "stage", importance: "required", summary: "firebase.json ausente ou inválido.", evidence: safeError(error), remediation: "Configure Auth e Firestore Emulator antes da etapa de autenticação/regras." });
  }
  try { packageJson = JSON.parse(await readFile(path.join(workspace, "package.json"), "utf8")) as Record<string, unknown>; }
  catch (error) { checks.push({ id: "firebase.project-package", status: "block", scope: "stage", importance: "required", summary: "package.json do projeto ausente ou inválido.", evidence: safeError(error) }); }
  const emulators = firebaseConfig.emulators && typeof firebaseConfig.emulators === "object" ? firebaseConfig.emulators as Record<string, unknown> : {};
  const firestoreConfigured = Boolean(emulators.firestore && typeof emulators.firestore === "object");
  const authConfigured = Boolean(emulators.auth && typeof emulators.auth === "object");
  if (firebaseConfig.emulators || !checks.some((check) => check.id === "firebase.emulator-config")) {
    checks.push({
      id: "firebase.emulators", status: firestoreConfigured && authConfigured ? "pass" : "block", scope: "stage", importance: "required",
      summary: firestoreConfigured && authConfigured ? "Emuladores de Auth e Firestore configurados." : "Etapa Firebase exige Auth e Firestore Emulator configurados.",
      evidence: `firebase.json: auth=${authConfigured ? "sim" : "não"}, firestore=${firestoreConfigured ? "sim" : "não"}; deploy de produção permanece desabilitado.`,
      ...(!(firestoreConfigured && authConfigured) ? { remediation: "Adicione emulators.auth e emulators.firestore ao firebase.json e execute regras/testes apenas via emulator." } : {}),
    });
  }
  const rulesPath = typeof firebaseConfig.firestore === "object" && firebaseConfig.firestore !== null
    ? (firebaseConfig.firestore as Record<string, unknown>).rules : undefined;
  if (typeof rulesPath === "string") {
    const resolvedRules = path.resolve(workspace, rulesPath);
    try {
      await access(resolvedRules, constants.R_OK);
      checks.push({ id: "firebase.rules-file", status: "pass", scope: "stage", importance: "required", summary: "Arquivo de Security Rules acessível.", evidence: resolvedRules });
    } catch (error) {
      checks.push({ id: "firebase.rules-file", status: "block", scope: "stage", importance: "required", summary: "Security Rules configuradas não estão acessíveis.", evidence: safeError(error) });
    }
  } else {
    checks.push({ id: "firebase.rules-file", status: "block", scope: "stage", importance: "required", summary: "firebase.json não aponta para Security Rules.", evidence: "firestore.rules ausente da configuração Firebase." });
  }
  const scripts = packageJson.scripts && typeof packageJson.scripts === "object" ? packageJson.scripts as Record<string, unknown> : {};
  const dependencies: Record<string, unknown> = {};
  for (const source of [packageJson.dependencies, packageJson.devDependencies]) {
    if (source && typeof source === "object") Object.assign(dependencies, source);
  }
  const rulesTestConfigured = typeof scripts["test:rules"] === "string" && typeof dependencies["@firebase/rules-unit-testing"] === "string";
  checks.push({
    id: "firebase.rules-tests", status: rulesTestConfigured ? "pass" : "warn", scope: "stage", importance: "required",
    summary: rulesTestConfigured ? "Testes automatizados das Rules configurados." : "Testes automatizados de Security Rules ainda não estão configurados.",
    evidence: "Os testes devem iniciar Auth/Firestore Emulator e nunca apontar para projeto de produção.",
    ...(!rulesTestConfigured ? { remediation: "Adicione @firebase/rules-unit-testing e um script test:rules executado com firebase emulators:exec." } : {}),
  });
  for (const [id, variable] of [["firestore", "FIRESTORE_EMULATOR_HOST"], ["auth", "FIREBASE_AUTH_EMULATOR_HOST"]] as const) {
    const value = process.env[variable];
    const local = value == null || /^(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(value);
    checks.push({
      id: `firebase.${id}-endpoint`, status: local ? (value ? "pass" : "warn") : "block", scope: "stage", importance: "required",
      summary: value ? (local ? `${variable} aponta para localhost.` : `${variable} aponta para endpoint não local.`) : `${variable} não definido nesta sessão.`,
      evidence: value ?? "Sem endpoint emulator ativo; deploy/conexão remota não é iniciada pelo preflight.",
      ...(!local ? { remediation: "Use somente host local de emulator para testes de Auth/Firestore; remova endpoints remotos do ambiente." } : {}),
    });
  }
  return checks;
}

export async function gitWorkspaceChecks(config: HarnessConfig, harnessRoot = HARNESS_ROOT): Promise<CheckResult[]> {
  const git = await inspectGitWorkspace(config.project.workspace, harnessRoot);
  const checks: CheckResult[] = [];
  checks.push({
    id: "git.repository",
    status: git.repositoryRoot ? "pass" : "block",
    scope: "global",
    importance: "required",
    summary: git.repositoryRoot ? "Workspace pertence a um repositório Git." : "Workspace não pertence a um repositório Git.",
    evidence: git.repositoryRoot ?? config.project.workspace,
    ...(!git.repositoryRoot ? { remediation: "Inicialize ou selecione o monorepo antes de executar o harness." } : {}),
  });
  if (!git.repositoryRoot) return checks;
  checks.push({
    id: "git.shared-repository",
    status: git.sharedWithProtectedRoot ? "pass" : "block",
    scope: "global",
    importance: "required",
    summary: git.sharedWithProtectedRoot ? "Harness e aplicação compartilham o mesmo monorepo." : "Harness e aplicação estão em repositórios diferentes.",
    evidence: git.repositoryRoot,
    ...(!git.sharedWithProtectedRoot ? { remediation: "Use a raiz compartilhada do monorepo Pulsar, sem repositórios Git aninhados." } : {}),
  });
  checks.push({
    id: "git.worktree",
    status: "pass",
    scope: "global",
    importance: "informational",
    summary: git.linkedWorktree ? "Worktree vinculado reconhecido sem alterar branches." : "Workspace no worktree principal.",
    evidence: `worktree=${git.repositoryRoot}; commonGitDir=${git.commonGitDirectory ?? "n/a"}`,
  });
  checks.push({
    id: "git.branch",
    status: git.branch ? "pass" : "block",
    scope: "stage",
    importance: "required",
    summary: git.branch ? `Branch corrente preservado: ${git.branch}.` : "HEAD destacado não é permitido.",
    evidence: git.branch ?? "detached",
    ...(!git.branch ? { remediation: "Selecione manualmente o branch da etapa antes de executar." } : {}),
  });
  checks.push({
    id: "git.branch-policy",
    status: "pass",
    scope: "global",
    importance: "required",
    summary: "O harness não cria, troca ou remove branches.",
    evidence: "O branch atual é fixado por etapa; mudanças são exclusivamente manuais.",
  });
  return checks;
}

export async function writePreflightReport(config: HarnessConfig, checks: CheckResult[], outputDirectory = config.storage.root): Promise<void> {
  await writeJson(path.join(outputDirectory, "preflight.json"), { generatedAt: new Date().toISOString(), checks });
  const markdown = [
    "# Preflight do harness", "", `Gerado em UTC: ${new Date().toISOString()}`, "",
    ...checks.flatMap((check) => [
      `## ${check.status.toUpperCase()} — ${check.id}`, "", check.summary, "", `Evidência: ${check.evidence}`,
      ...(check.remediation ? ["", `Remediação: ${check.remediation}`] : []), "",
    ]),
  ].join("\n");
  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, "preflight.md"), markdown, { mode: 0o600 });
}

function firebaseChecklist(): CheckResult[] {
  const items = [
    "project-id-dev", "region", "web-config", "auth-methods", "authorized-domains", "firestore-rules-indexes",
    "emulator-java", "hosting-preview", "functions-scheduler", "fcm-vapid", "billing-quotas", "app-check",
    "least-privilege-credentials", "synthetic-test-data", "separate-app-ai-budget", "production-authorization",
  ];
  return items.map((item) => ({
    id: `firebase.${item}`, status: "warn", scope: "stage", importance: "recommended",
    summary: "Confirmação humana/configuração necessária conforme recursos usados.",
    evidence: "O harness não ativa cobrança, IAM ou produção automaticamente.",
    remediation: `Preencher e validar: ${item}.`,
  }));
}
