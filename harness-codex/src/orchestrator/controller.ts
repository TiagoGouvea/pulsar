import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import type { HarnessConfig } from "../config/schema.js";
import type { ExecutionResult, ModelCandidate, Requirement, Role, Task, TaskState } from "../domain/types.js";
import { BudgetLedger } from "../budget/ledger.js";
import { buildTaskContext } from "../context/builder.js";
import { createExecutor } from "../executors/index.js";
import type { Executor } from "../executors/types.js";
import { changedPathsBetweenSnapshots, checkpointFiles, currentRevision, inspectGitWorkspace, snapshotWorkspaceChanges } from "../git/workspace.js";
import { createTasks, extractRequirements, milestoneFromRequirementId } from "../planning/requirements.js";
import { ModelCatalog } from "../providers/catalog.js";
import { firebaseProjectChecks } from "../preflight/doctor.js";
import { writeBudgetReport, writeFinalReport, writeHumanReview, writePlan } from "../reports/generator.js";
import { assertWorkspace } from "../security/workspace.js";
import { captureInputs, detectInputChanges } from "../state/inputs.js";
import { StateStore } from "../state/store.js";
import { createId, formatMicros, nowUtc, parseUsdToMicros, safeError, sha256, writeJson } from "../utils/core.js";
import { terminalLog, terminalTimestamp, toneForMessage } from "../utils/terminal.js";
import { invalidateStaleVerifications, verifyCommands } from "../verification/commands.js";
import { deployHostingSnapshot, persistHostingSnapshot, type HostingSnapshot } from "../verification/hosting-snapshot.js";
import { captureVisualEvidence, type VisualEvidence } from "../verification/visual.js";

const HARNESS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
type ReviewDecision = "passed" | "changes_requested" | "retryable_failure" | "paused";

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

export function consumesTaskAttempt(row: Record<string, unknown>): boolean {
  if (row.status !== "failed" || typeof row.result_json !== "string") return true;
  try {
    const result = JSON.parse(row.result_json) as ExecutionResult;
    return !(result.outcome === "failed" && result.blockers.includes("pi_execution_failed"));
  } catch {
    return true;
  }
}

export function isTechnicalExecutionFailure(row: Record<string, unknown>): boolean {
  if (typeof row.result_json !== "string") return false;
  try {
    const result = JSON.parse(row.result_json) as ExecutionResult;
    return result.outcome === "failed" && result.blockers.includes("pi_execution_failed");
  } catch {
    return true;
  }
}

export function hasOnlyTechnicalFailures(attempts: Record<string, unknown>[]): boolean {
  return attempts.length > 0 && attempts.every(isTechnicalExecutionFailure);
}

export function countCurrentReviewFailures(attempts: Record<string, unknown>[]): number {
  let failures = 0;
  for (const attempt of attempts) {
    if (isTechnicalExecutionFailure(attempt)) failures += 1;
    else failures = 0;
  }
  return failures;
}

export function currentReviewFailureAttempts(attempts: Record<string, unknown>[]): Record<string, unknown>[] {
  const current: Record<string, unknown>[] = [];
  for (const attempt of attempts) {
    if (isTechnicalExecutionFailure(attempt)) current.push(attempt);
    else current.length = 0;
  }
  return current;
}

export function canAuthorizeExtraReviewRetry(input: {
  blockedCause: unknown;
  blockedTaskId: unknown;
  taskId: string;
  taskState: unknown;
  priorFailures: number;
  maxAttempts: number;
}): boolean {
  return input.blockedCause === "independent_review_execution_failed"
    && input.blockedTaskId === input.taskId
    && input.taskState === "verifying"
    && input.priorFailures >= input.maxAttempts;
}

export function effectiveTaskAttemptLimit(taskLimit: number, configuredLimit: number): number {
  return Math.max(taskLimit, configuredLimit);
}

export function shouldUseHardImplementerPool(critical: boolean, priorAttemptCount: number): boolean {
  return critical && priorAttemptCount >= 2;
}

export function executionFailureSignature(candidateAlias: string, result: ExecutionResult): string | null {
  if (result.outcome === "ready_for_verification") return null;
  return sha256(`${candidateAlias}:${result.outcome}:${result.summary}:${result.blockers.join(",")}`);
}

export function attemptedModelAliases(attempts: Record<string, unknown>[], candidates: ModelCandidate[]): string[] {
  return attempts.flatMap((attempt) => {
    const candidate = candidates.find((item) =>
      item.alias === attempt.candidate_key
      || `${item.executor}:${item.provider}:${item.modelId}:${item.version ?? "current"}` === attempt.candidate_key,
    );
    return candidate ? [candidate.alias] : [];
  });
}

export function reviewRequestedChanges(status: unknown): boolean {
  return ["changes_requested", "needs_changes", "revisions_requested"].includes(String(status));
}

export class Orchestrator {
  readonly store: StateStore;
  private readonly catalog: ModelCatalog;
  private readonly ledger: BudgetLedger;
  private activeExecutor: Executor | undefined;
  private reviewRetryAuthorization: { taskId: string; remainingAttempts: number } | undefined;

  constructor(readonly config: HarnessConfig) {
    this.store = new StateStore(config.storage.root);
    this.catalog = new ModelCatalog(config);
    this.ledger = new BudgetLedger(this.store, config);
  }

  close(): void { this.store.close(); }

  async interrupt(runId: string, signal: "SIGINT" | "SIGTERM" | "SIGHUP"): Promise<void> {
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

  async run(runId?: string, options: { retryReviewTaskId?: string } = {}): Promise<string> {
    const id = runId ?? await this.plan();
    const run = this.store.getRun(id);
    if (!run) throw new Error(`Run inexistente: ${id}`);
    if (["completed", "cancelled", "failed", "awaiting_human"].includes(String(run.state))) return id;
    let retryReviewCandidates: ModelCandidate[] = [];
    if (options.retryReviewTaskId) {
      const blocked = this.store.get<Record<string, unknown>>(
        "SELECT payload_json FROM events WHERE run_id=? AND type='run.blocked' ORDER BY sequence DESC LIMIT 1",
        id,
      );
      const blockedPayload = typeof blocked?.payload_json === "string"
        ? JSON.parse(blocked.payload_json) as Record<string, unknown>
        : {};
      const task = this.store.listTasks(id).find((item) => item.id === options.retryReviewTaskId);
      const reviewFailures = this.currentReviewFailures(id, `${options.retryReviewTaskId}-review`);
      if (!canAuthorizeExtraReviewRetry({
        blockedCause: blockedPayload.cause,
        blockedTaskId: blockedPayload.taskId,
        taskId: options.retryReviewTaskId,
        taskState: task?.state,
        priorFailures: reviewFailures,
        maxAttempts: this.config.review.maxAttempts,
      })) {
        throw new Error("--retry-review só se aplica à tarefa em verifying bloqueada por independent_review_execution_failed após esgotar as tentativas de revisão.");
      }
      const taskDefinition = rowToTask(task as Record<string, unknown>);
      const implementation = this.implementerContext(id, taskDefinition);
      if (!implementation) throw new Error(`Não foi possível recuperar o modelo implementador de ${options.retryReviewTaskId}; nenhuma revisão foi iniciada.`);
      retryReviewCandidates = this.unusedReviewCandidates(id, taskDefinition, implementation.candidate);
      if (!retryReviewCandidates.length) {
        throw new Error(`Pool de revisão esgotado para ${options.retryReviewTaskId}; todos os revisores elegíveis já foram tentados. Nenhuma chamada foi iniciada.`);
      }
    }
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
    if (options.retryReviewTaskId) {
      const priorFailures = this.currentReviewFailures(id, `${options.retryReviewTaskId}-review`);
      this.reviewRetryAuthorization = { taskId: options.retryReviewTaskId, remainingAttempts: retryReviewCandidates.length };
      this.store.event(id, "task.review_retry_authorized", "task", options.retryReviewTaskId, {
        priorFailures, additionalAttempts: retryReviewCandidates.length,
        candidateAliases: retryReviewCandidates.map((candidate) => candidate.alias),
        authorizedBy: "explicit resume --retry-review option",
      });
      this.log(`Autorizadas ${retryReviewCandidates.length} tentativa(s) de revisão ainda não realizadas para ${options.retryReviewTaskId}: ${retryReviewCandidates.map((candidate) => candidate.alias).join(", ")}; histórico preservado.`);
    }
    const heartbeat = setInterval(() => this.store.heartbeat(id, owner, this.config.execution.staleHeartbeatSeconds), Math.max(5_000, this.config.execution.staleHeartbeatSeconds * 500));
    const sessionId = createId("run-session");
    const sessionStartedAt = nowUtc();
    const priorHeartbeat = typeof run.heartbeat_at === "string" ? run.heartbeat_at : sessionStartedAt;
    const staleSessions = this.store.all<Record<string, unknown>>("SELECT id FROM run_sessions WHERE run_id=? AND finished_at IS NULL", id);
    if (staleSessions.length) {
      this.store.run("UPDATE run_sessions SET finished_at=?, outcome='interrupted' WHERE run_id=? AND finished_at IS NULL", priorHeartbeat, id);
      this.store.event(id, "run.crash_recovered", "run", id, { staleSessionIds: staleSessions.map((item) => item.id), estimatedStoppedAt: priorHeartbeat });
      this.log(`Recuperação: ${staleSessions.length} sessão(ões) anterior(es) interrompida(s); duração encerrada no último heartbeat ${terminalTimestamp(priorHeartbeat, this.config.project.timezone)}.`);
      const priorPid = typeof run.pid === "number" ? run.pid : null;
      if (priorPid != null && !this.isProcessAlive(priorPid)) await this.reconcileInterruptedProviderCalls(id, priorHeartbeat);
    }
    this.store.run("INSERT INTO run_sessions(id, run_id, started_at, pid) VALUES (?, ?, ?, ?)", sessionId, id, sessionStartedAt, process.pid);
    this.log(`Run ${id} retomada; início desta sessão ${terminalTimestamp(sessionStartedAt, this.config.project.timezone)}.`);
    this.store.event(id, "run.session_started", "run_session", sessionId, { pid: process.pid, resumed: String(run.state) !== "created" });
    try {
      const activeMilestone = this.store.listMilestones(id).find((row) => row.state !== "approved");
      if (!activeMilestone) {
        this.store.setRunState(id, "completed");
        await writeFinalReport(this.config, this.store, id);
        return id;
      }
      const milestoneId = String(activeMilestone.id);
      if (this.isFirebaseSecurityMilestone(activeMilestone)) {
        const checks = await firebaseProjectChecks(this.config);
        const blockers = checks.filter((check) => check.status === "block" && check.importance === "required");
        if (blockers.length) {
          this.store.setRunState(id, "blocked", { cause: "firebase_emulator_preflight_failed", milestoneId, checks: blockers.map(({ id: checkId, summary, evidence, remediation }) => ({ id: checkId, summary, evidence, remediation })) });
          this.log(`BLOQUEIO de segurança Firebase: ${blockers.map((item) => item.id).join(", ")}. Nenhuma tarefa/modelo foi iniciado.`);
          return id;
        }
        this.store.event(id, "firebase.emulator_preflight_passed", "milestone", milestoneId, { checks: checks.map((item) => item.id) });
      }
      await this.assertMilestoneBranch(id, milestoneId);
      await this.reconcileRevision(id);
      this.store.setRunState(id, "running");
      this.store.setMilestoneState(id, milestoneId, "in_progress");
      const requirements = this.loadRequirements(id);
      if (!(await this.recoverInterruptedWork(id, milestoneId))) return id;
      if (!(await this.recoverAttemptCapacity(id, milestoneId))) return id;
      const milestoneTaskCount = this.store.listTasks(id).filter((row) => row.milestone_id === milestoneId).length;
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
        console.log("");
        this.log(`Tarefa ${task.id}: ${task.title}`);
        const shouldContinue = await this.executeTask(id, task, requirements);
        const taskState = this.store.listTasks(id).find((row) => row.id === task.id)?.state;
        if (taskState === "passed" || taskState === "blocked" || !shouldContinue) {
          this.logTaskSummary(id, task, milestoneTaskCount, taskState === "passed" ? "concluída" : "encerrada");
        }
        if (!shouldContinue) return id;
        pending = this.store.listTasks(id).filter((row) => row.milestone_id === milestoneId && ["pending", "ready", "changes_requested", "failed"].includes(String(row.state)));
      }
      const incomplete = this.store.listTasks(id).filter((row) => row.milestone_id === milestoneId && row.state !== "passed");
      if (incomplete.length > 0) {
        this.store.setRunState(id, "blocked", {
          cause: "incomplete_tasks",
          taskIds: incomplete.map((row) => String(row.id)),
        });
        return id;
      }
      return await this.finishMilestone(id, milestoneId);
    } catch (error) {
      this.store.setRunState(id, "blocked", { error: safeError(error) });
      this.store.event(id, "run.controller_error", "run", id, { error: safeError(error), stack: error instanceof Error ? error.stack : undefined });
      this.log(`ERRO do controlador: ${safeError(error)}`);
      throw error;
    } finally {
      clearInterval(heartbeat);
      this.store.releaseLease(id, owner);
      this.reviewRetryAuthorization = undefined;
      const endedAt = nowUtc();
      const storedState = this.store.getRun(id)?.state;
      const finalState = typeof storedState === "string" ? storedState : "unknown";
      this.store.run("UPDATE run_sessions SET finished_at=?, outcome=? WHERE id=?", endedAt, finalState, sessionId);
      this.store.event(id, "run.session_finished", "run_session", sessionId, { startedAt: sessionStartedAt, finishedAt: endedAt, outcome: finalState });
      await this.writeRunSummary(id).catch((error: unknown) => this.log(`Não foi possível atualizar run-summary.json: ${safeError(error)}`));
      await writeBudgetReport(this.config, this.store, id).catch(() => undefined);
      if (["completed", "awaiting_human", "blocked", "paused_budget"].includes(finalState)) {
        await writeFinalReport(this.config, this.store, id).catch((error: unknown) => this.log(`Não foi possível atualizar o relatório final: ${safeError(error)}`));
      }
      this.log(`Sessão encerrada: ${finalState}.`);
      this.log(`  ↳ ${this.progress(id)}; relatório: ${path.join(this.config.storage.root, "runs", id, "final-report.md")}`);
    }
  }

