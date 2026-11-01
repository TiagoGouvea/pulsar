#!/usr/bin/env node
import { spawn } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { parse, stringify } from "yaml";
import { loadConfig } from "../config/load.js";
import { startDashboard } from "../dashboard/server.js";
import { Orchestrator } from "../orchestrator/controller.js";
import { reconcileInterruptedCall } from "../orchestrator/reconcile.js";
import { doctor, preflight, writePreflightReport } from "../preflight/doctor.js";
import { probeCandidate } from "../providers/probes.js";
import { loadLmStudioModel, unloadLmStudioModels } from "../providers/lmstudio.js";
import { writeBudgetReport, writeFinalReport, writeModelPerformanceReport, writeWorkAttributionReport } from "../reports/generator.js";
import { testLocalModels, testStructuredLocalModels, writeLocalModelTestReport, writeStructuredOutputTestReport } from "../providers/local-model-test.js";
import { StateStore } from "../state/store.js";
import { createId, ensureDirectory, formatMicros, nowUtc, safeError } from "../utils/core.js";
import { captureVisualEvidence } from "../verification/visual.js";
import { currentRevision } from "../git/workspace.js";

const program = new Command();
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function loadProjectEnvironment(): void {
  const envPath = path.join(packageRoot, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    const key = match[1];
    let value = match[2] ?? "";
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "");
    }
    if (key) process.env[key] = value;
  }
}

loadProjectEnvironment();

program.name("harness").description("Harness local de desenvolvimento autônomo").version("0.1.0");

program.command("init")
  .description("Cria uma configuração inicial sem alterar o projeto alvo")
  .requiredOption("--project <path>", "Diretório do projeto alvo")
  .option("--output <path>", "Arquivo de configuração", "harness.config.yaml")
  .action((options: { project: string; output: string }) => {
    if (existsSync(options.output)) throw new Error(`Arquivo já existe: ${options.output}`);
    const example = parse(readFileSync(path.join(packageRoot, "harness.config.example.yaml"), "utf8")) as Record<string, Record<string, unknown>>;
    if (!example.project) throw new Error("Template sem bloco project.");
    example.project.workspace = path.resolve(options.project);
    writeFileSync(options.output, stringify(example), { mode: 0o600 });
    console.log(`Configuração criada: ${path.resolve(options.output)}`);
  });

program.command("doctor").description("Verifica a máquina e, com --config, o Git sem chamar modelos")
  .option("--config <path>")
  .action(async (options: { config?: string }) => {
    const config = options.config ? await loadConfig(options.config) : undefined;
    const checks = await doctor(config);
    printChecks(checks);
    if (checks.some((check) => check.status === "block" && check.importance === "required")) process.exitCode = 2;
  });

program.command("preflight")
  .description("Valida configuração, ambiente e candidatos")
  .requiredOption("--config <path>")
  .action(async (options: { config: string }) => {
    const config = await loadConfig(options.config);
    await ensureDirectory(config.storage.root);
    const checks = await preflight(config);
    await writePreflightReport(config, checks);
    printChecks(checks);
    if (checks.some((check) => check.status === "block" && check.importance === "required")) process.exitCode = 2;
  });

const models = program.command("models").description("Catálogo e probes de modelos");
models.command("list").requiredOption("--config <path>").action(async (options: { config: string }) => {
  const config = await loadConfig(options.config);
  console.table(config.models.map(({ alias, executor, provider, modelId, modality, enabled, capabilities }) => ({ alias, executor, provider, modelId, modality, enabled, capabilities: capabilities.join(",") })));
});
models.command("probe").requiredOption("--config <path>").requiredOption("--alias <alias>")
  .option("--inference", "Executa smoke tests reais de texto e ferramentas")
  .action(async (options: { config: string; alias: string; inference?: boolean }) => {
    const config = await loadConfig(options.config);
    const candidate = config.models.find((item) => item.alias === options.alias);
    if (!candidate) throw new Error(`Alias desconhecido: ${options.alias}`);
    printChecks(await probeCandidate(config, candidate, { inference: options.inference ?? false }));
  });
