import { access, constants, statfs } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { HarnessConfig } from "../config/schema.js";
import type { CheckResult } from "../domain/types.js";
import { probeCandidate } from "../providers/probes.js";
import { safeError, writeJson } from "../utils/core.js";
import { commandAvailable, runProcess } from "../utils/process.js";

const requiredCommands = ["node", "yarn", "git", "rg"];

export async function doctor(): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];
  checks.push({
    id: "machine.platform",
    status: process.platform === "darwin" ? "pass" : "warn",
    scope: "global", importance: "recommended",
    summary: `${process.platform}/${process.arch}`,
    evidence: `${os.cpus().length} CPUs; ${Math.round(os.totalmem() / 1024 ** 3)} GiB de memória nominal.`,
  });
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
  return checks;
}

export async function preflight(config: HarnessConfig): Promise<CheckResult[]> {
  const checks = await doctor();
  for (const target of [config.project.workspace, ...config.project.specs]) {
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
  for (const candidate of config.models.filter((item) => item.enabled)) {
    checks.push(...await probeCandidate(config, candidate));
  }
  if (config.project.profile.includes("firebase")) checks.push(...firebaseChecklist());
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