  private isFirebaseSecurityMilestone(milestone: Record<string, unknown>): boolean {
    const text = [milestone.id, milestone.title, milestone.objective].filter((value): value is string => typeof value === "string").join(" ");
    return /auth|security rules|regras de segurança|firebase/i.test(text);
  }

  private isProcessAlive(pid: number): boolean {
    try { process.kill(pid, 0); return true; }
    catch (error) { return (error as NodeJS.ErrnoException).code !== "ESRCH"; }
  }

  private async reconcileInterruptedProviderCalls(runId: string, stoppedAt: string): Promise<void> {
    const calls = this.store.all<Record<string, unknown>>(
      `SELECT pc.*, a.task_id, a.number FROM provider_calls pc JOIN attempts a ON a.id=pc.attempt_id
       WHERE a.run_id=? AND pc.state='running'`, runId,
    );
    for (const call of calls) {
      if (typeof call.id !== "string") continue;
      const estimatedMicros = typeof call.estimated_micros === "string" || typeof call.estimated_micros === "number" ? call.estimated_micros : 0;
      this.store.run("UPDATE provider_calls SET state='uncertain', uncertain_micros=estimated_micros, finished_at=? WHERE id=? AND state='running'", stoppedAt, call.id);
      this.store.run("UPDATE cost_reservations SET state='uncertain' WHERE provider_call_id=? AND state='active'", call.id);
      const artifact = {
        providerCallId: call.id, runId, taskId: call.task_id, attempt: call.number,
        provider: call.provider, modelId: call.model_id, state: "interrupted_uncertain",
        startedAt: call.started_at, stoppedAt, estimatedCostMicros: String(estimatedMicros),
        note: "O processo terminou sem relatório de uso; custo mantido como incerto até reconciliação.",
      };
      const output = path.join(this.config.storage.root, "runs", runId, "recovered-calls", `${call.id}.json`);
      await writeJson(output, artifact);
      this.store.event(runId, "provider_call.interrupted", "provider_call", call.id, { ...artifact, artifactPath: output });
      this.log(`Chamada interrompida ${call.id}: custo reservado mantido como incerto (USD ${String(estimatedMicros)} micros).`);
    }
  }

  private log(message: string): void {
    terminalLog(message, { timeZone: this.config.project.timezone, tone: toneForMessage(message) });
  }

  private modelLocation(modality: string): "local" | "remoto" | "simulado" {
    if (modality === "local") return "local";
    if (modality === "fake") return "simulado";
    return "remoto";
  }