models.command("test-local")
  .description("Testa sequencialmente modelos locais pela API, medindo carga e resposta")
  .requiredOption("--config <path>")
  .option("--alias <alias>", "Testa somente um alias local")
  .action(async (options: { config: string; alias?: string }) => {
    const config = await loadConfig(options.config);
    const candidates = config.models.filter((item) => item.enabled && item.modality === "local" && (!options.alias || item.alias === options.alias));
    if (options.alias && !candidates.length) throw new Error(`Alias local habilitado não encontrado: ${options.alias}`);
    const results = await testLocalModels(config, candidates, (message) => console.log(message));
    const report = await writeLocalModelTestReport(config, results);
    console.table(results.map(({ alias, modelId, status, loadDurationMs, responseDurationMs, generationDurationMs, response, error }) => ({
      alias, modelId, status, cargaMs: loadDurationMs, respostaMs: responseDurationMs,
      geracaoMs: generationDurationMs, resposta: response, erro: error,
    })));
    console.log(`Relatório: ${report}`);
    if (results.some((item) => item.status !== "passed")) process.exitCode = 2;
  });
models.command("test-json")
  .description("Valida JSON Schema estrito e reporta o canal de saída nos modelos locais")
  .requiredOption("--config <path>")
  .option("--alias <alias>", "Testa somente um alias local")
  .action(async (options: { config: string; alias?: string }) => {
    const config = await loadConfig(options.config);
    const candidates = config.models.filter((item) => item.enabled && item.modality === "local" && (!options.alias || item.alias === options.alias));
    if (options.alias && !candidates.length) throw new Error(`Alias local habilitado não encontrado: ${options.alias}`);
    const { results, lifecycle } = await testStructuredLocalModels(config, candidates, (message) => console.log(message));
    const report = await writeStructuredOutputTestReport(config, results, lifecycle);
    console.table(results.map(({ alias, variant, endpoint, status, outputChannel, durationMs, error }) => ({ alias, variant, endpoint, status, canal: outputChannel, durationMs, error })));
    console.log(`Relatório: ${report}`);
    if (results.some((item) => !["passed", "passed_reasoning_channel", "unsupported"].includes(item.status))) process.exitCode = 2;
  });
models.command("load").description("Descarrega outros modelos e carrega um candidato local")
  .requiredOption("--config <path>").requiredOption("--alias <alias>").action(async (options: { config: string; alias: string }) => {
    const config = await loadConfig(options.config);
    const candidate = config.models.find((item) => item.alias === options.alias);
    if (!candidate) throw new Error(`Alias desconhecido: ${options.alias}`);
    const results = await loadLmStudioModel(config, candidate);
    console.table(results.map((result) => ({ action: result.action, modelId: result.modelId, durationMs: result.durationMs })));
  });
models.command("unload").description("Descarrega modelos locais explicitamente")
  .requiredOption("--config <path>").action(async (options: { config: string }) => {
    const result = await unloadLmStudioModels(await loadConfig(options.config));
    console.table(result.map((item) => ({ action: item.action, modelId: item.modelId, durationMs: item.durationMs })));
  });
models.command("performance").description("Gera o índice de sucesso técnico por modelo")
  .requiredOption("--config <path>").requiredOption("--run <id>")
  .option("--milestone <id>", "Filtra uma etapa específica")
  .action(async (options: { config: string; run: string; milestone?: string }) => {
    const config = await loadConfig(options.config);
    const store = new StateStore(config.storage.root);
    try { console.log(await writeModelPerformanceReport(config, store, options.run, options.milestone)); } finally { store.close(); }
  });

program.command("plan").description("Extrai requisitos e cria o plano rastreável")
  .requiredOption("--config <path>").action(async (options: { config: string }) => withOrchestrator(options.config, async (orchestrator) => {
    const runId = await orchestrator.plan();
    console.log(`Plano criado. Run: ${runId}`);
  }));

