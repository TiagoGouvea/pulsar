import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { HarnessConfig } from "../config/schema.js";
import type { StateStore } from "../state/store.js";
import { BudgetLedger } from "../budget/ledger.js";
import { formatMicros, nowUtc, writeJson } from "../utils/core.js";

function runDirectory(config: HarnessConfig, runId: string): string {
  return path.join(config.storage.root, "runs", runId);
}

function csvValue(value: unknown): string {
  const normalized = typeof value === "string" || typeof value === "number" || typeof value === "bigint" ? String(value) : "";
  return `"${normalized.replaceAll('"', '""')}"`;
}

export async function writePlan(config: HarnessConfig, store: StateStore, runId: string): Promise<void> {
  const requirements = store.listRequirements(runId);
  const tasks = store.listTasks(runId);
  const markdown = [
    "# Plano da execução", "", `Run: ${runId}`, `Gerado em UTC: ${nowUtc()}`, "",
    "## Requisitos", "",
    ...requirements.map((item) => `- **${String(item.id)}** [${String(item.priority)}] ${String(item.description)} — ${String(item.source_section)}`),
    "", "## Tarefas", "",
    ...tasks.map((item) => `- **${String(item.id)}** → ${String(item.milestone_id)}: ${String(item.title)}`), "",
  ].join("\n");
  await mkdir(runDirectory(config, runId), { recursive: true });
  await writeFile(path.join(runDirectory(config, runId), "plan.md"), markdown, { mode: 0o600 });
  await writeJson(path.join(runDirectory(config, runId), "requirements.json"), requirements);
}

export async function writeHumanReview(input: {
  config: HarnessConfig;
  store: StateStore;
  runId: string;
  milestoneId: string;
  revision: string;
  verificationPassed: boolean;
}): Promise<string> {
  const directory = path.join(runDirectory(input.config, input.runId), "milestones", input.milestoneId);
  const tasks = input.store.listTasks(input.runId).filter((task) => task.milestone_id === input.milestoneId);
  const requirements = input.store.listRequirements(input.runId);
  const markdown = [
    `# Revisão humana — ${input.milestoneId}`, "",
    `Revisão: \`${input.revision}\``,
    `Verificações automatizadas: **${input.verificationPassed ? "aprovadas" : "falharam"}**`, "",
    "## Entregue", "",
    ...tasks.map((task) => `- ${String(task.id)}: ${String(task.title)} (${String(task.state)})`), "",
    "## Matriz de requisitos", "",
    ...requirements.map((requirement) => `- ${String(requirement.id)} → ${tasks.filter((task) => String(task.requirement_ids_json).includes(String(requirement.id))).map((task) => String(task.id)).join(", ") || "sem tarefa"}`), "",
    "## Roteiro humano", "",
    "1. Inicie o projeto alvo conforme seu README.",
    "2. Execute os comportamentos descritos nos critérios dos requisitos acima.",
    "3. Registre ajustes em um arquivo e importe com `feedback import` ou aprove a revisão exata.", "",
    "## Decisões e dúvidas", "", "Nenhuma dúvida adicional foi criada automaticamente.", "",
    "## Limitações", "", "Probes remotos e revisão visual por visão permanecem pendentes quando não há credencial/modelo elegível.", "",
  ].join("\n");
  await mkdir(directory, { recursive: true });
  const output = path.join(directory, "human-review.md");
  await writeFile(output, markdown, { mode: 0o600 });
  return output;
}

