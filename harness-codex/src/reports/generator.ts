import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { HarnessConfig } from "../config/schema.js";
import type { StateStore } from "../state/store.js";
import { BudgetLedger } from "../budget/ledger.js";
import { formatMicros, nowUtc, writeJson } from "../utils/core.js";
import type { HostingSnapshot } from "../verification/hosting-snapshot.js";

function runDirectory(config: HarnessConfig, runId: string): string {
  return path.join(config.storage.root, "runs", runId);
}

function csvValue(value: unknown): string {
  const normalized = typeof value === "string" || typeof value === "number" || typeof value === "bigint" ? String(value) : "";
  return `"${normalized.replaceAll('"', '""')}"`;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index] ?? "";
    if (quoted && character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (!quoted && character === ",") { row.push(field); field = ""; }
    else if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field); field = "";
      if (row.some((item) => item.length > 0)) rows.push(row);
      row = [];
    } else field += character;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
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
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  averageDurationMs: number;
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

interface WorkAttributionRow {
  milestoneId: string;
  taskId: string;
  taskTitle: string;
  requirements: string[];
  attempt: number;
  attemptId: string;
  role: string;
  modelAlias: string;
  modelId: string;
  status: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number | null;
  changedFiles: string[];
  declaredFiles: string[];
  feedback: string;
  notes: string;
}