program.command("run").description("Executa ou retoma o controlador")
  .requiredOption("--config <path>").option("--run <id>").option("--background", "Executa em processo gerenciado")
  .action(async (options: { config: string; run?: string; background?: boolean }) => {
    const config = await loadConfig(options.config);
    if (options.background) {
      const orchestrator = new Orchestrator(config);
      const runId = options.run ?? await orchestrator.plan();
      orchestrator.close();
      const logsDirectory = path.join(config.storage.root, "runs", runId);
      await ensureDirectory(logsDirectory);
      const logFd = openSync(path.join(logsDirectory, "controller.log"), "a", 0o600);
      const child = spawn("yarn", ["harness", "run", "--config", config.configPath, "--run", runId], {
        cwd: packageRoot, detached: true, stdio: ["ignore", logFd, logFd], env: process.env,
      });
      child.unref(); closeSync(logFd);
      console.log(`Run ${runId} iniciado em background (PID ${child.pid ?? "desconhecido"}).`);
      return;
    }
    await withOrchestrator(config.configPath, async (orchestrator) => {
      const runId = options.run ?? await orchestrator.plan();
      const onInterrupt = (signal: "SIGINT" | "SIGTERM" | "SIGHUP"): void => { void orchestrator.interrupt(runId, signal); };
      const onSigint = (): void => onInterrupt("SIGINT");
      const onSigterm = (): void => onInterrupt("SIGTERM");
      const onSighup = (): void => onInterrupt("SIGHUP");
      process.once("SIGINT", onSigint); process.once("SIGTERM", onSigterm); process.once("SIGHUP", onSighup);
      try {
        await orchestrator.run(runId);
        const run = orchestrator.store.getRun(runId);
        printRunOutcome(orchestrator.store, runId, String(run?.state), config.storage.root);
      } finally {
        process.removeListener("SIGINT", onSigint); process.removeListener("SIGTERM", onSigterm); process.removeListener("SIGHUP", onSighup);
      }
    });
  });

for (const command of ["status", "pause", "resume", "stop"] as const) {
  const commandBuilder = program.command(command).requiredOption("--config <path>").requiredOption("--run <id>");
  if (command === "resume") {
    commandBuilder.option("--retry-review <task-id>", "Continua a revisão independente pelos modelos elegíveis ainda não tentados");
  }
  commandBuilder.action(async (options: { config: string; run: string; retryReview?: string }) => {
    const config = await loadConfig(options.config);
    const store = new StateStore(config.storage.root);
    try {
      const run = store.getRun(options.run);
      if (!run) throw new Error("Run inexistente.");
      if (command === "status") {
        console.log(JSON.stringify({ run, milestones: store.listMilestones(options.run), tasks: store.listTasks(options.run) }, null, 2));
      } else if (command === "pause") {
        store.enqueueCommand(options.run, "pause"); store.setRunState(options.run, "paused"); console.log("Pausa solicitada.");
      } else if (command === "stop") {
        store.enqueueCommand(options.run, "cancel"); store.setRunState(options.run, "cancelled"); console.log("Cancelamento solicitado.");
      } else {
        if (run.state === "awaiting_human") throw new Error("A run aguarda aprovação ou feedback humano; resume não ignora esse gate.");
        store.close();
        const orchestrator = new Orchestrator(config);
        try {
          await orchestrator.run(options.run, options.retryReview ? { retryReviewTaskId: options.retryReview } : {});
          printRunOutcome(orchestrator.store, options.run, String(orchestrator.store.getRun(options.run)?.state), config.storage.root);
        } finally { orchestrator.close(); }
        return;
      }
    } finally {
      try { store.close(); } catch (error: unknown) { void error; }
    }
  });
}

program.command("worklog").description("Gera o registro de trabalho e atribuição por modelo")
  .requiredOption("--config <path>").requiredOption("--run <id>")
  .option("--milestone <id>", "Filtra uma etapa específica")
  .action(async (options: { config: string; run: string; milestone?: string }) => {
    const config = await loadConfig(options.config);
    const store = new StateStore(config.storage.root);
    try { console.log(await writeWorkAttributionReport(config, store, options.run, options.milestone)); }
    finally { store.close(); }
  });

program.command("review").requiredOption("--config <path>").requiredOption("--run <id>").requiredOption("--milestone <id>")
  .action(async (options: { config: string; run: string; milestone: string }) => {
    const config = await loadConfig(options.config);
    console.log(path.join(config.storage.root, "runs", options.run, "milestones", options.milestone, "human-review.md"));
  });

