import { cp, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { HarnessConfig } from "../config/schema.js";
import type { ExecutionResult, Requirement, Task, TaskState } from "../domain/types.js";
import { BudgetLedger } from "../budget/ledger.js";
import { buildTaskContext } from "../context/builder.js";
import { createExecutor } from "../executors/index.js";
import { currentRevision } from "../git/workspace.js";
import { createTasks, extractRequirements } from "../planning/requirements.js";
import { ModelCatalog } from "../providers/catalog.js";
import { writeBudgetReport, writeFinalReport, writeHumanReview, writePlan } from "../reports/generator.js";
import { assertWorkspace } from "../security/workspace.js";
import { captureInputs } from "../state/inputs.js";
import { StateStore } from "../state/store.js";
import { createId, nowUtc, parseUsdToMicros, safeError, sha256, writeJson } from "../utils/core.js";
import { invalidateStaleVerifications, verifyCommands } from "../verification/commands.js";

const HARNESS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: String(row.id), runId: String(row.run_id), milestoneId: String(row.milestone_id),
    title: String(row.title), description: String(row.description), state: row.state as TaskState,
    role: row.role as Task["role"], requirementIds: JSON.parse(String(row.requirement_ids_json)) as string[],
    dependencies: JSON.parse(String(row.dependencies_json)) as string[],
    acceptanceCriteria: JSON.parse(String(row.acceptance_json)) as string[],
    plannedFiles: JSON.parse(String(row.planned_files_json)) as string[], maxAttempts: Number(row.max_attempts),
  };
}

export class Orchestrator {
  readonly store: StateStore;
  private readonly catalog: ModelCatalog;
  private readonly ledger: BudgetLedger;

  constructor(readonly config: HarnessConfig) {
    this.store = new StateStore(config.storage.root);
    this.catalog = new ModelCatalog(config);
    this.ledger = new BudgetLedger(this.store, config);
  }

  close(): void { this.store.close(); }

  async createRun(): Promise<string> {
    await assertWorkspace(this.config.project.workspace, HARNESS_ROOT);
    this.store.upsertProject({
      id: this.config.project.id, workspace: this.config.project.workspace,
      profile: this.config.project.profile, timezone: this.config.project.timezone,
    });
    const runId = createId("run");
    this.store.createRun({
      id: runId, projectId: this.config.project.id, configPath: this.config.configPath,
      configHash: sha256(await readFile(this.config.configPath)),
    });
    await captureInputs(this.config, this.store, runId);
    return runId;
  }

  async plan(runId?: string): Promise<string> {
    const id = runId ?? await this.createRun();
    this.store.setRunState(id, "planning");
    const requirements = await extractRequirements(this.config);
    for (const requirement of requirements) this.store.saveRequirement(id, requirement);
    this.store.createMilestone(id, { id: "milestone-001", title: "Primeira entrega navegável", objective: "Atender todos os requisitos ativos da especificação.", position: 1 });
    for (const task of createTasks(id, requirements, this.config.execution.maxAttemptsPerTask)) this.store.saveTask(task);
    await writePlan(this.config, this.store, id);
    this.store.event(id, "plan.created", "run", id, { requirements: requirements.length });
    return id;
  }

  async run(runId?: string): Promise<string> {
    const id = runId ?? await this.plan();
    const run = this.store.getRun(id);
    if (!run) throw new Error(`Run inexistente: ${id}`);
    if (["completed", "cancelled", "failed", "awaiting_human"].includes(String(run.state))) return id;
    const owner = `${process.pid}:${createId("lease")}`;
    if (!this.store.acquireLease(id, owner, this.config.execution.staleHeartbeatSeconds)) {
      throw new Error("Esta execução já possui um controlador ativo.");
    }
    const heartbeat = setInterval(() => this.store.heartbeat(id, owner, this.config.execution.staleHeartbeatSeconds), Math.max(5_000, this.config.execution.staleHeartbeatSeconds * 500));
    try {
      await this.reconcileRevision(id);
      this.store.setRunState(id, "running");
      this.store.setMilestoneState(id, "milestone-001", "in_progress");
      const requirements = this.loadRequirements(id);
      let pending = this.store.listTasks(id).filter((row) => ["pending", "ready", "changes_requested", "failed"].includes(String(row.state)));
      while (pending.length > 0) {
        const control = this.applyControlCommands(id);
        if (control === "stop") return id;
        const rows = this.store.listTasks(id);
        const passedIds = new Set(rows.filter((row) => row.state === "passed").map((row) => String(row.id)));
        const readyRow = pending.find((row) => (JSON.parse(String(row.dependencies_json)) as string[]).every((dependency) => passedIds.has(dependency)));
        if (!readyRow) {
          this.store.setRunState(id, "blocked", { cause: "unresolved_dependencies" });
          return id;
        }
        const task = rowToTask(readyRow);
        const shouldContinue = await this.executeTask(id, task, requirements);
        if (!shouldContinue) return id;
        pending = this.store.listTasks(id).filter((row) => ["pending", "ready", "changes_requested", "failed"].includes(String(row.state)));
      }
      return await this.finishMilestone(id);
    } catch (error) {
      this.store.setRunState(id, "blocked", { error: safeError(error) });
      throw error;
    } finally {
      clearInterval(heartbeat);
      this.store.releaseLease(id, owner);
      await writeBudgetReport(this.config, this.store, id).catch(() => undefined);
    }
  }