export async function writeWorkAttributionReport(
  config: HarnessConfig,
  store: StateStore,
  runId: string,
  milestoneId?: string,
): Promise<string> {
  const tasks = store.listTasks(runId);
  const tasksById = new Map(tasks.map((task) => [String(task.id), task]));
  const attempts = store.all<Record<string, unknown>>(
    `SELECT a.*, s.role, s.model_key, pc.provider, pc.model_id,
     CASE WHEN pc.finished_at IS NULL OR pc.started_at IS NULL THEN NULL
       ELSE CAST((julianday(pc.finished_at)-julianday(pc.started_at))*86400000 AS INTEGER) END AS duration_ms
     FROM attempts a LEFT JOIN sessions s ON s.attempt_id=a.id
     LEFT JOIN provider_calls pc ON pc.attempt_id=a.id AND COALESCE(pc.call_role, s.role) != 'responseFormatter'
     WHERE a.run_id=? ORDER BY a.started_at, a.number`,
    runId,
  );
  const rows: WorkAttributionRow[] = [];
  for (const attempt of attempts) {
    const rawTaskId = String(attempt.task_id);
    const taskId = rawTaskId.endsWith("-review") ? rawTaskId.slice(0, -7) : rawTaskId;
    const task = tasksById.get(taskId);
    if (!task || (milestoneId && String(task.milestone_id) !== milestoneId)) continue;
    let result: { changedFiles?: unknown } = {};
    try {
      result = JSON.parse(typeof attempt.result_json === "string" ? attempt.result_json : "{}") as typeof result;
    } catch { /* keep partial attempt visible */ }
    let attribution: { observedChangedFiles?: unknown; declaredChangedFiles?: unknown } = {};
    if (!rawTaskId.endsWith("-review")) {
      const attributionPath = path.join(
        runDirectory(config, runId), "tasks", taskId,
        `attempt-${String(Number(attempt.number)).padStart(3, "0")}`, "work-attribution.json",
      );
      try { attribution = JSON.parse(await readFile(attributionPath, "utf8")) as typeof attribution; } catch { /* interrupted attempt */ }
    }
    const requirements = JSON.parse(String(task.requirement_ids_json)) as string[];
    const modelId = textValue(attempt.model_id, "unknown");
    const modelAlias = String(attempt.model_key ?? config.models.find((candidate) => candidate.modelId === modelId)?.alias ?? attempt.candidate_key);
    rows.push({
      milestoneId: String(task.milestone_id), taskId, taskTitle: String(task.title), requirements,
      attempt: Number(attempt.number), attemptId: String(attempt.id),
      role: String(attempt.role ?? (rawTaskId.endsWith("-review") ? "functionalReviewer" : task.role)),
      modelAlias, modelId,
      status: String(attempt.status), startedAt: String(attempt.started_at),
      finishedAt: textValue(attempt.finished_at, ""),
      durationMs: attempt.duration_ms == null ? null : Number(attempt.duration_ms),
      changedFiles: Array.isArray(attribution.observedChangedFiles) ? attribution.observedChangedFiles.map(String) : [],
      declaredFiles: Array.isArray(attribution.declaredChangedFiles)
        ? attribution.declaredChangedFiles.map(String)
        : Array.isArray(result.changedFiles) ? result.changedFiles.map(String) : [],
      feedback: "", notes: "",
    });
  }

  const directory = runDirectory(config, runId);
  await mkdir(directory, { recursive: true });
  const baseName = milestoneId ? `work-attribution-${milestoneId}` : "work-attribution";
  const reportPath = path.join(directory, `${baseName}.md`);
  const header = "| Etapa | Tarefa | Requisitos | Tentativa | Papel | Modelo | ID do modelo | Estado | Arquivos observados | Arquivos declarados | Duração |";
  const markdown = [
    "# Registro de trabalho por modelo", "", `Run: ${runId}`,
    ...(milestoneId ? [`Etapa: ${milestoneId}`] : []), "",
    "Cada linha representa uma tentativa de implementação ou revisão. Arquivos observados são comparados antes/depois da chamada; arquivos declarados vêm da resposta do modelo. Revisores recebem acesso somente de leitura.", "",
    header, "| --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- | ---: |",
    ...rows.map((row) => `| ${row.milestoneId} | ${row.taskId}: ${row.taskTitle} | ${row.requirements.join(", ")} | ${row.attempt} | ${row.role} | ${row.modelAlias} | ${row.modelId} | ${row.status} | ${row.changedFiles.join(", ") || "—"} | ${row.declaredFiles.join(", ") || "—"} | ${row.durationMs == null ? "—" : `${row.durationMs} ms`} |`),
    "", "## Feedback humano", "",
    `Preencha \`${baseName}-feedback.csv\` com avaliação e observações; o arquivo não é sobrescrito se já existir.`, "",
  ].join("\n");
  await writeFile(reportPath, markdown, { mode: 0o600 });
  await writeJson(path.join(directory, `${baseName}.json`), { runId, milestoneId: milestoneId ?? null, rows });
  const csvColumns: Array<keyof WorkAttributionRow> = [
    "milestoneId", "taskId", "taskTitle", "requirements", "attempt", "attemptId", "role", "modelAlias",
    "modelId", "status", "startedAt", "finishedAt", "durationMs", "changedFiles", "declaredFiles", "feedback", "notes",
  ];
  const csv = [
    csvColumns.join(","),
    ...rows.map((row) => csvColumns.map((column) => csvValue(Array.isArray(row[column]) ? row[column].join("|") : row[column])).join(",")),
  ].join("\n");
  await writeFile(path.join(directory, `${baseName}.csv`), `${csv}\n`, { mode: 0o600 });
  const feedbackPath = path.join(directory, `${baseName}-feedback.csv`);
  const feedbackByAttempt = new Map<string, { feedback: string; notes: string }>();
  try {
    const existingRows = parseCsv(await readFile(feedbackPath, "utf8"));
    for (const existing of existingRows.slice(1)) {
      const attemptId = existing[0];
      if (attemptId) feedbackByAttempt.set(attemptId, { feedback: existing[7] ?? "", notes: existing[8] ?? "" });
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const feedbackCsv = [
    ["attempt_id", "milestone_id", "task_id", "attempt", "role", "model_alias", "changed_files", "feedback", "notes"].join(","),
    ...rows.map((row) => {
      const existing = feedbackByAttempt.get(row.attemptId);
      return [row.attemptId, row.milestoneId, row.taskId, row.attempt, row.role, row.modelAlias, row.changedFiles.join("|"), existing?.feedback ?? "", existing?.notes ?? ""]
        .map(csvValue).join(",");
    }),
  ].join("\n");
  await writeFile(feedbackPath, `${feedbackCsv}\n`, { mode: 0o600 });
  return reportPath;
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
      inputTokens: 0, outputTokens: 0, durationMs: 0, averageDurationMs: 0,
      technicalFailures: 0, incompleteCalls: 0, readyResults: 0, changesRequested: 0,
      blockedResults: 0, confirmedMicros: "0", uncertainMicros: "0",
    };
    group.calls += 1;
    group.inputTokens += Number(call.input_tokens ?? 0);
    group.outputTokens += Number(call.output_tokens ?? 0);
    group.durationMs += Number(call.duration_ms ?? 0);
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
    averageDurationMs: group.calls ? Math.round(group.durationMs / group.calls) : 0,
    technicalSuccessRatePercent: group.calls === 0 ? 0 : Number(((group.technicalSuccesses / group.calls) * 100).toFixed(2)),
  })).sort((left, right) => left.alias.localeCompare(right.alias));
}