const hosting = program.command("hosting").description("Publicação permanente de snapshots por versão");
hosting.command("snapshot").requiredOption("--config <path>").requiredOption("--run <id>").requiredOption("--milestone <id>")
  .description("Publica uma versão já verificada em um site Hosting exclusivo e permanente")
  .action(async (options: { config: string; run: string; milestone: string }) => withOrchestrator(options.config, async (orchestrator) => {
    const snapshot = await orchestrator.publishHostingSnapshotForReview(options.run, options.milestone);
    console.log(`Versão publicada: ${snapshot.url}`);
    console.log(`Site: ${snapshot.siteId} · etapa ${snapshot.milestoneId} · revisão ${snapshot.revision}`);
  }));

const feedback = program.command("feedback");
feedback.command("import").requiredOption("--config <path>").requiredOption("--run <id>").requiredOption("--file <path>")
  .option("--milestone <id>", "Marco; por padrão usa o primeiro configurado")
  .action(async (options: { config: string; run: string; file: string; milestone?: string }) => withOrchestrator(options.config, async (orchestrator) => {
    console.log(await orchestrator.importFeedback(options.run, path.resolve(options.file), options.milestone));
  }));

program.command("approve").requiredOption("--config <path>").requiredOption("--run <id>").requiredOption("--milestone <id>").requiredOption("--revision <revision>")
  .action(async (options: { config: string; run: string; milestone: string; revision: string }) => withOrchestrator(options.config, async (orchestrator) => {
    await orchestrator.approve(options.run, options.milestone, options.revision, process.env.USER ?? "human");
    console.log("Aprovação registrada para a revisão exata.");
  }));

program.command("budget").requiredOption("--config <path>").requiredOption("--run <id>").action(async (options: { config: string; run: string }) => {
  const config = await loadConfig(options.config); const store = new StateStore(config.storage.root);
  try { console.log(await writeBudgetReport(config, store, options.run)); } finally { store.close(); }
});

program.command("report").requiredOption("--config <path>").requiredOption("--run <id>").action(async (options: { config: string; run: string }) => {
  const config = await loadConfig(options.config); const store = new StateStore(config.storage.root);
  try { console.log(await writeFinalReport(config, store, options.run)); } finally { store.close(); }
});

program.command("diagnostics").description("Mostra o evento de bloqueio e a tentativa relevante mais recente")
  .requiredOption("--config <path>").requiredOption("--run <id>").option("--task <id>")
  .action(async (options: { config: string; run: string; task?: string }) => {
    const config = await loadConfig(options.config);
    const store = new StateStore(config.storage.root);
    try {
      const blockedEvent = store.get<Record<string, unknown>>(
        "SELECT sequence, payload_json FROM events WHERE run_id=? AND type='run.blocked' ORDER BY sequence DESC LIMIT 1",
        options.run,
      );
      let blocker = typeof blockedEvent?.payload_json === "string"
        ? JSON.parse(blockedEvent.payload_json) as Record<string, unknown>
        : {};
      const reconciliation = store.get<Record<string, unknown>>(
        "SELECT sequence, payload_json FROM events WHERE run_id=? AND type='task.interruption_reconciled' ORDER BY sequence DESC LIMIT 1",
        options.run,
      );
      if (reconciliation && Number(reconciliation.sequence) > Number(blockedEvent?.sequence ?? 0)) {
        const payload = typeof reconciliation.payload_json === "string"
          ? JSON.parse(reconciliation.payload_json) as Record<string, unknown>
          : {};
        if (payload.retryable === true) blocker = { cause: "task_retry_ready", taskId: payload.taskId ?? reconciliation.entity_id };
      }
      if (blocker.cause === "milestone_verification_failed") {
        const verifier = store.get<Record<string, unknown>>(
          "SELECT verifier_id, status, exit_code, output_path, started_at, finished_at FROM verifier_runs WHERE run_id=? AND status='failed' ORDER BY started_at DESC LIMIT 1",
          options.run,
        );
        console.log(JSON.stringify({ blocker, verifier: verifier ?? null }, null, 2));
        return;
      }
      const blockedTask = typeof blocker.taskId === "string" ? blocker.taskId : undefined;
      const taskId = options.task ?? blockedTask;
      const taskClause = taskId ? " AND (a.task_id=? OR a.task_id=?)" : "";
      const failedOnly = ["max_attempts", "interrupted_attempt_requires_reconciliation"].includes(String(blocker.cause))
        ? ""
        : " AND a.status='failed'";
      const params = taskId ? [options.run, taskId, `${taskId}-review`] : [options.run];
      const attempt = store.get<Record<string, unknown>>(
        `SELECT a.*, pc.provider, pc.model_id, pc.state AS provider_state
         FROM attempts a LEFT JOIN provider_calls pc ON pc.attempt_id=a.id
         WHERE a.run_id=?${failedOnly}${taskClause}
         ORDER BY a.started_at DESC LIMIT 1`,
        ...params,
      );
      if (!attempt) throw new Error("Nenhuma tentativa relevante encontrada.");
      const result = typeof attempt.result_json === "string"
        ? JSON.parse(attempt.result_json) as Record<string, unknown>
        : null;
      console.log(JSON.stringify({
        blocker,
        attemptId: attempt.id, taskId: attempt.task_id, number: attempt.number,
        status: attempt.status,
        candidate: attempt.candidate_key, provider: attempt.provider, modelId: attempt.model_id,
        providerState: attempt.provider_state, startedAt: attempt.started_at, finishedAt: attempt.finished_at,
        summary: result?.summary ?? null, blockers: result?.blockers ?? [], diagnostics: result?.diagnostics ?? null,
      }, null, 2));
    } finally { store.close(); }
  });