  private logTaskSummary(runId: string, task: Task, taskCount: number, outcome: string): void {
    const allTaskRows = this.store.listTasks(runId);
    const taskRows = allTaskRows.filter((row) => row.milestone_id === task.milestoneId);
    const taskPosition = taskRows.findIndex((row) => row.id === task.id) + 1;
    const projectTaskPosition = allTaskRows.findIndex((row) => row.id === task.id) + 1;
    const relatedTaskId = `${task.id}-review`;
    const attempts = this.store.all<Record<string, unknown>>(
      "SELECT started_at, finished_at FROM attempts WHERE run_id=? AND task_id IN (?, ?)",
      runId, task.id, relatedTaskId,
    );
    const verifications = this.store.all<Record<string, unknown>>(
      "SELECT started_at, finished_at FROM verifier_runs WHERE run_id=? AND task_id=?",
      runId, task.id,
    );
    const durationMs = [...attempts, ...verifications].reduce((total, item) => {
      const startedAt = typeof item.started_at === "string" ? Date.parse(item.started_at) : NaN;
      const finishedAt = typeof item.finished_at === "string" ? Date.parse(item.finished_at) : Date.now();
      return total + (Number.isFinite(startedAt) ? Math.max(0, finishedAt - startedAt) : 0);
    }, 0);
    const calls = this.store.all<Record<string, unknown>>(
      `SELECT pc.reported_micros, pc.uncertain_micros FROM provider_calls pc
       JOIN attempts a ON a.id=pc.attempt_id WHERE a.run_id=? AND a.task_id IN (?, ?)`,
      runId, task.id, relatedTaskId,
    );
    const costs = calls.reduce<{ reported: bigint; uncertain: bigint }>((total, call) => {
      total.reported += this.microsFromRow(call.reported_micros);
      total.uncertain += this.microsFromRow(call.uncertain_micros);
      return total;
    }, { reported: 0n, uncertain: 0n });
    const totalSeconds = Math.floor(durationMs / 1_000);
    const hours = Math.floor(totalSeconds / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;
    const duration = [hours ? `${hours}h` : "", minutes ? `${minutes}m` : "", `${seconds}s`].filter(Boolean).join(" ");
    const reportedUsd = this.formatUsdMicros(costs.reported);
    const uncertainUsd = this.formatUsdMicros(costs.uncertain);
    const cost = costs.uncertain > 0n ? `USD ${reportedUsd} + ${uncertainUsd} incerto` : `USD ${reportedUsd}`;
    this.log(`Tarefa ${task.id} ${outcome} · tempo ativo ${duration} · custo ${cost} · etapa ${taskPosition}/${taskCount} · projeto ${projectTaskPosition}/${allTaskRows.length}.`);
  }

  private formatUsdMicros(micros: bigint): string {
    return (Number(micros) / 1_000_000).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  }

  private microsFromRow(value: unknown): bigint {
    if (typeof value === "bigint") return value;
    if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
    if (typeof value === "string" && /^-?\d+$/.test(value)) return BigInt(value);
    return 0n;
  }

  private progress(runId: string, milestoneId?: string): string {
    const allTasks = this.store.listTasks(runId);
    const stageTasks = milestoneId ? allTasks.filter((task) => task.milestone_id === milestoneId) : allTasks;
    const summarize = (tasks: typeof allTasks): { passed: number; total: number; featuresDone: number; featuresTotal: number } => {
      const linked = new Map<string, boolean>();
      for (const task of tasks) {
        let requirementIds: string[] = [];
        try { requirementIds = JSON.parse(String(task.requirement_ids_json)) as string[]; } catch { /* Ignore malformed legacy rows in progress display. */ }
        for (const requirementId of requirementIds) linked.set(requirementId, (linked.get(requirementId) ?? true) && task.state === "passed");
      }
      return {
        passed: tasks.filter((task) => task.state === "passed").length,
        total: tasks.length,
        featuresDone: [...linked.values()].filter(Boolean).length,
        featuresTotal: linked.size,
      };
    };
    const project = summarize(allTasks);
    const stage = summarize(stageTasks);
    if (!milestoneId) return `projeto tarefas ${project.passed}/${project.total} · features ${project.featuresDone}/${project.featuresTotal}`;
    return `etapa ${milestoneId} tarefas ${stage.passed}/${stage.total} · projeto tarefas ${project.passed}/${project.total} · features etapa ${stage.featuresDone}/${stage.featuresTotal} · projeto ${project.featuresDone}/${project.featuresTotal}`;
  }

  private async writeRunSummary(runId: string): Promise<void> {
    const run = this.store.getRun(runId);
    if (!run) return;
    const sessions = this.store.all<Record<string, unknown>>("SELECT started_at, finished_at, outcome FROM run_sessions WHERE run_id=? ORDER BY started_at", runId);
    const activeMs = sessions.reduce((total, item) => {
      const startedAt = typeof item.started_at === "string" ? item.started_at : nowUtc();
      const finishedAt = typeof item.finished_at === "string" ? item.finished_at : nowUtc();
      return total + Math.max(0, Date.parse(finishedAt) - Date.parse(startedAt));
    }, 0);
    const tasks = this.store.listTasks(runId);
    const requirements = this.store.listRequirements(runId);
    const featuresDone = requirements.filter((requirement) => tasks.some((task) => {
      if (task.state !== "passed") return false;
      try { return (JSON.parse(String(task.requirement_ids_json)) as string[]).includes(String(requirement.id)); } catch { return false; }
    })).length;
    await writeJson(path.join(this.config.storage.root, "runs", runId, "run-summary.json"), {
      runId, state: run.state, createdAt: run.created_at, updatedAt: run.updated_at, completedAt: run.completed_at ?? null,
      activeDurationMs: activeMs, sessions, tasks: { total: tasks.length, passed: tasks.filter((task) => task.state === "passed").length, blocked: tasks.filter((task) => task.state === "blocked").length },
      features: { total: requirements.length, done: featuresDone },
    });
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
    const consumedAttempts = priorAttempts.filter(consumesTaskAttempt);
    const maxAttempts = effectiveTaskAttemptLimit(task.maxAttempts, this.config.execution.maxAttemptsPerTask);
    const authorizations = this.store.all<Record<string, unknown>>(
      "SELECT payload_json FROM events WHERE run_id=? AND type='task.retry_authorized' AND entity_id=? ORDER BY sequence",
      runId, task.id,
    ).length;
    if (consumedAttempts.length >= maxAttempts + authorizations) {
      const authorized = stdin.isTTY && stdout.isTTY ? await this.askForRetry(task.id, consumedAttempts.length, maxAttempts) : false;
      if (authorized) {
        this.store.event(runId, "task.retry_authorized", "task", task.id, { consumedAttempts: consumedAttempts.length, configuredLimit: maxAttempts, actor: "terminal-human" });
        this.store.setTaskState(runId, task.id, "changes_requested");
        this.log(`Tentativa adicional autorizada manualmente para ${task.id}; o teto financeiro continua valendo.`);
        return true;
      }
      this.log(`BLOQUEIO ${task.id}: limite de tentativas (${consumedAttempts.length}/${maxAttempts + authorizations}); sem nova autorização.`);
      this.store.setTaskState(runId, task.id, "blocked");
      this.store.setRunState(runId, "blocked", {
        cause: "max_attempts", taskId: task.id,
        consumedAttempts: consumedAttempts.length, technicalFailures: priorAttempts.length - consumedAttempts.length, maxAttempts,
      });
      return false;
    }
    const attemptNumber = priorAttempts.length + 1;
    const critical = this.catalog.isHardTask([task.title, task.description, ...task.acceptanceCriteria].join("\n"));
    const hard = shouldUseHardImplementerPool(critical, priorAttempts.length);
    const attemptedAliases = attemptedModelAliases(priorAttempts, this.catalog.list());
    const candidate = this.catalog.select(task.role, ["text", "tools"], {
      attempt: consumedAttempts.length + 1,
      seed: task.id,
      hard,
      excludeAliases: attemptedAliases,
    });
    this.log(`Tentativa ${consumedAttempts.length + 1}/${maxAttempts} · chamada #${attemptNumber} · ${task.id} · modelo ${candidate.alias} [${this.modelLocation(candidate.modality)}]${critical ? " · tarefa crítica" : ""}${hard ? " · pool hard após 2 falhas" : ""}.`);
    const attemptId = createId("attempt");
    const attemptDirectory = path.join(this.config.storage.root, "runs", runId, "tasks", task.id, `attempt-${String(attemptNumber).padStart(3, "0")}`);
    await mkdir(attemptDirectory, { recursive: true });
    const prompt = await buildTaskContext({ config: this.config, store: this.store, runId, task, requirements, attemptDirectory });
    const estimated = this.ledger.estimate(candidate, Math.ceil(prompt.length / 4), candidate.maxOutputTokens);
    let reservationId: string;
    try {
      reservationId = this.ledger.reserve(runId, task.id, candidate, estimated);
    } catch (error) {
      this.log(`LIMITE DE ORÇAMENTO · ${task.id}: ${safeError(error)}. Nenhuma chamada foi iniciada.`);
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
    const beforeWorkspace = await snapshotWorkspaceChanges(this.config.project.workspace);
    const providerCallId = this.startProviderCall(attemptId, candidate, estimated);
    this.store.run("UPDATE cost_reservations SET provider_call_id=? WHERE id=? AND provider_call_id IS NULL", providerCallId, reservationId);
    const started = performance.now();
    const workStartedAt = nowUtc();
    let result: ExecutionResult;
    let declaredChangedFiles: string[] = [];
    try {
      result = await executor.execute({
        runId, attemptId, task, workspace: this.config.project.workspace, prompt, candidate,
        timeoutMs: this.config.execution.implementationTimeoutMinutes * 60_000, outputDirectory: attemptDirectory,
        timeZone: this.config.project.timezone,
      });
      declaredChangedFiles = result.changedFiles;
    } finally {
      const workFinishedAt = nowUtc();
      this.activeExecutor = undefined;
      this.store.run("UPDATE sessions SET finished_at=? WHERE id=?", nowUtc(), sessionId);
      const afterWorkspace = await snapshotWorkspaceChanges(this.config.project.workspace);
      await writeJson(path.join(attemptDirectory, "work-attribution.json"), {
        runId, milestoneId: task.milestoneId, taskId: task.id, attemptId, attempt: attemptNumber,
        role: task.role, candidate: candidate.alias, provider: candidate.provider, modelId: candidate.modelId,
        family: candidate.family, modality: candidate.modality, startedAt: workStartedAt, finishedAt: workFinishedAt,
        beforeRevision: beforeWorkspace.revision, afterRevision: afterWorkspace.revision,
        observedChangedFiles: changedPathsBetweenSnapshots(beforeWorkspace, afterWorkspace),
        declaredChangedFiles,
        readOnly: false,
      });
    }
    await writeJson(path.join(attemptDirectory, "result.json"), result);
    this.recordExecutionFailure(runId, task.id, attemptId, candidate.alias, result);
    const failureSignature = executionFailureSignature(candidate.alias, result);
    this.store.run(
      "UPDATE attempts SET status=?, failure_signature=?, result_json=?, finished_at=? WHERE id=?",
      result.outcome, failureSignature, JSON.stringify(result), nowUtc(), attemptId,
    );
    const actualMicros = parseUsdToMicros(result.usage?.costUsd ?? "0") ?? 0n;
    const uncertain = candidate.modality === "metered_api" && result.outcome === "failed" && !result.usage;
    this.finishProviderCall(providerCallId, result, uncertain, estimated, actualMicros);
    this.ledger.reconcile({ runId, taskId: task.id, reservationId, providerCallId, amountMicros: uncertain ? estimated : actualMicros, uncertain });
    const callDurationMs = Math.round(performance.now() - started);
    const callRecord = {
      providerCallId, runId, taskId: task.id, role: task.role, alias: candidate.alias, provider: candidate.provider,
      modelId: candidate.modelId, modality: candidate.modality, startedAt: this.store.get<Record<string, unknown>>("SELECT started_at FROM provider_calls WHERE id=?", providerCallId)?.started_at,
      finishedAt: nowUtc(), durationMs: callDurationMs, outcome: result.outcome, inputTokens: result.usage?.inputTokens ?? null,
      outputTokens: result.usage?.outputTokens ?? null, cachedTokens: result.usage?.cachedTokens ?? null,
      costUsd: uncertain ? null : result.usage?.costUsd ?? "0", estimatedCostUsd: String(estimated), uncertain,
    };
    await writeJson(path.join(attemptDirectory, "model-call.json"), callRecord);
    this.log(`Modelo ${candidate.alias} [${this.modelLocation(candidate.modality)}] · ${result.outcome} · ${result.usage?.inputTokens ?? "?"}/${result.usage?.outputTokens ?? "?"} tokens · USD ${uncertain ? "incerto" : result.usage?.costUsd ?? "0"} · ${callDurationMs} ms · ${this.progress(runId, task.milestoneId)}.`);
    this.store.run(
      "INSERT INTO routing_observations(id, run_id, attempt_id, candidate_key, role, task_category, duration_ms, cost_micros, outcome, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      createId("route"), runId, attemptId, candidate.alias, task.role, "implementation", Math.round(performance.now() - started), actualMicros, result.outcome, nowUtc(),
    );
    if (result.outcome !== "ready_for_verification") return this.handleFailure(runId, task, priorAttempts, failureSignature, result);
    return this.verifyReadyResult(runId, task, result, candidate, attemptDirectory);
  }

  private async askForRetry(taskId: string, attempts: number, limit: number): Promise<boolean> {
    const prompt = createInterface({ input: stdin, output: stdout });
    try {
      const answer = await prompt.question(`[${terminalTimestamp(new Date(), this.config.project.timezone)}] ${taskId} chegou ao limite de ${limit} tentativas (${attempts} consumidas). Autorizar mais uma tentativa? [s/N] `);
      return ["s", "sim", "y", "yes"].includes(answer.trim().toLocaleLowerCase("pt-BR"));
    } finally { prompt.close(); }
  }

  private async recoverAttemptCapacity(runId: string, milestoneId: string): Promise<boolean> {
    const blocked = this.store.listTasks(runId).filter((row) => row.milestone_id === milestoneId && row.state === "blocked");
    for (const row of blocked) {
      const task = rowToTask(row);
      const attempts = this.store.all<Record<string, unknown>>(
        "SELECT id, number, status, result_json, candidate_key, started_at, finished_at FROM attempts WHERE run_id=? AND task_id=? ORDER BY number",
        runId, task.id,
      );
      const consumedAttempts = attempts.filter(consumesTaskAttempt).length;
      const maxAttempts = effectiveTaskAttemptLimit(task.maxAttempts, this.config.execution.maxAttemptsPerTask);
      const review = this.store.get<Record<string, unknown>>(
        "SELECT status FROM attempts WHERE run_id=? AND task_id=? ORDER BY started_at DESC LIMIT 1",
        runId, `${task.id}-review`,
      );
      if (reviewRequestedChanges(review?.status) && consumedAttempts < maxAttempts) {
        this.store.setTaskState(runId, task.id, "changes_requested");
        this.store.event(runId, "task.attempt_capacity_recovered", "task", task.id, {
          consumedAttempts, technicalFailures: attempts.length - consumedAttempts, maxAttempts,
        });
        continue;
      }
      if (!hasOnlyTechnicalFailures(attempts)) continue;

      const inspectionPath = await this.inspectBlockedTechnicalTask(runId, task, attempts);
      const latest = attempts.at(-1);
      const latestResult = typeof latest?.result_json === "string"
        ? JSON.parse(latest.result_json) as ExecutionResult
        : null;
      const budget = this.ledger.snapshot(runId);
      const budgetText = budget.usableMicros == null
        ? "sem teto configurado"
        : `USD ${formatMicros(budget.usableMicros)} disponíveis; USD ${formatMicros(budget.uncertainMicros)} incertos incluídos nas reservas`;
      this.log(`RECUPERAÇÃO ${task.id}: ${attempts.length} falhas técnicas sem resultado válido; última: ${latestResult?.summary ?? "sem resumo"}. Alterações parciais e trilhas: ${inspectionPath}. Orçamento ${budgetText}.`);
      const authorization = await this.askForTechnicalRetry(task.id, attempts.length, inspectionPath, budgetText);
      if (authorization !== true) {
        const cause = authorization === false ? "technical_retry_declined" : "technical_retry_confirmation_required";
        this.store.setRunState(runId, "blocked", { cause, taskId: task.id, inspectionPath });
        if (authorization === false) {
          this.store.event(runId, "task.technical_retry_declined", "task", task.id, { inspectionPath, actor: "terminal-human" });
          this.log(`RECUPERAÇÃO ${task.id}: mantida bloqueada; nenhuma chamada nova foi iniciada.`);
        } else {
          this.store.event(runId, "task.retry_confirmation_required", "task", task.id, { inspectionPath });
        }
        return false;
      }
      this.store.setTaskState(runId, task.id, "changes_requested");
      this.store.event(runId, "task.retry_authorized", "task", task.id, {
        actor: "terminal-human", reason: "repeated_technical_failures",
        failedAttempts: attempts.map((attempt) => ({ id: attempt.id, number: attempt.number, candidateKey: attempt.candidate_key })),
        inspectionPath, usableBudgetMicros: budget.usableMicros?.toString() ?? null,
        uncertainBudgetMicros: budget.uncertainMicros.toString(),
      });
      this.log(`RECUPERAÇÃO ${task.id}: nova tentativa autorizada; será uma sessão de modelo nova, não continuação interna da anterior.`);
    }
    return true;
  }

  private async askForTechnicalRetry(taskId: string, failedAttempts: number, inspectionPath: string, budgetText: string): Promise<boolean | undefined> {
    if (!stdin.isTTY || !stdout.isTTY) {
      this.log(`Para autorizar a retentativa de ${taskId}, execute resume em um terminal interativo e revise ${inspectionPath}.`);
      return undefined;
    }
    const prompt = createInterface({ input: stdin, output: stdout });
    try {
      const answer = await prompt.question(
        `[${terminalTimestamp(new Date(), this.config.project.timezone)}] ${taskId}: ${failedAttempts} falhas técnicas; revisar ${inspectionPath}. ${budgetText}. Autorizar uma nova sessão? [s/N] `,
      );
      return ["s", "sim", "y", "yes"].includes(answer.trim().toLocaleLowerCase("pt-BR"));
    } finally { prompt.close(); }
  }

  private async inspectBlockedTechnicalTask(
    runId: string,
    task: Task,
    attempts: Array<Record<string, unknown>>,
  ): Promise<string> {
    const taskDirectory = path.join(this.config.storage.root, "runs", runId, "tasks", task.id);
    const currentWorkspaceFiles = Object.keys((await snapshotWorkspaceChanges(this.config.project.workspace)).files);
    const previousAttempts = [];
    for (const attempt of attempts) {
      const attemptNumber = Number(attempt.number);
      const attemptDirectory = path.join(taskDirectory, `attempt-${String(attemptNumber).padStart(3, "0")}`);
      let attribution: Record<string, unknown> | null = null;
      let error: Record<string, unknown> | null = null;
      try { attribution = JSON.parse(await readFile(path.join(attemptDirectory, "work-attribution.json"), "utf8")) as Record<string, unknown>; }
      catch { /* Interrupted before attribution was written. */ }
      try { error = JSON.parse(await readFile(path.join(attemptDirectory, "execution-error.json"), "utf8")) as Record<string, unknown>; }
      catch { /* Some technical failures are provider outcomes rather than executor exceptions. */ }
      previousAttempts.push({
        attemptId: attempt.id, number: attemptNumber, candidateKey: attempt.candidate_key,
        status: attempt.status, startedAt: attempt.started_at, finishedAt: attempt.finished_at,
        summary: typeof attempt.result_json === "string"
          ? (JSON.parse(attempt.result_json) as ExecutionResult).summary
          : null,
        observedChangedFiles: Array.isArray(attribution?.observedChangedFiles) ? attribution.observedChangedFiles : [],
        declaredChangedFiles: Array.isArray(attribution?.declaredChangedFiles) ? attribution.declaredChangedFiles : [],
        executionError: error,
      });
    }
    const inspectionPath = path.join(taskDirectory, `retry-inspection-${Date.now()}.json`);
    await writeJson(inspectionPath, {
      at: nowUtc(), runId, milestoneId: task.milestoneId, taskId: task.id,
      recovery: "fresh_attempt_requires_human_authorization",
      previousAttempts,
      currentWorkspaceFiles,
      workspaceAttributionWarning: "Current modified paths can include changes made before these attempts. Use per-attempt observedChangedFiles for the harness snapshot comparison; review contents before authorizing another model call.",
    });
    this.store.event(runId, "task.technical_retry_inspected", "task", task.id, {
      inspectionPath, failedAttempts: attempts.length, currentWorkspaceFileCount: currentWorkspaceFiles.length,
    });
    return inspectionPath;
  }

  private implementerContext(runId: string, task: Task): {
    attempt: Record<string, unknown>;
    candidate: ReturnType<ModelCatalog["get"]>;
    result: ExecutionResult;
    attemptDirectory: string;
  } | null {
    const attempt = this.store.get<Record<string, unknown>>(
      "SELECT * FROM attempts WHERE run_id=? AND task_id=? AND status='ready_for_verification' ORDER BY number DESC LIMIT 1",
      runId, task.id,
    );
    if (!attempt || typeof attempt.result_json !== "string") return null;
    const session = this.store.get<Record<string, unknown>>(
      "SELECT model_key FROM sessions WHERE attempt_id=? AND independent=0 ORDER BY started_at LIMIT 1",
      String(attempt.id),
    );
    if (typeof session?.model_key !== "string") throw new Error(`Sessão implementadora ausente para ${task.id}.`);
    return {
      attempt,
      candidate: this.catalog.get(session.model_key),
      result: JSON.parse(attempt.result_json) as ExecutionResult,
      attemptDirectory: path.join(
        this.config.storage.root, "runs", runId, "tasks", task.id,
        `attempt-${String(Number(attempt.number)).padStart(3, "0")}`,
      ),
    };
  }

  private reconcileInterruptedReview(runId: string, taskId: string): string | null {
    const attempt = this.store.get<Record<string, unknown>>(
      "SELECT * FROM attempts WHERE run_id=? AND task_id=? AND status='running' ORDER BY started_at DESC LIMIT 1",
      runId, `${taskId}-review`,
    );
    if (!attempt) return null;
    const attemptId = String(attempt.id);
    const call = this.store.get<Record<string, unknown>>(
      "SELECT * FROM provider_calls WHERE attempt_id=? AND state='running' ORDER BY started_at DESC LIMIT 1",
      attemptId,
    );
    const reservation = this.store.get<Record<string, unknown>>(
      "SELECT * FROM cost_reservations WHERE run_id=? AND task_id=? AND state='active' ORDER BY created_at DESC LIMIT 1",
      runId, taskId,
    );
    const now = nowUtc();
    this.store.transaction(() => {
      if (call) {
        this.store.run(
          "UPDATE provider_calls SET state='uncertain', uncertain_micros=COALESCE(estimated_micros, 0), finished_at=? WHERE id=? AND state='running'",
          now, String(call.id),
        );
      }
      if (reservation) {
        this.store.run(
          "UPDATE cost_reservations SET state='uncertain', provider_call_id=?, released_at=NULL WHERE id=? AND state='active'",
          call ? String(call.id) : null, String(reservation.id),
        );
        this.store.event(runId, "budget.uncertain", "cost_reservation", String(reservation.id), {
          amountMicros: String(reservation.amount_micros), cause: "interrupted_independent_review",
        });
      }
      this.store.run("UPDATE sessions SET finished_at=COALESCE(finished_at, ?) WHERE attempt_id=?", now, attemptId);
      this.store.run(
        "UPDATE attempts SET status='failed', failure_signature='interrupted_review', finished_at=? WHERE id=? AND status='running'",
        now, attemptId,
      );
      this.store.event(runId, "task.review_interrupted", "task", taskId, {
        attemptId, providerCallId: call?.id ?? null, reservationId: reservation?.id ?? null,
      });
    });
    return attemptId;
  }

  private reviewRequiresRetry(runId: string, taskId: string): boolean {
    const attempt = this.store.get<Record<string, unknown>>(
      "SELECT result_json FROM attempts WHERE run_id=? AND task_id=? AND status='failed' ORDER BY started_at DESC LIMIT 1",
      runId, `${taskId}-review`,
    );
    if (typeof attempt?.result_json !== "string") return false;
    try {
      const result = JSON.parse(attempt.result_json) as ExecutionResult;
      return result.outcome === "failed" && result.blockers.includes("pi_execution_failed");
    } catch {
      return false;
    }
  }

  private currentReviewFailures(runId: string, reviewTaskId: string): number {
    return countCurrentReviewFailures(this.reviewAttemptRows(runId, reviewTaskId));
  }

  private reviewAttemptRows(runId: string, reviewTaskId: string): Record<string, unknown>[] {
    return this.store.all<Record<string, unknown>>(
      "SELECT candidate_key, result_json FROM attempts WHERE run_id=? AND task_id=? AND result_json IS NOT NULL ORDER BY started_at, number",
      runId, reviewTaskId,
    );
  }

  private unusedReviewCandidates(runId: string, task: Task, implementer: ModelCandidate, role: Role = "functionalReviewer"): ModelCandidate[] {
    const reviewAttempts = this.reviewAttemptRows(runId, `${task.id}-${role === "visualReviewer" ? "visual-review" : "review"}`);
    const failedAliases = attemptedModelAliases(currentReviewFailureAttempts(reviewAttempts), this.catalog.list());
    const attempted = new Set(failedAliases);
    return this.catalog.reviewerCandidates(role, implementer, task.id)
      .filter((candidate) => !attempted.has(candidate.alias));
  }

  private applyReviewDecision(runId: string, taskId: string, decision: ReviewDecision): boolean {
    if (decision === "passed") {
      this.store.setTaskState(runId, taskId, "passed");
      return true;
    }
    if (decision === "changes_requested") {
      this.store.setTaskState(runId, taskId, "changes_requested");
      return true;
    }
    if (decision === "paused") return false;
    this.store.setTaskState(runId, taskId, "verifying");
    this.store.setRunState(runId, "blocked", { cause: "independent_review_execution_failed", taskId });
    return false;
  }

  private async recoverInterruptedWork(runId: string, milestoneId: string): Promise<boolean> {
    const interrupted = this.store.listTasks(runId).filter((row) => row.milestone_id === milestoneId && row.state === "running");
    for (const row of interrupted) {
      const task = rowToTask(row);
      const context = this.implementerContext(runId, task);
      if (!context) {
        const inspectionPath = await this.inspectInterruptedAttempt(runId, task);
        this.store.setTaskState(runId, task.id, "blocked");
        this.store.setRunState(runId, "blocked", { cause: "interrupted_attempt_requires_reconciliation", taskId: task.id });
        this.log(`RECUPERAÇÃO ${task.id}: tentativa sem resultado final; sessão Pi não pode ser continuada. Inspeção do estado atual salva em ${inspectionPath}. Após reconciliar o custo, a tarefa será tentada em uma sessão nova.`);
        return false;
      }
      await mkdir(context.attemptDirectory, { recursive: true });
      this.store.event(runId, "task.recovery_resumed", "task", task.id, { attemptId: context.attempt.id, phase: "verification" });
      if (!(await this.verifyReadyResult(runId, task, context.result, context.candidate, context.attemptDirectory))) return false;
      if (this.store.listTasks(runId).find((item) => item.id === task.id)?.state === "passed") {
        this.logTaskSummary(runId, task, this.store.listTasks(runId).filter((item) => item.milestone_id === milestoneId).length, "concluída na recuperação");
      }
    }

    const verifying = this.store.listTasks(runId).filter((row) =>
      row.milestone_id === milestoneId
      && (row.state === "verifying" || (row.state === "blocked" && this.reviewRequiresRetry(runId, String(row.id)))),
    );
    for (const row of verifying) {
      const task = rowToTask(row);
      const context = this.implementerContext(runId, task);
      if (!context) {
        this.store.setTaskState(runId, task.id, "blocked");
        this.store.setRunState(runId, "blocked", { cause: "interrupted_review_requires_reconciliation", taskId: task.id });
        return false;
      }
      const interruptedAttemptId = this.reconcileInterruptedReview(runId, task.id);
      const revision = await currentRevision(this.config.project.workspace);
      const verification = this.store.get<Record<string, unknown>>(
        "SELECT id FROM verifier_runs WHERE run_id=? AND task_id=? AND revision=? AND status='passed' ORDER BY finished_at DESC LIMIT 1",
        runId, task.id, revision,
      );
      if (!verification) {
        await mkdir(context.attemptDirectory, { recursive: true });
        this.store.event(runId, "task.recovery_resumed", "task", task.id, {
          attemptId: context.attempt.id, interruptedAttemptId, phase: "verification",
        });
        if (!(await this.verifyReadyResult(runId, task, context.result, context.candidate, context.attemptDirectory))) return false;
        continue;
      }
      this.store.event(runId, "task.recovery_resumed", "task", task.id, {
        attemptId: context.attempt.id, interruptedAttemptId, phase: "independent_review", revision,
      });
      this.store.setTaskState(runId, task.id, "verifying");
      const decision = await this.reviewTaskWithFallbacks(runId, task, context.candidate, revision);
      if (!this.applyReviewDecision(runId, task.id, decision)) return false;
      if (this.store.listTasks(runId).find((item) => item.id === task.id)?.state === "passed") {
        this.logTaskSummary(runId, task, this.store.listTasks(runId).filter((item) => item.milestone_id === milestoneId).length, "concluída na recuperação");
      }
    }
    return true;
  }

  private async inspectInterruptedAttempt(runId: string, task: Task): Promise<string> {
    const attempt = this.store.get<Record<string, unknown>>(
      "SELECT id, number, candidate_key, started_at FROM attempts WHERE run_id=? AND task_id=? ORDER BY number DESC LIMIT 1",
      runId, task.id,
    );
    const attemptNumber = Number(attempt?.number ?? 0);
    const attemptDirectory = path.join(
      this.config.storage.root, "runs", runId, "tasks", task.id,
      `attempt-${String(attemptNumber).padStart(3, "0")}`,
    );
    await mkdir(attemptDirectory, { recursive: true });
    let trace: Record<string, unknown>[] = [];
    try {
      const content = await readFile(path.join(attemptDirectory, "session-trace.jsonl"), "utf8");
      trace = content.split("\n").filter(Boolean).flatMap((line) => {
        try {
          const event = JSON.parse(line) as Record<string, unknown>;
          return [{
            at: event.at ?? null, type: event.type ?? null, sequence: event.sequence ?? null,
            elapsedMs: event.elapsedMs ?? null, marker: event.marker ?? null,
            toolName: event.toolName ?? null, isError: event.isError ?? null,
            durationMs: event.durationMs ?? null,
          }];
        } catch { return []; }
      });
    } catch { /* The trace may not exist if interruption happened during setup. */ }
    let currentWorkspaceFiles: string[] = [];
    let workspaceInspectionError: string | null = null;
    try {
      currentWorkspaceFiles = Object.keys((await snapshotWorkspaceChanges(this.config.project.workspace)).files);
    } catch (error) { workspaceInspectionError = safeError(error); }
    const inspectionPath = path.join(attemptDirectory, "recovery-inspection.json");
    const inspection = {
      at: nowUtc(), runId, milestoneId: task.milestoneId, taskId: task.id,
      attemptId: attempt?.id ?? null, attemptNumber,
      candidateKey: attempt?.candidate_key ?? null,
      attemptStartedAt: attempt?.started_at ?? null,
      recovery: "fresh_attempt_required",
      reason: "The Pi session is in-memory and produced no final structured result; its internal state cannot be resumed.",
      currentWorkspaceFiles,
      workspaceInspectionError,
      workspaceAttributionWarning: "These are current uncommitted workspace paths. Without a durable pre-attempt snapshot, they may include changes made before this attempt and are not asserted to be caused by it.",
      traceEventCount: trace.length,
      traceCounts: trace.reduce<Record<string, number>>((counts, event) => {
        const key = typeof event.type === "string" ? event.type : "unknown";
        counts[key] = (counts[key] ?? 0) + 1;
        return counts;
      }, {}),
      lastTraceEvents: trace.slice(-20),
    };
    await writeJson(inspectionPath, inspection);
    this.store.event(runId, "task.interruption_inspected", "task", task.id, {
      attemptId: attempt?.id ?? null, attemptNumber, inspectionPath,
      currentWorkspaceFileCount: currentWorkspaceFiles.length, traceEventCount: trace.length,
      freshAttemptRequired: true,
    });
    return inspectionPath;
  }

  private async verifyReadyResult(
    runId: string,
    task: Task,
    result: ExecutionResult,
    candidate: ReturnType<ModelCatalog["get"]>,
    attemptDirectory: string,
  ): Promise<boolean> {
    const checkpoint = await checkpointFiles({
      workspace: this.config.project.workspace, protectedRoot: HARNESS_ROOT, runId, taskId: task.id, files: result.changedFiles,
    });
    this.store.event(runId, "git.checkpoint", "task", task.id, checkpoint);
    this.store.setTaskState(runId, task.id, "verifying");
    const verification = await verifyCommands({
      config: this.config, store: this.store, runId, taskId: task.id,
      commandNames: ["typecheck", "lint", "test"].filter((name) => Boolean(this.config.commands[name])),
      outputDirectory: attemptDirectory,
    });
    if (!verification.passed) {
      this.store.setTaskState(runId, task.id, "changes_requested");
      return true;
    }
    if (this.config.review.requireIndependentSession) {
      const decision = await this.reviewTaskWithFallbacks(runId, task, candidate, verification.revision);
      if (!this.applyReviewDecision(runId, task.id, decision)) return false;
      return true;
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
    const technicalFailure = result.outcome === "failed" && result.blockers.includes("pi_execution_failed");
    this.store.run(
      `UPDATE provider_calls SET state=?, provider_request_id=?, input_tokens=?, output_tokens=?, cached_tokens=?,
       reasoning_tokens=?, reported_micros=?, uncertain_micros=?, finished_at=? WHERE id=?`,
      uncertain ? "uncertain" : technicalFailure ? "failed" : "completed",
      result.usage?.providerRequestId ?? null, result.usage?.inputTokens ?? null, result.usage?.outputTokens ?? null,
      result.usage?.cachedTokens ?? null, result.usage?.reasoningTokens ?? null, uncertain ? null : actualMicros,
      uncertain ? estimatedMicros : null, nowUtc(), callId,
    );
  }

  private recordExecutionFailure(
    runId: string,
    taskId: string,
    attemptId: string,
    candidate: string,
    result: ExecutionResult,
  ): void {
    if (result.outcome !== "failed") return;
    this.store.event(runId, "attempt.execution_failed", "attempt", attemptId, {
      taskId, candidate, summary: result.summary, blockers: result.blockers,
      diagnostics: result.diagnostics ?? null,
    });
  }

  private async reviewTask(
    runId: string,
    task: Task,
    implementer: ReturnType<ModelCatalog["get"]>,
    revision: string,
    options: { role?: Role; suffix?: string; instructions?: string } = {},
  ): Promise<ReviewDecision> {
    const role = options.role ?? "functionalReviewer";
    const suffix = options.suffix ?? "review";
    const reviewTask: Task = {
      ...task,
      id: `${task.id}-${suffix}`,
      title: `${role === "visualReviewer" ? "Revisão visual" : "Revisão independente"} de ${task.id}`,
      description: options.instructions ? `Revise visualmente a etapa na revisão ${revision}; não edite arquivos.` : `Revise a implementação de ${task.id} na revisão ${revision}. Verifique os critérios sem editar arquivos.`,
      role,
      state: "running",
    };
    const declaredChangedFiles = this.implementerContext(runId, task)?.result.changedFiles ?? [];
    const priorCompletedFailures = this.currentReviewFailures(runId, reviewTask.id);
    const authorizedExtraRetry = this.reviewRetryAuthorization?.taskId === task.id
      && this.reviewRetryAuthorization.remainingAttempts > 0
      && priorCompletedFailures >= this.config.review.maxAttempts;
    if (priorCompletedFailures >= this.config.review.maxAttempts && !authorizedExtraRetry) {
      this.store.event(runId, "task.review_attempts_exhausted", "task", task.id, { attempts: priorCompletedFailures });
      return "retryable_failure";
    }
    const reviewRound = priorCompletedFailures + 1;
    const failureAttempts = currentReviewFailureAttempts(this.reviewAttemptRows(runId, reviewTask.id));
    const failedAliases = attemptedModelAliases(failureAttempts, this.catalog.list());
    let candidate: ModelCandidate;
    try {
      candidate = this.catalog.selectReviewer(role, implementer, task.id, reviewRound, failedAliases);
    } catch (error) {
      this.log(`POOL DE REVISÃO esgotado para ${task.id}; nenhum modelo será repetido. ${safeError(error)}`);
      return "retryable_failure";
    }
    const attemptId = createId("attempt");
    const outputDirectory = path.join(this.config.storage.root, "runs", runId, "tasks", task.id, suffix, attemptId);
    await mkdir(outputDirectory, { recursive: true });
    const prompt = [
      reviewTask.description,
      `Critérios:\n${task.acceptanceCriteria.map((item) => `- ${item}`).join("\n")}`,
      `Arquivos alterados declarados:\n${declaredChangedFiles.map((item) => `- ${item}`).join("\n") || "- nenhum"}`,
      options.instructions ?? "",
      "Concentre a inspeção nesses arquivos e nas configurações diretamente relacionadas. Faça no máximo 8 chamadas de leitura e finalize a resposta.",
      "Use apenas ferramentas de leitura. Não considere a autoavaliação do implementador como evidência.",
      `Responda somente JSON. O campo taskId deve ser exatamente "${reviewTask.id}".`,
      "Use outcome ready_for_verification para aprovação, changes_requested quando houver ajustes, ou failed somente se a revisão não puder ser concluída.",
      "changedFiles, claimedChecks, decisions, blockers e suggestedFollowUps devem ser arrays JSON de strings; use [] quando vazios, nunca objeto ou null. claimedChecks não é evidência.",
      "Inclua taskId, outcome, summary, changedFiles, claimedChecks, decisions, blockers e suggestedFollowUps.",
    ].join("\n\n");
    const estimated = this.ledger.estimate(candidate, Math.ceil(prompt.length / 4), candidate.maxOutputTokens);
    const attemptNumber = Number(this.store.get<Record<string, unknown>>(
      "SELECT COUNT(*) AS count FROM attempts WHERE run_id=? AND task_id=?",
      runId, reviewTask.id,
    )?.count ?? 0) + 1;
    let reservationId: string;
    try {
      reservationId = this.ledger.reserve(runId, task.id, candidate, estimated);
    } catch (error) {
      this.store.setRunState(runId, "paused_budget", { taskId: task.id, phase: "independent_review", error: safeError(error) });
      return "paused";
    }
    this.store.run(
      "INSERT INTO attempts(id, run_id, task_id, number, executor, candidate_key, status, started_at) VALUES (?, ?, ?, ?, ?, ?, 'running', ?)",
      attemptId, runId, reviewTask.id, attemptNumber, candidate.executor, candidate.alias, nowUtc(),
    );
    if (authorizedExtraRetry && this.reviewRetryAuthorization) {
      this.reviewRetryAuthorization.remainingAttempts -= 1;
      this.store.event(runId, "task.review_retry_consumed", "task", task.id, {
        attemptId, candidate: candidate.alias, priorFailures: priorCompletedFailures,
        remainingAuthorizedAttempts: this.reviewRetryAuthorization.remainingAttempts,
      });
    }
    const sessionId = createId("session");
    this.store.run(
      "INSERT INTO sessions(id, attempt_id, role, model_key, independent, started_at) VALUES (?, ?, ?, ?, 1, ?)",
      sessionId, attemptId, role, candidate.alias, nowUtc(),
    );
    const providerCallId = this.startProviderCall(attemptId, candidate, estimated);
    this.store.run("UPDATE cost_reservations SET provider_call_id=? WHERE id=? AND provider_call_id IS NULL", providerCallId, reservationId);
    const reviewStarted = performance.now();
    const executor = createExecutor(this.config);
    this.activeExecutor = executor;
    let result: ExecutionResult;
    try {
      result = await executor.execute({
        runId, attemptId, task: reviewTask, workspace: this.config.project.workspace, prompt, candidate,
        timeoutMs: this.config.execution.reviewTimeoutMinutes * 60_000, outputDirectory, readOnly: true,
        acceptedResultTaskIds: [reviewTask.id, task.id], timeZone: this.config.project.timezone,
      });
    } finally {
      this.activeExecutor = undefined;
      this.store.run("UPDATE sessions SET finished_at=? WHERE id=?", nowUtc(), sessionId);
    }
    await writeJson(path.join(outputDirectory, "result.json"), result);
    this.recordExecutionFailure(runId, task.id, attemptId, candidate.alias, result);
    const actualMicros = parseUsdToMicros(result.usage?.costUsd ?? "0") ?? 0n;
    const uncertain = candidate.modality === "metered_api" && result.outcome === "failed" && !result.usage;
    this.finishProviderCall(providerCallId, result, uncertain, estimated, actualMicros);
    this.ledger.reconcile({ runId, taskId: task.id, reservationId, providerCallId, amountMicros: uncertain ? estimated : actualMicros, uncertain });
    const reviewDurationMs = Math.round(performance.now() - reviewStarted);
    await writeJson(path.join(outputDirectory, "model-call.json"), {
      providerCallId, runId, taskId: task.id, role, alias: candidate.alias,
      provider: candidate.provider, modelId: candidate.modelId, modality: candidate.modality,
      durationMs: reviewDurationMs, outcome: result.outcome, inputTokens: result.usage?.inputTokens ?? null,
      outputTokens: result.usage?.outputTokens ?? null, cachedTokens: result.usage?.cachedTokens ?? null,
      costUsd: uncertain ? null : result.usage?.costUsd ?? "0", estimatedCostUsd: String(estimated), uncertain,
    });
    this.log(`Revisão ${candidate.alias} [${this.modelLocation(candidate.modality)}] · ${result.outcome} · ${result.usage?.inputTokens ?? "?"}/${result.usage?.outputTokens ?? "?"} tokens · USD ${uncertain ? "incerto" : result.usage?.costUsd ?? "0"} · ${reviewDurationMs} ms.`);
    if (result.outcome === "failed") {
      this.log(`  ↳ Motivo: ${result.summary.replace(/\s+/g, " ").slice(0, 1000)}`);
    }
    this.store.run("UPDATE attempts SET status=?, result_json=?, finished_at=? WHERE id=?", result.outcome, JSON.stringify(result), nowUtc(), attemptId);
    const decision: ReviewDecision = result.outcome === "ready_for_verification" && result.blockers.length === 0
      ? "passed"
      : result.outcome === "failed" && result.blockers.includes("pi_execution_failed")
        ? "retryable_failure"
        : "changes_requested";
    if (decision !== "passed") {
      this.store.run(
        "INSERT INTO findings(id, run_id, severity, category, summary, evidence_path, state, created_at) VALUES (?, ?, 'major', 'independent_review', ?, ?, 'open', ?)",
        createId("finding"), runId, result.summary, path.join(outputDirectory, "result.json"), nowUtc(),
      );
    }
    return decision;
  }

  private async reviewTaskWithFallbacks(
    runId: string,
    task: Task,
    implementer: ReturnType<ModelCatalog["get"]>,
    revision: string,
  ): Promise<ReviewDecision> {
    let decision: ReviewDecision = "retryable_failure";
    const authorizedExtraAttempts = this.reviewRetryAuthorization?.taskId === task.id
      ? this.reviewRetryAuthorization.remainingAttempts
      : 0;
    const attemptLimit = this.config.review.maxAttempts + authorizedExtraAttempts;
    for (let fallback = 0; fallback < attemptLimit; fallback += 1) {
      if (!this.unusedReviewCandidates(runId, task, implementer).length) {
        this.log(`POOL DE REVISÃO esgotado para ${task.id}; todos os modelos elegíveis já foram tentados.`);
        this.store.event(runId, "task.review_pool_exhausted", "task", task.id, {
          attemptedAliases: attemptedModelAliases(
            currentReviewFailureAttempts(this.reviewAttemptRows(runId, `${task.id}-review`)), this.catalog.list(),
          ),
        });
        return "retryable_failure";
      }
      decision = await this.reviewTask(runId, task, implementer, revision);
      if (decision !== "retryable_failure") return decision;
      const failures = this.currentReviewFailures(runId, `${task.id}-review`);
      const hasAuthorizedAttempts = this.reviewRetryAuthorization?.taskId === task.id
        && this.reviewRetryAuthorization.remainingAttempts > 0;
      if (failures >= this.config.review.maxAttempts && !hasAuthorizedAttempts) return decision;
      this.store.event(runId, "task.review_fallback", "task", task.id, {
        completedFailures: failures,
        remainingAttempts: Math.max(0, this.config.review.maxAttempts - failures)
          + (this.reviewRetryAuthorization?.taskId === task.id ? this.reviewRetryAuthorization.remainingAttempts : 0),
      });
    }
    return decision;
  }

  private async reviewMilestoneVisuals(
    runId: string,
    milestoneId: string,
    revision: string,
    evidence: VisualEvidence[],
  ): Promise<ReviewDecision> {
    const stageTasks = this.store.listTasks(runId).filter((row) => row.milestone_id === milestoneId);
    const baseRow = stageTasks.at(-1);
    if (!baseRow) return "retryable_failure";
    const task = rowToTask(baseRow);
    const implementation = this.implementerContext(runId, task);
    if (!implementation) {
      this.store.event(runId, "visual_review.unavailable", "milestone", milestoneId, { reason: "No implementation context available for visual reviewer." });
      return "retryable_failure";
    }
    const evidenceLines = evidence.map((item) => [
      `Viewport ${item.viewport}px: screenshot=${item.screenshot}`,
      item.navigationError ? `navigationError=${item.navigationError}` : "",
      item.screenshotError ? `screenshotError=${item.screenshotError}` : "",
      `consoleErrors=${JSON.stringify(item.consoleErrors)}`,
      `failedRequests=${JSON.stringify(item.failedRequests)}`,
      `horizontalOverflow=${item.horizontalOverflow}`,
      `accessibilityViolations=${JSON.stringify(item.accessibilityViolations)}`,
    ].filter(Boolean).join("\n")).join("\n\n");
    const instructions = [
      `Revise visualmente a etapa ${milestoneId}, revisão ${revision}. O harness capturou evidência real nos viewports configurados.`,
      "Abra/inspecione os screenshots listados usando a ferramenta de leitura; verifique layout mobile, hierarquia, conteúdo cortado, overflow e aparência geral.",
      "Considere desktop apenas como reflow/empilhamento, nunca como uma experiência desktop independente.",
      "Não edite arquivos. Aponte somente problemas reproduzíveis e visíveis; não invente defeitos. Se estiver bom, aprove.",
      "Evidências:\n" + evidenceLines,
    ].join("\n\n");
    let decision: ReviewDecision = "retryable_failure";
    const reviewTaskId = `${task.id}-visual-review`;
    const failures = this.currentReviewFailures(runId, reviewTaskId);
    const attempted = attemptedModelAliases(
      currentReviewFailureAttempts(this.reviewAttemptRows(runId, reviewTaskId)), this.catalog.list(),
    );
    for (let attempt = failures; attempt < this.config.review.maxAttempts; attempt += 1) {
      const available = this.catalog.reviewerCandidates("visualReviewer", implementation.candidate, milestoneId)
        .filter((candidate) => !attempted.includes(candidate.alias));
      if (!available.length) break;
      decision = await this.reviewTask(runId, task, implementation.candidate, revision, {
        role: "visualReviewer", suffix: "visual-review", instructions,
      });
      const updated = this.reviewAttemptRows(runId, reviewTaskId);
      const latest = updated.at(-1);
      if (latest) {
        const alias = this.catalog.list().find((candidate) => candidate.alias === latest.candidate_key)?.alias;
        if (alias) attempted.push(alias);
      }
      if (decision !== "retryable_failure") return decision;
    }
    this.store.event(runId, "visual_review.failed", "milestone", milestoneId, {
      attemptedAliases: attempted, evidencePath: path.join(this.config.storage.root, "runs", runId, "milestones", milestoneId, "visual", "visual-evidence.json"),
    });
    return "retryable_failure";
  }

  private handleFailure(runId: string, task: Task, previous: Record<string, unknown>[], signature: string | null, result: ExecutionResult): boolean {
    this.log(`PROBLEMA ${task.id}: ${result.outcome} — ${result.summary}${result.blockers.length ? ` [${result.blockers.join(", ")}]` : ""}.`);
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
      const failedCheck = verification.results.find((result) => result.status === "failed");
      this.store.setMilestoneState(runId, milestoneId, "changes_requested", revision);
      this.store.setRunState(runId, "blocked", {
        cause: "milestone_verification_failed",
        command: failedCheck?.id ?? null,
        exitCode: failedCheck?.exitCode ?? null,
        outputPath: failedCheck?.outputPath ?? null,
        artifactPath: failedCheck?.artifactPath ?? null,
      });
      return runId;
    }
    let hostingSnapshot: HostingSnapshot | undefined;
    if (this.config.hostingSnapshots?.enabled) {
      const current = await currentRevision(this.config.project.workspace);
      if (current !== verification.revision) throw new Error("O workspace mudou depois das verificações; o snapshot Hosting não foi publicado.");
      const deployed = await deployHostingSnapshot({ config: this.config, milestoneId, revision: verification.revision });
      if (!deployed) throw new Error("Hosting snapshots estão habilitados, mas nenhum site foi publicado.");
      hostingSnapshot = deployed;
      await persistHostingSnapshot({ config: this.config, store: this.store, runId, snapshot: deployed });
      this.log(`Snapshot permanente da etapa ${milestoneId}: ${deployed.url} · versão ${deployed.siteId}.`);
      const visualDirectory = path.join(this.config.storage.root, "runs", runId, "milestones", milestoneId, "visual");
      let evidence: VisualEvidence[];
      try {
        evidence = await captureVisualEvidence({ config: this.config, url: deployed.url, outputDirectory: visualDirectory });
      } catch (error) {
        const evidencePath = path.join(visualDirectory, "visual-evidence.json");
        this.store.event(runId, "visual_capture.failed", "milestone", milestoneId, { error: safeError(error), evidencePath });
        this.store.setRunState(runId, "blocked", { cause: "visual_capture_failed", milestoneId, outputPath: evidencePath });
        this.log(`BLOQUEIO visual ${milestoneId}: captura não concluída; veja ${evidencePath}. ${safeError(error)}`);
        return runId;
      }
      const structuralFailures = evidence.filter((item) => item.navigationError || item.screenshotError || item.horizontalOverflow || item.consoleErrors.length || item.failedRequests.length || item.accessibilityViolations.length);
      const evidencePath = path.join(visualDirectory, "visual-evidence.json");
      this.store.event(runId, structuralFailures.length ? "visual_capture.findings" : "visual_capture.completed", "milestone", milestoneId, {
        evidencePath, viewports: evidence.map((item) => item.viewport), failures: structuralFailures.length,
      });
      const visualVerifierId = createId("verification");
      this.store.run(
        `INSERT INTO verifier_runs(id, run_id, revision, verifier_id, verifier_version, status, output_path, started_at, finished_at)
         VALUES (?, ?, ?, 'visual-structural', '2', ?, ?, ?, ?)`,
        visualVerifierId, runId, verification.revision, structuralFailures.length ? "failed" : "passed", evidencePath, nowUtc(), nowUtc(),
      );
      if (structuralFailures.length) {
        const details = structuralFailures.map((item) => [
          `Viewport ${item.viewport}px`, item.navigationError ? `Navegação: ${item.navigationError}` : "",
          item.screenshotError ? `Screenshot: ${item.screenshotError}` : "",
          item.horizontalOverflow ? "Overflow horizontal detectado." : "",
          ...item.consoleErrors.map((value) => `Erro de console: ${value}`),
          ...item.failedRequests.map((value) => `Request falhou: ${value}`),
          ...item.accessibilityViolations.map((value) => `Acessibilidade ${value.id}: ${value.help} (${value.targets.join(", ")})`),
        ].filter(Boolean).join("\n")).join("\n\n");
        const taskId = await this.queueHumanCorrections(runId, milestoneId, `Corrija somente estes achados automatizados de navegador/acessibilidade. Evidência JSON: ${evidencePath}\n\n${details}`, "verificação visual automatizada");
        this.store.setRunState(runId, "paused", { cause: "visual_verification_failed", milestoneId, taskId, outputPath: evidencePath });
        this.log(`ALERTA visual ${milestoneId}: ${structuralFailures.length}/${evidence.length} viewport(s) com achados. Tarefa ${taskId} criada; retome para corrigi-los. Evidência: ${evidencePath}`);
        return runId;
      }
      const visualDecision = await this.reviewMilestoneVisuals(runId, milestoneId, verification.revision, evidence);
      if (visualDecision === "paused") return runId;
      if (visualDecision === "changes_requested") {
        const lastTask = this.store.listTasks(runId).filter((row) => row.milestone_id === milestoneId).at(-1);
        const lastTaskId = `${typeof lastTask?.id === "string" ? lastTask.id : "missing-task"}-visual-review`;
        const review = this.store.get<Record<string, unknown>>(
          "SELECT result_json FROM attempts WHERE run_id=? AND task_id=? ORDER BY started_at DESC LIMIT 1", runId, lastTaskId,
        );
        let summary = "Revisor visual solicitou ajustes; consulte o resultado detalhado da revisão.";
        if (typeof review?.result_json === "string") {
          try {
            const result = JSON.parse(review.result_json) as ExecutionResult;
            summary = [result.summary, ...result.decisions, ...result.suggestedFollowUps].join("\n- ");
          } catch { /* Keep fallback message. */ }
        }
        const taskId = await this.queueHumanCorrections(runId, milestoneId, `${summary}\n\nEvidência visual: ${evidencePath}`, "revisão visual independente");
        this.log(`ALERTA visual: modelo apontou ajustes. Tarefa isolada ${taskId} criada; retome para corrigi-los.`);
        return runId;
      }
      if (visualDecision !== "passed") {
        this.store.setRunState(runId, "blocked", { cause: "visual_review_execution_failed", milestoneId, outputPath: evidencePath });
        this.log(`BLOQUEIO visual ${milestoneId}: nenhum revisor visual concluiu; evidência em ${evidencePath}.`);
        return runId;
      }
      this.log(`Revisão visual independente aprovada · ${evidence.length} viewports · evidência ${evidencePath}.`);
    }
    if (this.config.execution.humanGate === "every_milestone" || (this.config.execution.humanGate === "final_only" && isFinal)) {
      this.store.setMilestoneState(runId, milestoneId, "awaiting_human", revision);
      this.store.setRunState(runId, "awaiting_human");
      await writeHumanReview({
        config: this.config, store: this.store, runId, milestoneId, revision, verificationPassed: true,
        ...(hostingSnapshot ? { hostingSnapshot } : {}),
      });
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

  async publishHostingSnapshotForReview(runId: string, milestoneId: string): Promise<HostingSnapshot> {
    if (!this.config.hostingSnapshots?.enabled) throw new Error("Snapshots permanentes do Hosting não estão habilitados na configuração.");
    const milestone = this.store.get<Record<string, unknown>>(
      "SELECT * FROM milestones WHERE run_id=? AND id=?", runId, milestoneId,
    );
    if (!milestone) throw new Error("Etapa inexistente nesta execução.");
    if (milestone.state !== "awaiting_human" || typeof milestone.revision !== "string") {
      throw new Error("Só é possível publicar uma versão que passou pelas verificações e aguarda revisão humana.");
    }
    await this.assertMilestoneBranch(runId, milestoneId);
    const current = await currentRevision(this.config.project.workspace);
    if (current !== milestone.revision) throw new Error("O workspace mudou desde as verificações; rode o harness novamente antes de publicar.");
    const snapshot = await deployHostingSnapshot({ config: this.config, milestoneId, revision: current });
    if (!snapshot) throw new Error("Nenhum snapshot foi publicado.");
    await persistHostingSnapshot({ config: this.config, store: this.store, runId, snapshot });
    await writeHumanReview({
      config: this.config, store: this.store, runId, milestoneId, revision: current,
      verificationPassed: true, hostingSnapshot: snapshot,
    });
    return snapshot;
  }

  async importFeedback(runId: string, source: string, taskId: string, milestoneId?: string): Promise<string> {
    milestoneId ??= this.activeHumanReviewMilestone(runId);
    if (!milestoneId) throw new Error("Nenhuma etapa configurada para receber feedback.");
    const content = await readFile(source, "utf8");
    if (!content.trim()) throw new Error("Feedback vazio.");
    taskId = this.normalizeFeedbackTask(runId, milestoneId, taskId);
    this.assertFeedbackTask(runId, milestoneId, taskId);
    await this.assertMilestoneBranch(runId, milestoneId);
    const directory = path.join(this.config.storage.root, "runs", runId, "milestones", milestoneId);
    await mkdir(directory, { recursive: true });
    const destination = path.join(directory, `human-feedback-${encodeURIComponent(taskId)}-${Date.now()}.md`);
    await cp(source, destination, { errorOnExist: true });
    const revision = await currentRevision(this.config.project.workspace);
    this.store.createApproval({ runId, milestoneId, revision, decision: "changes_requested", actor: process.env.USER ?? "human", scope: "task", feedbackPath: destination });
    this.store.event(runId, "feedback.imported", "task", taskId, { milestoneId, feedbackPath: destination });
    this.store.setTaskState(runId, taskId, "changes_requested");
    this.store.setMilestoneState(runId, milestoneId, "changes_requested", revision);
    this.store.setRunState(runId, "paused");
    return destination;
  }

  async importFeedbackContent(runId: string, content: string, taskId: string, milestoneId?: string, actor = "dashboard-human"): Promise<string> {
    milestoneId ??= this.activeHumanReviewMilestone(runId);
    if (!milestoneId) throw new Error("Nenhuma etapa configurada para receber feedback.");
    if (!content.trim()) throw new Error("Feedback vazio.");
    taskId = this.normalizeFeedbackTask(runId, milestoneId, taskId);
    this.assertFeedbackTask(runId, milestoneId, taskId);
    await this.assertMilestoneBranch(runId, milestoneId);
    const directory = path.join(this.config.storage.root, "runs", runId, "milestones", milestoneId);
    await mkdir(directory, { recursive: true });
    const destination = path.join(directory, `human-feedback-${encodeURIComponent(taskId)}-${Date.now()}.md`);
    await writeFile(destination, content, { mode: 0o600, flag: "wx" });
    const revision = await currentRevision(this.config.project.workspace);
    this.store.createApproval({ runId, milestoneId, revision, decision: "changes_requested", actor, scope: "task", feedbackPath: destination });
    this.store.event(runId, "feedback.imported", "task", taskId, { milestoneId, feedbackPath: destination });
    this.store.setTaskState(runId, taskId, "changes_requested");
    this.store.setMilestoneState(runId, milestoneId, "changes_requested", revision);
    this.store.setRunState(runId, "paused");
    return destination;
  }

  private activeHumanReviewMilestone(runId: string): string | undefined {
    const awaitingReview = this.store.listMilestones(runId).find((item) => item.state === "awaiting_human");
    return typeof awaitingReview?.id === "string" ? awaitingReview.id : undefined;
  }

  private normalizeFeedbackTask(runId: string, milestoneId: string, requestedTaskId: string): string {
    if (requestedTaskId !== "human-corrections") return requestedTaskId;
    const milestone = this.store.get<Record<string, unknown>>("SELECT state FROM milestones WHERE run_id=? AND id=?", runId, milestoneId);
    if (milestone?.state !== "awaiting_human") throw new Error(`Feedback só pode ser importado quando a etapa ${milestoneId} estiver aguardando revisão humana.`);
    const taskId = this.ensureHumanCorrectionsTask(runId, milestoneId);
    this.store.setTaskState(runId, taskId, "changes_requested");
    return taskId;
  }

  private ensureHumanCorrectionsTask(runId: string, milestoneId: string): string {
    const taskId = `human-corrections-${milestoneId}`;
    const existing = this.store.listTasks(runId).find((item) => item.id === taskId);
    if (!existing) {
      const milestoneTasks = this.store.listTasks(runId).filter((item) => item.milestone_id === milestoneId);
      this.store.saveTask({
        id: taskId,
        runId,
        milestoneId,
        title: `Correções humanas solicitadas — ${milestoneId}`,
        description: "Aplique exclusivamente os itens objetivos registrados nos relatórios de revisão visual e/ou feedback humano desta etapa. Não amplie o escopo, não refatore áreas não relacionadas e não altere comportamento que não foi solicitado. Se um item for ambíguo ou conflitar com requisitos, explique o bloqueio em vez de inferir uma mudança ampla.",
        state: "pending",
        role: "implementer",
        requirementIds: [],
        dependencies: milestoneTasks.map((item) => String(item.id)),
        acceptanceCriteria: [
          "Cada item explícito do feedback humano foi implementado, ou registrado como bloqueado com justificativa concreta.",
          "Nenhuma mudança fora do feedback solicitado foi incluída.",
          "Os testes relevantes passaram e a revisão independente confirmou o escopo delimitado.",
        ],
        plannedFiles: [],
        maxAttempts: this.config.execution.maxAttemptsPerTask,
      });
      this.store.event(runId, "human_corrections.created", "task", taskId, { milestoneId });
    }
    return taskId;
  }

  private async queueHumanCorrections(runId: string, milestoneId: string, feedback: string, source: string): Promise<string> {
    const taskId = this.ensureHumanCorrectionsTask(runId, milestoneId);
    const directory = path.join(this.config.storage.root, "runs", runId, "milestones", milestoneId);
    await mkdir(directory, { recursive: true });
    const feedbackPath = path.join(directory, `human-feedback-${encodeURIComponent(taskId)}-${Date.now()}.md`);
    await writeFile(feedbackPath, `# Ajustes delimitados — ${source}\n\n${feedback.trim()}\n`, { mode: 0o600, flag: "wx" });
    this.store.setTaskState(runId, taskId, "changes_requested");
    this.store.setMilestoneState(runId, milestoneId, "changes_requested");
    this.store.setRunState(runId, "paused", { cause: "human_corrections_queued", milestoneId, taskId, feedbackPath });
    this.store.event(runId, "human_corrections.queued", "task", taskId, { milestoneId, source, feedbackPath });
    return taskId;
  }

  private assertFeedbackTask(runId: string, milestoneId: string, taskId: string): void {
    const milestone = this.store.get<Record<string, unknown>>("SELECT state FROM milestones WHERE run_id=? AND id=?", runId, milestoneId);
    if (milestone?.state !== "awaiting_human") throw new Error(`Feedback só pode ser importado quando a etapa ${milestoneId} estiver aguardando revisão humana.`);
    const task = this.store.listTasks(runId).find((item) => item.id === taskId);
    if (!task) throw new Error(`Tarefa ${taskId} inexistente nesta execução.`);
    if (task.milestone_id !== milestoneId) throw new Error(`Tarefa ${taskId} não pertence à etapa ${milestoneId}.`);
    if (["running", "verifying"].includes(String(task.state))) throw new Error(`Tarefa ${taskId} está em execução; aguarde o gate humano para importar feedback.`);
  }
}