export async function writeModelPerformanceReport(config: HarnessConfig, store: StateStore, runId: string, milestoneId?: string): Promise<string> {
  const milestoneClause = milestoneId
    ? "AND EXISTS (SELECT 1 FROM tasks t WHERE t.run_id=a.run_id AND t.milestone_id=? AND (a.task_id=t.id OR a.task_id=t.id || '-review'))"
    : "";
  const calls = store.all<Record<string, unknown>>(
    `SELECT COALESCE(pc.model_alias, s.model_key) AS alias, COALESCE(pc.call_role, s.role) AS role, pc.provider, pc.model_id, pc.input_tokens, pc.output_tokens, pc.reported_micros, pc.uncertain_micros,
     CASE WHEN pc.finished_at IS NULL THEN 0 ELSE CAST((julianday(pc.finished_at)-julianday(pc.started_at))*86400000 AS INTEGER) END AS duration_ms, a.result_json
     FROM provider_calls pc
     JOIN attempts a ON a.id=pc.attempt_id
     LEFT JOIN sessions s ON s.attempt_id=a.id
     WHERE a.run_id=? ${milestoneClause} ORDER BY pc.started_at`,
    ...(milestoneId ? [runId, milestoneId] : [runId]),
  );
  const performance = summarizeModelPerformance(calls);
  const directory = runDirectory(config, runId);
  await mkdir(directory, { recursive: true });
  const reportBase = milestoneId ? `model-performance-${milestoneId}` : "model-performance";
  const output = path.join(directory, `${reportBase}.md`);
  const markdown = [
    "# Desempenho dos modelos", "", `Run: ${runId}`, ...(milestoneId ? [`Etapa: ${milestoneId}`] : []), "",
    "Sucesso técnico significa que o modelo concluiu a sessão e entregou uma resposta estruturada; não equivale à aprovação final da tarefa.", "",
    "| Modelo | Papéis | Chamadas | Sucesso técnico | Falhas | Incompletas | Taxa | Tokens entrada/saída | Duração média | Custo confirmado/incerto |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...performance.map((item) => `| ${item.alias} | ${item.roles.join(", ")} | ${item.calls} | ${item.technicalSuccesses} | ${item.technicalFailures} | ${item.incompleteCalls} | ${item.technicalSuccessRatePercent}% | ${item.inputTokens}/${item.outputTokens} | ${item.averageDurationMs} ms | USD ${formatMicros(BigInt(item.confirmedMicros))}/${formatMicros(BigInt(item.uncertainMicros))} |`),
    "",
  ].join("\n");
  await writeFile(output, markdown, { mode: 0o600 });
  await writeJson(path.join(directory, `${reportBase}.json`), { runId, milestoneId: milestoneId ?? null, models: performance });
  const csv = [
    "alias,provider,model_id,roles,calls,technical_successes,technical_failures,incomplete_calls,technical_success_rate_percent,ready_results,changes_requested,blocked_results,input_tokens,output_tokens,duration_ms,average_duration_ms,confirmed_micros,uncertain_micros",
    ...performance.map((item) => [
      item.alias, item.provider, item.modelId, item.roles.join("|"), item.calls, item.technicalSuccesses,
      item.technicalFailures, item.incompleteCalls, item.technicalSuccessRatePercent, item.readyResults,
      item.changesRequested, item.blockedResults, item.inputTokens, item.outputTokens, item.durationMs,
      item.averageDurationMs, item.confirmedMicros, item.uncertainMicros,
    ].map(csvValue).join(",")),
  ].join("\n");
  await writeFile(path.join(directory, `${reportBase}.csv`), `${csv}\n`, { mode: 0o600 });
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
  hostingSnapshot?: HostingSnapshot;
}): Promise<string> {
  const directory = path.join(runDirectory(input.config, input.runId), "milestones", input.milestoneId);
  const tasks = input.store.listTasks(input.runId).filter((task) => task.milestone_id === input.milestoneId);
  const requirements = input.store.listRequirements(input.runId);
  const markdown = [
    `# Revisão humana — ${input.milestoneId}`, "",
    `Revisão: \`${input.revision}\``,
    `Verificações automatizadas: **${input.verificationPassed ? "aprovadas" : "falharam"}**`, "",
    ...(input.hostingSnapshot ? [
      "## Versão permanente publicada", "",
      `- URL: ${input.hostingSnapshot.url}`,
      `- Site: \`${input.hostingSnapshot.siteId}\``,
      `- Publicada em: ${input.hostingSnapshot.deployedAt}`, "",
    ] : []),
    "## Entregue", "",
    ...tasks.map((task) => `- ${String(task.id)}: ${String(task.title)} (${String(task.state)})`), "",
    "## Matriz de requisitos", "",
    ...requirements.map((requirement) => `- ${String(requirement.id)} → ${tasks.filter((task) => String(task.requirement_ids_json).includes(String(requirement.id))).map((task) => String(task.id)).join(", ") || "sem tarefa"}`), "",
    "## Roteiro humano", "",
    "1. Inicie o projeto alvo conforme seu README.",
    "2. Teste no snapshot publicado e no celular; registre cada ajuste como um item objetivo, com o comportamento esperado.",
    "3. Para pedir ajustes, importe o arquivo no destino `human-corrections`. O harness cria uma tarefa isolada, preserva as tarefas originais e volta a executar as verificações e o gate humano.",
    `   Exemplo: \`yarn harness feedback import --config harness.config.yaml --run ${input.runId} --milestone ${input.milestoneId} --task human-corrections --file ./feedback.md\``,
    "4. Para aprovar esta revisão exata, use o comando impresso no terminal ou `yarn harness approve` com o hash de revisão acima.",
    "5. Depois do aceite, a próxima etapa exige que a pessoa selecione/crie manualmente o branch desejado e rode `yarn harness resume`; o harness nunca troca de branch.", "",
    "## Decisões e dúvidas", "", "Nenhuma dúvida adicional foi criada automaticamente.", "",
    "## Limitações", "", "A aprovação humana continua necessária. A tarefa `human-corrections` cobre apenas os pedidos enviados no feedback; itens ambíguos devem ser esclarecidos em vez de ampliar o escopo.", "",
    "## Atribuição de trabalho", "", "Consulte `../../work-attribution.md` para tentativas, modelos, arquivos tocados e feedback.", "",
  ].join("\n");
  await writeWorkAttributionReport(input.config, input.store, input.runId, input.milestoneId);
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
  const sessions = store.all<Record<string, unknown>>("SELECT started_at, finished_at, outcome FROM run_sessions WHERE run_id=? ORDER BY started_at", runId);
  const activeDurationMs = sessions.reduce((total, item) => total + Math.max(0, Date.parse(String(item.finished_at ?? run.updated_at)) - Date.parse(String(item.started_at))), 0);
  const calls = store.all<Record<string, unknown>>("SELECT COUNT(*) AS count, SUM(COALESCE(input_tokens,0)) AS input_tokens, SUM(COALESCE(output_tokens,0)) AS output_tokens FROM provider_calls WHERE attempt_id IN (SELECT id FROM attempts WHERE run_id=?)", runId)[0];
  const budget = new BudgetLedger(store, config).snapshot(runId);
  const approvals = store.all<Record<string, unknown>>("SELECT * FROM approvals WHERE run_id=? ORDER BY created_at", runId);
  const findings = store.all<Record<string, unknown>>("SELECT * FROM findings WHERE run_id=? ORDER BY created_at", runId);
  const incomplete = tasks.filter((task) => task.state !== "passed");
  const next = run.state === "awaiting_human"
    ? "Revise milestones/<etapa>/human-review.md; depois aprove a revisão exata ou importe feedback."
    : run.state === "blocked" ? `Execute yarn harness diagnostics --config harness.config.yaml --run ${runId}.`
      : run.state === "paused_budget" ? `Revise yarn harness budget --config harness.config.yaml --run ${runId}; nenhum excedente foi autorizado.`
        : run.state === "completed" ? "Execução concluída; inicie manualmente a próxima etapa/branch quando estiver pronto."
          : `Consulte o estado e retome com yarn harness resume --config harness.config.yaml --run ${runId}.`;
  const markdown = [
    "# Relatório final", "", `Run: ${runId}`, `Estado: **${String(run.state)}**`, `Revisão: ${typeof run.revision === "string" ? run.revision : "n/a"}`, "",
    "## Resumo", "", `- Tarefas: ${tasks.filter((task) => task.state === "passed").length}/${tasks.length} aprovadas; ${incomplete.length} pendentes/bloqueadas.`,
    `- Sessões de controlador: ${sessions.length}; tempo ativo acumulado: ${Math.round(activeDurationMs / 1000)} s (intervalos entre resumes excluídos).`,
    `- Interações com modelos: ${textValue(calls?.count, "0")}; tokens entrada/saída: ${textValue(calls?.input_tokens, "0")}/${textValue(calls?.output_tokens, "0")}.`,
    `- Custo: USD ${formatMicros(budget.confirmedMicros)} confirmado; USD ${formatMicros(budget.uncertainMicros)} incerto.`,
    `- Próximo passo: ${next}`, `- Telemetria detalhada: run-summary.json, model-performance.md, budget-report.md, work-attribution.md.`, "",
    "## Rastreabilidade", "", ...tasks.map((task) => `- ${String(task.requirement_ids_json)} → ${String(task.id)} → ${String(task.state)}`), "",
    "## Aceites", "", ...(approvals.length ? approvals.map((item) => `- ${String(item.milestone_id)}: ${String(item.decision)} por ${String(item.actor)} em ${String(item.created_at)}`) : ["Nenhum aceite humano registrado."]), "",
    "## Achados", "", ...(findings.length ? findings.map((item) => `- [${String(item.severity)}] ${String(item.summary)}`) : ["Nenhum achado persistido."]), "",
    "## Escopo de comprovação", "", "Integrações remotas só são consideradas verificadas quando existe provider_call/evidência real. Simulações não comprovam acesso remoto.", "",
  ].join("\n");
  await writeWorkAttributionReport(config, store, runId);
  const output = path.join(runDirectory(config, runId), "final-report.md");
  await writeFile(output, markdown, { mode: 0o600 });
  return output;
}