program.command("reconcile-call")
  .description("Reconcilia uma cobrança incerta do provedor e, opcionalmente, libera a tarefa interrompida para retentativa")
  .requiredOption("--config <path>")
  .requiredOption("--run <id>")
  .requiredOption("--call <id>", "ID exato da chamada exibido pelo diagnóstico")
  .requiredOption("--actual-cost <usd>", "Custo real confirmado no Activity do provedor; use 0 se não houve cobrança")
  .requiredOption("--note <text>", "Evidência breve usada na reconciliação")
  .option("--input-tokens <n>")
  .option("--output-tokens <n>")
  .option("--retry-task", "Marca como falha técnica a tentativa interrompida sem resultado e libera a tarefa para resume")
  .action(async (options: {
    config: string; run: string; call: string; actualCost: string; note: string;
    inputTokens?: string; outputTokens?: string; retryTask?: boolean;
  }) => {
    const config = await loadConfig(options.config);
    const store = new StateStore(config.storage.root);
    try {
      const result = reconcileInterruptedCall(store, {
        runId: options.run,
        providerCallId: options.call,
        actualCostUsd: options.actualCost,
        note: options.note,
        ...(options.inputTokens === undefined ? {} : { inputTokens: Number(options.inputTokens) }),
        ...(options.outputTokens === undefined ? {} : { outputTokens: Number(options.outputTokens) }),
        retryInterruptedTask: options.retryTask ?? false,
      });
      console.log(`Chamada reconciliada · ${result.providerCallId} · task ${result.taskId} · tentativa ${result.attemptNumber} · USD ${formatMicros(BigInt(result.actualCostMicros))}${result.taskMadeRetryable ? " · tarefa pronta para resume" : ""}.`);
    } finally { store.close(); }
  });

program.command("dashboard").requiredOption("--config <path>").requiredOption("--run <id>").action(async (options: { config: string; run: string }) => {
  const config = await loadConfig(options.config); const dashboard = await startDashboard(config, options.run);
  console.log(`Painel: ${dashboard.url}`); console.log(`Token da sessão: ${dashboard.token}`);
});