export async function writeBudgetReport(config: HarnessConfig, store: StateStore, runId: string): Promise<string> {
  const ledger = new BudgetLedger(store, config);
  const snapshot = ledger.snapshot(runId);
  const milestones = store.listMilestones(runId).map((item) => ({ id: String(item.id), snapshot: ledger.milestoneSnapshot(runId, String(item.id)) }));
  const calls = store.all<Record<string, unknown>>("SELECT provider, model_id, modality, state, input_tokens, output_tokens, reported_micros, uncertain_micros FROM provider_calls WHERE attempt_id IN (SELECT id FROM attempts WHERE run_id=?)", runId);
  const markdown = [
    "# Orçamento", "", `Run: ${runId}`, "",
    `- Limite: ${snapshot.limitMicros == null ? "não definido (chamadas pagas bloqueadas)" : `USD ${formatMicros(snapshot.limitMicros)}`}`,
    `- Confirmado: USD ${formatMicros(snapshot.confirmedMicros)}`,
    `- Reservado: USD ${formatMicros(snapshot.reservedMicros)}`,
    `- Incerto: USD ${formatMicros(snapshot.uncertainMicros)}`,
    `- Utilizável: ${snapshot.usableMicros == null ? "n/a" : `USD ${formatMicros(snapshot.usableMicros)}`}`,
    `- Reserva final protegida: ${config.budget.finalVerificationReservePercent}%`, "",
    "## Etapas", "",
    ...milestones.map(({ id, snapshot: item }) => `- ${id}: USD ${formatMicros(item.confirmedMicros)} confirmado; teto ${item.limitMicros == null ? "não definido" : `USD ${formatMicros(item.limitMicros)}`}.`), "",
    "Custos do aplicativo/Firebase/hosting não estão incluídos.", "",
  ].join("\n");
  const output = path.join(runDirectory(config, runId), "budget-report.md");
  await writeFile(output, markdown, { mode: 0o600 });
  await writeJson(path.join(runDirectory(config, runId), "budget-report.json"), { ...snapshot, limitMicros: snapshot.limitMicros?.toString() ?? null, confirmedMicros: snapshot.confirmedMicros.toString(), reservedMicros: snapshot.reservedMicros.toString(), uncertainMicros: snapshot.uncertainMicros.toString(), usableMicros: snapshot.usableMicros?.toString() ?? null, milestones: milestones.map(({ id, snapshot: item }) => ({ id, limitMicros: item.limitMicros?.toString() ?? null, confirmedMicros: item.confirmedMicros.toString(), reservedMicros: item.reservedMicros.toString(), uncertainMicros: item.uncertainMicros.toString(), usableMicros: item.usableMicros?.toString() ?? null })), calls });
  const csv = [
    "provider,model_id,modality,state,input_tokens,output_tokens,reported_micros,uncertain_micros",
    ...calls.map((call) => ["provider", "model_id", "modality", "state", "input_tokens", "output_tokens", "reported_micros", "uncertain_micros"]
      .map((key) => csvValue(call[key])).join(",")),
  ].join("\n");
  await writeFile(path.join(runDirectory(config, runId), "budget-report.csv"), `${csv}\n`, { mode: 0o600 });
  return output;
}

export async function writeFinalReport(config: HarnessConfig, store: StateStore, runId: string): Promise<string> {
  const run = store.getRun(runId);
  if (!run) throw new Error(`Run inexistente: ${runId}`);
  const tasks = store.listTasks(runId);
  const approvals = store.all<Record<string, unknown>>("SELECT * FROM approvals WHERE run_id=? ORDER BY created_at", runId);
  const findings = store.all<Record<string, unknown>>("SELECT * FROM findings WHERE run_id=? ORDER BY created_at", runId);
  const markdown = [
    "# Relatório final", "", `Run: ${runId}`, `Estado: **${String(run.state)}**`, `Revisão: ${typeof run.revision === "string" ? run.revision : "n/a"}`, "",
    "## Rastreabilidade", "", ...tasks.map((task) => `- ${String(task.requirement_ids_json)} → ${String(task.id)} → ${String(task.state)}`), "",
    "## Aceites", "", ...(approvals.length ? approvals.map((item) => `- ${String(item.milestone_id)}: ${String(item.decision)} por ${String(item.actor)} em ${String(item.created_at)}`) : ["Nenhum aceite humano registrado."]), "",
    "## Achados", "", ...(findings.length ? findings.map((item) => `- [${String(item.severity)}] ${String(item.summary)}`) : ["Nenhum achado persistido."]), "",
    "## Escopo de comprovação", "", "Integrações remotas só são consideradas verificadas quando existe provider_call/evidência real. Simulações não comprovam acesso remoto.", "",
  ].join("\n");
  const output = path.join(runDirectory(config, runId), "final-report.md");
  await writeFile(output, markdown, { mode: 0o600 });
  return output;
}