  private loadRequirements(runId: string): Requirement[] {
    return this.store.listRequirements(runId).map((row) => ({
      id: String(row.id), sourcePath: String(row.source_path), sourceSection: String(row.source_section),
      description: String(row.description), priority: row.priority as Requirement["priority"],
      acceptanceCriteria: JSON.parse(String(row.acceptance_json)) as string[],
      risks: JSON.parse(String(row.risks_json)) as string[], dependencies: JSON.parse(String(row.dependencies_json)) as string[],
      verificationMethod: String(row.verification_method),
    }));
  }

  private async executeTask(runId: string, task: Task, requirements: Requirement[]): Promise<boolean> {
    const priorAttempts = this.store.all<Record<string, unknown>>("SELECT * FROM attempts WHERE run_id=? AND task_id=? ORDER BY number", runId, task.id);
    if (priorAttempts.length >= task.maxAttempts) {
      this.store.setTaskState(runId, task.id, "blocked");
      this.store.setRunState(runId, "blocked", { cause: "max_attempts", taskId: task.id });
      return false;
    }
    const candidate = this.catalog.select(task.role, ["text", "tools"]);
    const attemptNumber = priorAttempts.length + 1;
    const attemptId = createId("attempt");
    const attemptDirectory = path.join(this.config.storage.root, "runs", runId, "tasks", task.id, `attempt-${String(attemptNumber).padStart(3, "0")}`);
    await mkdir(attemptDirectory, { recursive: true });
    const prompt = await buildTaskContext({ config: this.config, store: this.store, runId, task, requirements, attemptDirectory });
    const estimated = this.ledger.estimate(candidate, Math.ceil(prompt.length / 4), candidate.maxOutputTokens);
    let reservationId: string;
    try {
      reservationId = this.ledger.reserve(runId, task.id, candidate, estimated);
    } catch (error) {
      this.store.setRunState(runId, "paused_budget", { taskId: task.id, error: safeError(error) });
      return false;
    }
    this.store.run(
      "INSERT INTO attempts(id, run_id, task_id, number, executor, candidate_key, status, started_at) VALUES (?, ?, ?, ?, ?, ?, 'running', ?)",
      attemptId, runId, task.id, attemptNumber, candidate.executor, `${candidate.executor}:${candidate.provider}:${candidate.modelId}:${candidate.version ?? "current"}`, nowUtc(),
    );
    this.store.setTaskState(runId, task.id, "running");
    const executor = createExecutor(this.config);
    const started = performance.now();
    const result = await executor.execute({
      runId, attemptId, task, workspace: this.config.project.workspace, prompt, candidate,
      timeoutMs: this.config.execution.taskTimeoutMinutes * 60_000, outputDirectory: attemptDirectory,
    });
    await writeJson(path.join(attemptDirectory, "result.json"), result);
    const failureSignature = result.outcome === "ready_for_verification" ? null : sha256(`${result.outcome}:${result.summary}:${result.blockers.join(",")}`);
    this.store.run(
      "UPDATE attempts SET status=?, failure_signature=?, result_json=?, finished_at=? WHERE id=?",
      result.outcome, failureSignature, JSON.stringify(result), nowUtc(), attemptId,
    );
    const actualMicros = parseUsdToMicros(result.usage?.costUsd ?? "0") ?? 0n;
    const uncertain = candidate.modality === "metered_api" && result.outcome === "failed" && !result.usage;
    this.ledger.reconcile({ runId, taskId: task.id, reservationId, amountMicros: uncertain ? estimated : actualMicros, uncertain });
    this.store.run(
      "INSERT INTO routing_observations(id, run_id, attempt_id, candidate_key, role, task_category, duration_ms, cost_micros, outcome, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      createId("route"), runId, attemptId, candidate.alias, task.role, "implementation", Math.round(performance.now() - started), actualMicros, result.outcome, nowUtc(),
    );
    if (result.outcome !== "ready_for_verification") return this.handleFailure(runId, task, priorAttempts, failureSignature, result);
    this.store.setTaskState(runId, task.id, "verifying");
    const verification = await verifyCommands({
      config: this.config, store: this.store, runId, taskId: task.id,
      commandNames: this.config.commands.test ? ["test"] : [], outputDirectory: attemptDirectory,
    });
    if (!verification.passed) {
      this.store.setTaskState(runId, task.id, "changes_requested");
      return true;
    }
    this.store.setTaskState(runId, task.id, "passed");
    return true;
  }

