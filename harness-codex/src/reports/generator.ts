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

function textValue(value: unknown, fallback = "unknown"): string {
  return typeof value === "string" || typeof value === "number" || typeof value === "bigint"
    ? String(value)
    : fallback;
}

export interface ModelPerformance {
  alias: string;
  provider: string;
  modelId: string;
  roles: string[];
  calls: number;
  technicalSuccesses: number;
  technicalFailures: number;
  incompleteCalls: number;
  readyResults: number;
  changesRequested: number;
  blockedResults: number;
  technicalSuccessRatePercent: number;
  confirmedMicros: string;
  uncertainMicros: string;
}

export function summarizeModelPerformance(calls: Record<string, unknown>[]): ModelPerformance[] {
  const groups = new Map<string, Omit<ModelPerformance, "technicalSuccessRatePercent" | "roles"> & { roles: Set<string> }>();
  for (const call of calls) {
    const modelId = textValue(call.model_id);
    const alias = textValue(call.alias, modelId);
    const provider = textValue(call.provider);
    const key = `${alias}\u0000${provider}\u0000${modelId}`;
    const group = groups.get(key) ?? {
      alias, provider, modelId, roles: new Set<string>(), calls: 0, technicalSuccesses: 0,
      technicalFailures: 0, incompleteCalls: 0, readyResults: 0, changesRequested: 0,
      blockedResults: 0, confirmedMicros: "0", uncertainMicros: "0",
    };
    group.calls += 1;
    group.roles.add(textValue(call.role));
    group.confirmedMicros = String(BigInt(group.confirmedMicros) + BigInt(Number(call.reported_micros ?? 0)));
    group.uncertainMicros = String(BigInt(group.uncertainMicros) + BigInt(Number(call.uncertain_micros ?? 0)));
    try {
      if (typeof call.result_json !== "string") throw new Error("missing result");
      const result = JSON.parse(call.result_json) as { outcome?: unknown; blockers?: unknown };
      const blockers = Array.isArray(result.blockers) ? result.blockers : [];
      if (result.outcome === "failed" && blockers.includes("pi_execution_failed")) {
        group.technicalFailures += 1;
      } else {
        group.technicalSuccesses += 1;
        if (result.outcome === "ready_for_verification") group.readyResults += 1;
        else if (["changes_requested", "needs_changes", "revisions_requested"].includes(String(result.outcome))) group.changesRequested += 1;
        else if (result.outcome === "blocked" || result.outcome === "failed") group.blockedResults += 1;
      }
    } catch {
      group.incompleteCalls += 1;
    }
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    roles: [...group.roles].sort(),
    technicalSuccessRatePercent: group.calls === 0 ? 0 : Number(((group.technicalSuccesses / group.calls) * 100).toFixed(2)),
  })).sort((left, right) => left.alias.localeCompare(right.alias));
}

export async function writeModelPerformanceReport(config: HarnessConfig, store: StateStore, runId: string): Promise<string> {
  const calls = store.all<Record<string, unknown>>(
    `SELECT s.model_key AS alias, s.role, pc.provider, pc.model_id, pc.reported_micros, pc.uncertain_micros, a.result_json
     FROM provider_calls pc
     JOIN attempts a ON a.id=pc.attempt_id
     LEFT JOIN sessions s ON s.attempt_id=a.id
     WHERE a.run_id=? ORDER BY pc.started_at`,
    runId,
  );
  const performance = summarizeModelPerformance(calls);
  const directory = runDirectory(config, runId);
  await mkdir(directory, { recursive: true });
  const output = path.join(directory, "model-performance.md");
  const markdown = [
    "# Desempenho dos modelos", "", `Run: ${runId}`, "",
    "Sucesso técnico significa que o modelo concluiu a sessão e entregou uma resposta estruturada; não equivale à aprovação final da tarefa.", "",
    "| Modelo | Papéis | Chamadas | Sucessos técnicos | Falhas técnicas | Incompletas | Índice | Prontos | Alterações |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...performance.map((item) => `| ${item.alias} | ${item.roles.join(", ")} | ${item.calls} | ${item.technicalSuccesses} | ${item.technicalFailures} | ${item.incompleteCalls} | ${item.technicalSuccessRatePercent}% | ${item.readyResults} | ${item.changesRequested} |`),
    "",
  ].join("\n");
  await writeFile(output, markdown, { mode: 0o600 });
  await writeJson(path.join(directory, "model-performance.json"), { runId, models: performance });
  const csv = [
    "alias,provider,model_id,roles,calls,technical_successes,technical_failures,incomplete_calls,technical_success_rate_percent,ready_results,changes_requested,blocked_results,confirmed_micros,uncertain_micros",
    ...performance.map((item) => [
      item.alias, item.provider, item.modelId, item.roles.join("|"), item.calls, item.technicalSuccesses,
      item.technicalFailures, item.incompleteCalls, item.technicalSuccessRatePercent, item.readyResults,
      item.changesRequested, item.blockedResults, item.confirmedMicros, item.uncertainMicros,
    ].map(csvValue).join(",")),
  ].join("\n");
  await writeFile(path.join(directory, "model-performance.csv"), `${csv}\n`, { mode: 0o600 });
  return output;
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
  await writeModelPerformanceReport(config, store, runId);
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
