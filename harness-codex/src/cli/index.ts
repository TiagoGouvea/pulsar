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
import { doctor, preflight, writePreflightReport } from "../preflight/doctor.js";
import { probeCandidate } from "../providers/probes.js";
import { loadLmStudioModel, unloadLmStudioModels } from "../providers/lmstudio.js";
import { writeBudgetReport, writeFinalReport } from "../reports/generator.js";
import { StateStore } from "../state/store.js";
import { createId, ensureDirectory, nowUtc, safeError } from "../utils/core.js";
import { captureVisualEvidence } from "../verification/visual.js";
import { currentRevision } from "../git/workspace.js";

const program = new Command();
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

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

program.command("doctor").description("Verifica a máquina sem chamar modelos").action(async () => printChecks(await doctor()));

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
models.command("load").description("Descarrega outros modelos e carrega um candidato local")
  .requiredOption("--config <path>").requiredOption("--alias <alias>").action(async (options: { config: string; alias: string }) => {
    const config = await loadConfig(options.config);
    const candidate = config.models.find((item) => item.alias === options.alias);
    if (!candidate) throw new Error(`Alias desconhecido: ${options.alias}`);
    const results = await loadLmStudioModel(config, candidate);
    console.log(results.map((result) => result.stdout || result.stderr).join("\n"));
  });
models.command("unload").description("Descarrega modelos locais explicitamente")
  .requiredOption("--config <path>").action(async (options: { config: string }) => {
    const result = await unloadLmStudioModels(await loadConfig(options.config));
    if (result.exitCode !== 0) throw new Error(result.stderr || result.stdout);
    console.log(result.stdout || "Modelos descarregados.");
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
      const onInterrupt = (signal: "SIGINT" | "SIGTERM"): void => { void orchestrator.interrupt(runId, signal); };
      const onSigint = (): void => onInterrupt("SIGINT");
      const onSigterm = (): void => onInterrupt("SIGTERM");
      process.once("SIGINT", onSigint); process.once("SIGTERM", onSigterm);
      try {
        await orchestrator.run(runId);
        const run = orchestrator.store.getRun(runId);
        console.log(`Run ${runId}: ${String(run?.state)}`);
      } finally {
        process.removeListener("SIGINT", onSigint); process.removeListener("SIGTERM", onSigterm);
      }
    });
  });

for (const command of ["status", "pause", "resume", "stop"] as const) {
  program.command(command).requiredOption("--config <path>").requiredOption("--run <id>").action(async (options: { config: string; run: string }) => {
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
        store.setRunState(options.run, "running");
        store.close();
        const orchestrator = new Orchestrator(config);
        try { await orchestrator.run(options.run); } finally { orchestrator.close(); }
        console.log("Retomada concluída ou pausada no próximo gate.");
        return;
      }
    } finally {
      try { store.close(); } catch (error: unknown) { void error; }
    }
  });
}

program.command("review").requiredOption("--config <path>").requiredOption("--run <id>").requiredOption("--milestone <id>")
  .action(async (options: { config: string; run: string; milestone: string }) => {
    const config = await loadConfig(options.config);
    console.log(path.join(config.storage.root, "runs", options.run, "milestones", options.milestone, "human-review.md"));
  });

const feedback = program.command("feedback");
feedback.command("import").requiredOption("--config <path>").requiredOption("--run <id>").requiredOption("--file <path>")
  .option("--milestone <id>", "Marco", "stage-a")
  .action(async (options: { config: string; run: string; file: string; milestone: string }) => withOrchestrator(options.config, async (orchestrator) => {
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

program.parseAsync().catch((error: unknown) => {
  console.error(`Erro: ${safeError(error)}`);
  process.exitCode = 1;
});