  private handleFailure(runId: string, task: Task, previous: Record<string, unknown>[], signature: string | null, result: ExecutionResult): boolean {
    const sameFailures = previous.filter((attempt) => attempt.failure_signature === signature).length + 1;
    if (result.outcome === "blocked" || sameFailures >= this.config.execution.maxSameFailureCount) {
      this.store.setTaskState(runId, task.id, "blocked");
      this.store.setRunState(runId, "blocked", { taskId: task.id, cause: result.blockers, sameFailures });
      return false;
    }
    this.store.setTaskState(runId, task.id, "failed");
    return true;
  }

  private async finishMilestone(runId: string): Promise<string> {
    this.store.setRunState(runId, "verifying");
    this.store.setMilestoneState(runId, "milestone-001", "automated_review");
    const output = path.join(this.config.storage.root, "runs", runId, "milestones", "milestone-001", "automated-review");
    const verification = await verifyCommands({
      config: this.config, store: this.store, runId,
      commandNames: ["typecheck", "lint", "test", "build", "e2e"], outputDirectory: output,
    });
    const revision = verification.revision;
    this.store.run("UPDATE runs SET revision=?, updated_at=? WHERE id=?", revision, nowUtc(), runId);
    if (!verification.passed) {
      this.store.setMilestoneState(runId, "milestone-001", "changes_requested", revision);
      this.store.setRunState(runId, "blocked", { cause: "milestone_verification_failed" });
      return runId;
    }
    if (this.config.execution.humanGate === "every_milestone" || this.config.execution.humanGate === "final_only") {
      this.store.setMilestoneState(runId, "milestone-001", "awaiting_human", revision);
      this.store.setRunState(runId, "awaiting_human");
      await writeHumanReview({ config: this.config, store: this.store, runId, milestoneId: "milestone-001", revision, verificationPassed: true });
      return runId;
    }
    this.store.setMilestoneState(runId, "milestone-001", "approved", revision);
    this.store.setRunState(runId, "completed");
    await writeFinalReport(this.config, this.store, runId);
    return runId;
  }

  private applyControlCommands(runId: string): "continue" | "stop" {
    for (const command of this.store.pendingCommands(runId)) {
      const value = String(command.command);
      this.store.handleCommand(String(command.id));
      if (value === "pause") { this.store.setRunState(runId, "paused"); return "stop"; }
      if (value === "cancel") { this.store.setRunState(runId, "cancelled"); return "stop"; }
    }
    return "continue";
  }

  private async reconcileRevision(runId: string): Promise<void> {
    const revision = await currentRevision(this.config.project.workspace);
    const invalidated = invalidateStaleVerifications(this.store, runId, revision);
    if (invalidated) this.store.event(runId, "workspace.changed", "run", runId, { revision, invalidated });
  }

  async approve(runId: string, milestoneId: string, revision: string, actor: string): Promise<void> {
    const milestone = this.store.get<Record<string, unknown>>("SELECT * FROM milestones WHERE run_id=? AND id=?", runId, milestoneId);
    if (!milestone) throw new Error("Marco inexistente.");
    const current = await currentRevision(this.config.project.workspace);
    if (revision !== milestone.revision || revision !== current) throw new Error("A revisão mudou; execute novamente as verificações antes de aprovar.");
    this.store.createApproval({ runId, milestoneId, revision, decision: "approved", actor, scope: "milestone" });
    this.store.setMilestoneState(runId, milestoneId, "approved", revision);
    this.store.setRunState(runId, "completed");
    await writeFinalReport(this.config, this.store, runId);
  }

  async importFeedback(runId: string, source: string, milestoneId = "milestone-001"): Promise<string> {
    const content = await readFile(source, "utf8");
    if (!content.trim()) throw new Error("Feedback vazio.");
    const directory = path.join(this.config.storage.root, "runs", runId, "milestones", milestoneId);
    await mkdir(directory, { recursive: true });
    const destination = path.join(directory, `human-feedback-${Date.now()}.md`);
    await cp(source, destination, { errorOnExist: true });
    const revision = await currentRevision(this.config.project.workspace);
    this.store.createApproval({ runId, milestoneId, revision, decision: "changes_requested", actor: process.env.USER ?? "human", scope: "milestone", feedbackPath: destination });
    this.store.setMilestoneState(runId, milestoneId, "changes_requested", revision);
    this.store.setRunState(runId, "paused");
    return destination;
  }
}