program.command("visual").description("Captura screenshots e checagens estruturais reais")
  .requiredOption("--config <path>").requiredOption("--run <id>").requiredOption("--url <url>")
  .action(async (options: { config: string; run: string; url: string }) => {
    const config = await loadConfig(options.config);
    const output = path.join(config.storage.root, "runs", options.run, "visual");
    const evidence = await captureVisualEvidence({ config, url: options.url, outputDirectory: output });
    const store = new StateStore(config.storage.root);
    try {
      const revision = await currentRevision(config.project.workspace);
      const violations = evidence.flatMap((item) => item.accessibilityViolations.map((violation) => ({ viewport: item.viewport, violation })));
      const structuralFailures = evidence.filter((item) => item.horizontalOverflow || item.consoleErrors.length || item.failedRequests.length);
      const verifierId = createId("verification");
      const passed = violations.length === 0 && structuralFailures.length === 0;
      store.run(
        `INSERT INTO verifier_runs(id, run_id, revision, verifier_id, verifier_version, status, output_path, started_at, finished_at)
         VALUES (?, ?, ?, 'visual-structural', '1', ?, ?, ?, ?)`,
        verifierId, options.run, revision, passed ? "passed" : "failed", path.join(output, "visual-evidence.json"), nowUtc(), nowUtc(),
      );
      for (const finding of violations) {
        store.run(
          "INSERT INTO findings(id, run_id, verifier_run_id, severity, category, summary, evidence_path, state, created_at) VALUES (?, ?, ?, 'serious', 'accessibility', ?, ?, 'open', ?)",
          createId("finding"), options.run, verifierId, `${finding.violation.id} em ${finding.viewport}px: ${finding.violation.targets.join(", ")}`, path.join(output, "visual-evidence.json"), nowUtc(),
        );
      }
      if (!passed) {
        const activeMilestone = store.listMilestones(options.run).find((item) => item.state !== "approved");
        if (activeMilestone) store.setMilestoneState(options.run, String(activeMilestone.id), "changes_requested", revision);
        store.setRunState(options.run, "blocked", { cause: "visual_verification_failed" });
      }
    } finally { store.close(); }
    console.log(JSON.stringify(evidence, null, 2));
  });

async function withOrchestrator(configPath: string, work: (orchestrator: Orchestrator) => Promise<void>): Promise<void> {
  const orchestrator = new Orchestrator(await loadConfig(configPath));
  try { await work(orchestrator); } finally { orchestrator.close(); }
}

function printChecks(checks: Array<{ status: string; id: string; summary: string; evidence: string }>): void {
  for (const check of checks) console.log(`[${check.status.toUpperCase()}] ${check.id}: ${check.summary}\n  ${check.evidence}`);
}

function printRunOutcome(store: StateStore, runId: string, state: string, storageRoot: string): void {
  console.log(`[${nowUtc()}] Run ${runId}: ${state}`);
  const runDirectory = path.join(storageRoot, "runs", runId);
  if (state === "awaiting_human") {
    const milestone = store.listMilestones(runId).find((item) => item.state === "awaiting_human");
    const milestoneId = typeof milestone?.id === "string" ? milestone.id : "etapa";
    console.log(`Próximo passo: revise ${path.join(runDirectory, "milestones", milestoneId, "human-review.md")} e use yarn harness approve ou feedback import.`);
  } else if (state === "paused_budget") {
    console.log(`Próximo passo: veja yarn harness budget --config harness.config.yaml --run ${runId}; não houve autorização para exceder o teto.`);
  } else if (state === "completed") {
    console.log(`Sucesso. Relatório: ${path.join(runDirectory, "final-report.md")}`);
  } else if (state === "paused") {
    console.log(`Pausado. Retome com yarn harness resume --config harness.config.yaml --run ${runId}.`);
  }
  if (state !== "blocked") return;
  const event = store.get<Record<string, unknown>>(
    "SELECT payload_json FROM events WHERE run_id=? AND type='run.blocked' ORDER BY sequence DESC LIMIT 1",
    runId,
  );
  if (typeof event?.payload_json !== "string") return;
  const payload = JSON.parse(event.payload_json) as Record<string, unknown>;
  const cause = typeof payload.cause === "string" ? payload.cause : "causa não informada";
  const task = typeof payload.taskId === "string" ? ` (${payload.taskId})` : "";
  console.log(`Bloqueio: ${cause}${task}`);
  if (typeof payload.command === "string") console.log(`Comando: ${payload.command}`);
  if (typeof payload.outputPath === "string") console.log(`Log: ${payload.outputPath}`);
  console.log(`Diagnóstico: yarn harness diagnostics --config harness.config.yaml --run ${runId}`);
}

program.parseAsync().catch((error: unknown) => {
  console.error(`Erro: ${safeError(error)}`);
  process.exitCode = 1;
});
