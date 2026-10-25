import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { HarnessConfig } from "../config/schema.js";
import type { ExecutionResult, Requirement, Task, TaskState } from "../domain/types.js";
import { BudgetLedger } from "../budget/ledger.js";
import { buildTaskContext } from "../context/builder.js";
import { createExecutor } from "../executors/index.js";
import type { Executor } from "../executors/types.js";
import { checkpointFiles, currentRevision, inspectGitWorkspace } from "../git/workspace.js";
import { createTasks, extractRequirements, milestoneFromRequirementId } from "../planning/requirements.js";
import { ModelCatalog } from "../providers/catalog.js";
import { writeBudgetReport, writeFinalReport, writeHumanReview, writePlan } from "../reports/generator.js";
import { assertWorkspace } from "../security/workspace.js";
import { captureInputs, detectInputChanges } from "../state/inputs.js";
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
  private activeExecutor: Executor | undefined;

  constructor(readonly config: HarnessConfig) {
    this.store = new StateStore(config.storage.root);
    this.catalog = new ModelCatalog(config);
    this.ledger = new BudgetLedger(this.store, config);
  }

  close(): void { this.store.close(); }

  async interrupt(runId: string, signal: "SIGINT" | "SIGTERM"): Promise<void> {
    this.store.enqueueCommand(runId, "pause", { signal });
    this.store.event(runId, "run.interrupt_requested", "run", runId, { signal });
    await this.activeExecutor?.cancel?.();
  }

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
    const git = await inspectGitWorkspace(this.config.project.workspace, HARNESS_ROOT);
    this.store.event(runId, "git.workspace_inspected", "run", runId, git);
    return runId;
  }

  async plan(runId?: string): Promise<string> {
    const id = runId ?? await this.createRun();
    this.store.setRunState(id, "planning");
    const requirements = await extractRequirements(this.config);
    for (const requirement of requirements) this.store.saveRequirement(id, requirement);
    for (const [position, milestone] of this.config.project.milestones.entries()) {
      this.store.createMilestone(id, { ...milestone, position: position + 1 });
    }
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
    const inputChanges = await detectInputChanges(this.config, this.store, id);
    if (inputChanges.length) {
      this.store.event(id, "inputs.changed", "run", id, { changes: inputChanges });
      this.store.setRunState(id, "blocked", { cause: "inputs_changed_replan_required", changes: inputChanges });
      return id;
    }
    const owner = `${process.pid}:${createId("lease")}`;
    if (!this.store.acquireLease(id, owner, this.config.execution.staleHeartbeatSeconds)) {
      throw new Error("Esta execução já possui um controlador ativo.");
    }
    const heartbeat = setInterval(() => this.store.heartbeat(id, owner, this.config.execution.staleHeartbeatSeconds), Math.max(5_000, this.config.execution.staleHeartbeatSeconds * 500));
    try {
      const activeMilestone = this.store.listMilestones(id).find((row) => row.state !== "approved");
      if (!activeMilestone) {
        this.store.setRunState(id, "completed");
        await writeFinalReport(this.config, this.store, id);
        return id;
      }
      const milestoneId = String(activeMilestone.id);
      await this.assertMilestoneBranch(id, milestoneId);
      await this.reconcileRevision(id);
      this.store.setRunState(id, "running");
      this.store.setMilestoneState(id, milestoneId, "in_progress");
      const requirements = this.loadRequirements(id);
      let pending = this.store.listTasks(id).filter((row) => row.milestone_id === milestoneId && ["pending", "ready", "changes_requested", "failed"].includes(String(row.state)));
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
        pending = this.store.listTasks(id).filter((row) => row.milestone_id === milestoneId && ["pending", "ready", "changes_requested", "failed"].includes(String(row.state)));
      }
      return await this.finishMilestone(id, milestoneId);
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
      milestoneId: milestoneFromRequirementId(String(row.id), this.config),
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
    const attemptNumber = priorAttempts.length + 1;
    const hard = this.catalog.isHardTask([task.title, task.description, ...task.acceptanceCriteria].join("\n"));
    const candidate = this.catalog.select(task.role, ["text", "tools"], { attempt: attemptNumber, seed: task.id, hard });
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
    this.activeExecutor = executor;
    const sessionId = createId("session");
    this.store.run(
      "INSERT INTO sessions(id, attempt_id, role, model_key, independent, context_manifest_path, started_at) VALUES (?, ?, ?, ?, 0, ?, ?)",
      sessionId, attemptId, task.role, candidate.alias, path.join(attemptDirectory, "context-manifest.json"), nowUtc(),
    );
    const providerCallId = this.startProviderCall(attemptId, candidate, estimated);
    const started = performance.now();
    let result: ExecutionResult;
    try {
      result = await executor.execute({
        runId, attemptId, task, workspace: this.config.project.workspace, prompt, candidate,
        timeoutMs: this.config.execution.taskTimeoutMinutes * 60_000, outputDirectory: attemptDirectory,
      });
    } finally {
      this.activeExecutor = undefined;
      this.store.run("UPDATE sessions SET finished_at=? WHERE id=?", nowUtc(), sessionId);
    }
    await writeJson(path.join(attemptDirectory, "result.json"), result);
    const failureSignature = result.outcome === "ready_for_verification" ? null : sha256(`${result.outcome}:${result.summary}:${result.blockers.join(",")}`);
    this.store.run(
      "UPDATE attempts SET status=?, failure_signature=?, result_json=?, finished_at=? WHERE id=?",
      result.outcome, failureSignature, JSON.stringify(result), nowUtc(), attemptId,
    );
    const actualMicros = parseUsdToMicros(result.usage?.costUsd ?? "0") ?? 0n;
    const uncertain = candidate.modality === "metered_api" && result.outcome === "failed" && !result.usage;
    this.finishProviderCall(providerCallId, result, uncertain, estimated, actualMicros);
    this.ledger.reconcile({ runId, taskId: task.id, reservationId, providerCallId, amountMicros: uncertain ? estimated : actualMicros, uncertain });
    this.store.run(
      "INSERT INTO routing_observations(id, run_id, attempt_id, candidate_key, role, task_category, duration_ms, cost_micros, outcome, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      createId("route"), runId, attemptId, candidate.alias, task.role, "implementation", Math.round(performance.now() - started), actualMicros, result.outcome, nowUtc(),
    );
    if (result.outcome !== "ready_for_verification") return this.handleFailure(runId, task, priorAttempts, failureSignature, result);
    const checkpoint = await checkpointFiles({
      workspace: this.config.project.workspace, protectedRoot: HARNESS_ROOT, runId, taskId: task.id, files: result.changedFiles,
    });
    this.store.event(runId, "git.checkpoint", "task", task.id, checkpoint);
    this.store.setTaskState(runId, task.id, "verifying");
    const verification = await verifyCommands({
      config: this.config, store: this.store, runId, taskId: task.id,
      commandNames: this.config.commands.test ? ["test"] : [], outputDirectory: attemptDirectory,
    });
    if (!verification.passed) {
      this.store.setTaskState(runId, task.id, "changes_requested");
      return true;
    }
    if (this.config.review.requireIndependentSession) {
      const reviewed = await this.reviewTask(runId, task, candidate, verification.revision);
      if (!reviewed) {
        this.store.setTaskState(runId, task.id, "changes_requested");
        return true;
      }
    }
    this.store.setTaskState(runId, task.id, "passed");
    return true;
  }

  private startProviderCall(attemptId: string, candidate: ReturnType<ModelCatalog["get"]>, estimatedMicros: bigint): string {
    const id = createId("call");
    this.store.run(
      `INSERT INTO provider_calls(id, attempt_id, provider, model_id, modality, state, estimated_micros, started_at)
       VALUES (?, ?, ?, ?, ?, 'running', ?, ?)`,
      id, attemptId, candidate.provider, candidate.modelId, candidate.modality, estimatedMicros, nowUtc(),
    );
    return id;
  }

  private finishProviderCall(callId: string, result: ExecutionResult, uncertain: boolean, estimatedMicros: bigint, actualMicros: bigint): void {
    this.store.run(
      `UPDATE provider_calls SET state=?, provider_request_id=?, input_tokens=?, output_tokens=?, cached_tokens=?,
       reasoning_tokens=?, reported_micros=?, uncertain_micros=?, finished_at=? WHERE id=?`,
      uncertain ? "uncertain" : result.outcome === "ready_for_verification" ? "completed" : "failed",
      result.usage?.providerRequestId ?? null, result.usage?.inputTokens ?? null, result.usage?.outputTokens ?? null,
      result.usage?.cachedTokens ?? null, result.usage?.reasoningTokens ?? null, uncertain ? null : actualMicros,
      uncertain ? estimatedMicros : null, nowUtc(), callId,
    );
  }

  private async reviewTask(runId: string, task: Task, implementer: ReturnType<ModelCatalog["get"]>, revision: string): Promise<boolean> {
    const candidate = this.catalog.selectReviewer("functionalReviewer", implementer, task.id);
    const reviewTask: Task = {
      ...task,
      id: `${task.id}-review`,
      title: `Revisão independente de ${task.id}`,
      description: `Revise a implementação de ${task.id} na revisão ${revision}. Verifique os critérios sem editar arquivos.`,
      role: "functionalReviewer",
      state: "running",
    };
    const attemptId = createId("attempt");
    const outputDirectory = path.join(this.config.storage.root, "runs", runId, "tasks", task.id, "independent-review", attemptId);
    await mkdir(outputDirectory, { recursive: true });
    const prompt = [
      reviewTask.description,
      `Critérios:\n${task.acceptanceCriteria.map((item) => `- ${item}`).join("\n")}`,
      "Use apenas ferramentas de leitura. Não considere a autoavaliação do implementador como evidência.",
      "Responda somente JSON com taskId, outcome, summary, changedFiles, claimedChecks, decisions, blockers, suggestedFollowUps.",
    ].join("\n\n");
    const estimated = this.ledger.estimate(candidate, Math.ceil(prompt.length / 4), candidate.maxOutputTokens);
    let reservationId: string;
    try {
      reservationId = this.ledger.reserve(runId, task.id, candidate, estimated);
    } catch (error) {
      this.store.setRunState(runId, "paused_budget", { taskId: task.id, phase: "independent_review", error: safeError(error) });
      return false;
    }
    this.store.run(
      "INSERT INTO attempts(id, run_id, task_id, number, executor, candidate_key, status, started_at) VALUES (?, ?, ?, 1, ?, ?, 'running', ?)",
      attemptId, runId, reviewTask.id, candidate.executor, candidate.alias, nowUtc(),
    );
    const sessionId = createId("session");
    this.store.run(
      "INSERT INTO sessions(id, attempt_id, role, model_key, independent, started_at) VALUES (?, ?, 'functionalReviewer', ?, 1, ?)",
      sessionId, attemptId, candidate.alias, nowUtc(),
    );
    const providerCallId = this.startProviderCall(attemptId, candidate, estimated);
    const executor = createExecutor(this.config);
    this.activeExecutor = executor;
    let result: ExecutionResult;
    try {
      result = await executor.execute({
        runId, attemptId, task: reviewTask, workspace: this.config.project.workspace, prompt, candidate,
        timeoutMs: this.config.execution.taskTimeoutMinutes * 60_000, outputDirectory, readOnly: true,
      });
    } finally {
      this.activeExecutor = undefined;
      this.store.run("UPDATE sessions SET finished_at=? WHERE id=?", nowUtc(), sessionId);
    }
    await writeJson(path.join(outputDirectory, "result.json"), result);
    const actualMicros = parseUsdToMicros(result.usage?.costUsd ?? "0") ?? 0n;
    const uncertain = candidate.modality === "metered_api" && result.outcome === "failed" && !result.usage;
    this.finishProviderCall(providerCallId, result, uncertain, estimated, actualMicros);
    this.ledger.reconcile({ runId, taskId: task.id, reservationId, providerCallId, amountMicros: uncertain ? estimated : actualMicros, uncertain });
    this.store.run("UPDATE attempts SET status=?, result_json=?, finished_at=? WHERE id=?", result.outcome, JSON.stringify(result), nowUtc(), attemptId);
    const passed = result.outcome === "ready_for_verification" && result.blockers.length === 0;
    if (!passed) {
      this.store.run(
        "INSERT INTO findings(id, run_id, severity, category, summary, evidence_path, state, created_at) VALUES (?, ?, 'major', 'independent_review', ?, ?, 'open', ?)",
        createId("finding"), runId, result.summary, path.join(outputDirectory, "result.json"), nowUtc(),
      );
    }
    return passed;
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

  private async finishMilestone(runId: string, milestoneId: string): Promise<string> {
    const milestones = this.store.listMilestones(runId);
    const isFinal = milestones.at(-1)?.id === milestoneId;
    this.store.setRunState(runId, "verifying");
    this.store.setMilestoneState(runId, milestoneId, "automated_review");
    const output = path.join(this.config.storage.root, "runs", runId, "milestones", milestoneId, "automated-review");
    const verification = await verifyCommands({
      config: this.config, store: this.store, runId,
      commandNames: ["typecheck", "lint", "test", "build", "e2e"], outputDirectory: output,
    });
    const revision = verification.revision;
    this.store.run("UPDATE runs SET revision=?, updated_at=? WHERE id=?", revision, nowUtc(), runId);
    if (!verification.passed) {
      this.store.setMilestoneState(runId, milestoneId, "changes_requested", revision);
      this.store.setRunState(runId, "blocked", { cause: "milestone_verification_failed" });
      return runId;
    }
    if (this.config.execution.humanGate === "every_milestone" || (this.config.execution.humanGate === "final_only" && isFinal)) {
      this.store.setMilestoneState(runId, milestoneId, "awaiting_human", revision);
      this.store.setRunState(runId, "awaiting_human");
      await writeHumanReview({ config: this.config, store: this.store, runId, milestoneId, revision, verificationPassed: true });
      return runId;
    }
    this.store.setMilestoneState(runId, milestoneId, "approved", revision);
    if (isFinal) {
      this.store.setRunState(runId, "completed");
      await writeFinalReport(this.config, this.store, runId);
    } else {
      this.store.setRunState(runId, "paused", { cause: "milestone_completed", milestoneId });
    }
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

  private async assertMilestoneBranch(runId: string, milestoneId: string): Promise<void> {
    const git = await inspectGitWorkspace(this.config.project.workspace, HARNESS_ROOT);
    if (!git.repositoryRoot) {
      this.store.event(runId, "git.branch_unmanaged", "milestone", milestoneId, { workspace: this.config.project.workspace });
      return;
    }
    if (!git.branch) throw new Error("Execução em HEAD destacado não é permitida. Selecione manualmente um branch antes de retomar.");
    const milestone = this.store.get<Record<string, unknown>>(
      "SELECT branch FROM milestones WHERE run_id=? AND id=?", runId, milestoneId,
    );
    if (!milestone) throw new Error("Marco inexistente.");
    const existingBranch = typeof milestone.branch === "string" ? milestone.branch : null;
    const expected = existingBranch ?? this.store.pinMilestoneBranch(runId, milestoneId, git.branch);
    if (!existingBranch) {
      this.store.event(runId, "git.branch_pinned", "milestone", milestoneId, { branch: expected, repositoryRoot: git.repositoryRoot });
    }
    if (expected !== git.branch) {
      throw new Error(`A etapa ${milestoneId} está fixada no branch ${expected}; branch atual: ${git.branch}. Retorne manualmente ao branch correto.`);
    }
  }

  async approve(runId: string, milestoneId: string, revision: string, actor: string): Promise<void> {
    const milestone = this.store.get<Record<string, unknown>>("SELECT * FROM milestones WHERE run_id=? AND id=?", runId, milestoneId);
    if (!milestone) throw new Error("Marco inexistente.");
    await this.assertMilestoneBranch(runId, milestoneId);
    const current = await currentRevision(this.config.project.workspace);
    if (revision !== milestone.revision || revision !== current) throw new Error("A revisão mudou; execute novamente as verificações antes de aprovar.");
    this.store.createApproval({ runId, milestoneId, revision, decision: "approved", actor, scope: "milestone" });
    this.store.setMilestoneState(runId, milestoneId, "approved", revision);
    const remaining = this.store.listMilestones(runId).some((item) => item.state !== "approved");
    if (remaining) {
      this.store.setRunState(runId, "paused", { cause: "milestone_approved", milestoneId });
    } else {
      this.store.setRunState(runId, "completed");
      await writeFinalReport(this.config, this.store, runId);
    }
  }

  async importFeedback(runId: string, source: string, milestoneId = this.config.project.milestones[0]?.id): Promise<string> {
    if (!milestoneId) throw new Error("Nenhuma etapa configurada para receber feedback.");
    const content = await readFile(source, "utf8");
    if (!content.trim()) throw new Error("Feedback vazio.");
    await this.assertMilestoneBranch(runId, milestoneId);
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

  async importFeedbackContent(runId: string, content: string, milestoneId = this.config.project.milestones[0]?.id, actor = "dashboard-human"): Promise<string> {
    if (!milestoneId) throw new Error("Nenhuma etapa configurada para receber feedback.");
    if (!content.trim()) throw new Error("Feedback vazio.");
    await this.assertMilestoneBranch(runId, milestoneId);
    const directory = path.join(this.config.storage.root, "runs", runId, "milestones", milestoneId);
    await mkdir(directory, { recursive: true });
    const destination = path.join(directory, `human-feedback-${Date.now()}.md`);
    await writeFile(destination, content, { mode: 0o600, flag: "wx" });
    const revision = await currentRevision(this.config.project.workspace);
    this.store.createApproval({ runId, milestoneId, revision, decision: "changes_requested", actor, scope: "milestone", feedbackPath: destination });
    this.store.setMilestoneState(runId, milestoneId, "changes_requested", revision);
    this.store.setRunState(runId, "paused");
    return destination;
  }
}
