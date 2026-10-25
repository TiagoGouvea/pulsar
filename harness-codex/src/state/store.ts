import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { MilestoneState, Requirement, RunState, Task, TaskState } from "../domain/types.js";
import { createId, nowUtc } from "../utils/core.js";
import { migrations } from "./migrations.js";

type Row = Record<string, unknown>;

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

export class StateStore {
  readonly databasePath: string;
  private readonly db: DatabaseSync;

  constructor(storageRoot: string) {
    mkdirSync(storageRoot, { recursive: true, mode: 0o700 });
    this.databasePath = path.join(storageRoot, "state.sqlite");
    this.db = new DatabaseSync(this.databasePath);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
    this.migrate();
  }

  close(): void { this.db.close(); }

  transaction<T>(work: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = work();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  private migrate(): void {
    this.db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL) STRICT;");
    const applied = new Set(
      (this.db.prepare("SELECT version FROM schema_migrations").all() as Row[]).map((row) => Number(row.version)),
    );
    for (const migration of migrations) {
      if (applied.has(migration.version)) continue;
      this.transaction(() => {
        this.db.exec(migration.sql);
        this.run(
          "INSERT INTO schema_migrations(version, name, applied_at) VALUES (?, ?, ?)",
          migration.version, migration.name, nowUtc(),
        );
      });
    }
  }

  run(sql: string, ...params: SQLInputValue[]): void { this.db.prepare(sql).run(...params); }
  get<T extends Row>(sql: string, ...params: SQLInputValue[]): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }
  all<T extends Row>(sql: string, ...params: SQLInputValue[]): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  upsertProject(input: { id: string; workspace: string; profile: string; timezone: string }): void {
    const now = nowUtc();
    this.run(
      `INSERT INTO projects(id, workspace, profile, timezone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET workspace=excluded.workspace, profile=excluded.profile,
       timezone=excluded.timezone, updated_at=excluded.updated_at`,
      input.id, input.workspace, input.profile, input.timezone, now, now,
    );
  }

  createRun(input: { id: string; projectId: string; configPath: string; configHash: string }): void {
    const now = nowUtc();
    this.run(
      "INSERT INTO runs(id, project_id, state, config_path, config_hash, created_at, updated_at) VALUES (?, ?, 'created', ?, ?, ?, ?)",
      input.id, input.projectId, input.configPath, input.configHash, now, now,
    );
    this.event(input.id, "run.created", "run", input.id, { state: "created" });
  }

  getRun(runId: string): Row | undefined { return this.get("SELECT * FROM runs WHERE id=?", runId); }
  latestRun(projectId?: string): Row | undefined {
    return projectId
      ? this.get("SELECT * FROM runs WHERE project_id=? ORDER BY created_at DESC LIMIT 1", projectId)
      : this.get("SELECT * FROM runs ORDER BY created_at DESC LIMIT 1");
  }

  setRunState(runId: string, state: RunState, payload: Record<string, unknown> = {}): void {
    const now = nowUtc();
    this.transaction(() => {
      this.run(
        "UPDATE runs SET state=?, updated_at=?, completed_at=CASE WHEN ? IN ('completed','cancelled','failed') THEN ? ELSE completed_at END WHERE id=?",
        state, now, state, now, runId,
      );
      this.event(runId, `run.${state}`, "run", runId, payload);
    });
  }

  acquireLease(runId: string, owner: string, ttlSeconds: number): boolean {
    const now = nowUtc();
    const expires = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const existing = this.get<Row>("SELECT lease_owner, pid FROM runs WHERE id=?", runId);
    const existingPid = typeof existing?.pid === "number" ? existing.pid : null;
    const existingOwner = typeof existing?.lease_owner === "string" ? existing.lease_owner : null;
    if (existingPid != null && existingOwner && !isProcessAlive(existingPid)) {
      this.transaction(() => {
        const reclaimed = this.db.prepare(
          "UPDATE runs SET lease_owner=NULL, lease_expires_at=NULL, pid=NULL, updated_at=? WHERE id=? AND lease_owner=? AND pid=?",
        ).run(now, runId, existingOwner, existingPid);
        if (reclaimed.changes === 1) {
          this.event(runId, "lease.reclaimed", "run", runId, { previousOwner: existingOwner, previousPid: existingPid });
        }
      });
    }
    const result = this.db.prepare(
      `UPDATE runs SET lease_owner=?, lease_expires_at=?, heartbeat_at=?, pid=?, updated_at=?
       WHERE id=? AND (lease_owner IS NULL OR lease_expires_at < ? OR lease_owner=?)`,
    ).run(owner, expires, now, process.pid, now, runId, now, owner);
    return result.changes === 1;
  }

  heartbeat(runId: string, owner: string, ttlSeconds: number): void {
    const now = nowUtc();
    const expires = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    this.run("UPDATE runs SET heartbeat_at=?, lease_expires_at=?, updated_at=? WHERE id=? AND lease_owner=?", now, expires, now, runId, owner);
  }

  releaseLease(runId: string, owner: string): void {
    this.run("UPDATE runs SET lease_owner=NULL, lease_expires_at=NULL, pid=NULL WHERE id=? AND lease_owner=?", runId, owner);
  }

  event(runId: string | null, type: string, entityType: string, entityId: string | null, payload: unknown): string {
    const id = createId("evt");
    this.run(
      "INSERT INTO events(id, run_id, type, entity_type, entity_id, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      id, runId, type, entityType, entityId, JSON.stringify(payload), nowUtc(),
    );
    return id;
  }

  saveRequirement(runId: string, requirement: Requirement): void {
    this.run(
      `INSERT OR REPLACE INTO requirements(id, run_id, source_path, source_section, description, priority,
       acceptance_json, risks_json, dependencies_json, verification_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      requirement.id, runId, requirement.sourcePath, requirement.sourceSection, requirement.description,
      requirement.priority, JSON.stringify(requirement.acceptanceCriteria), JSON.stringify(requirement.risks),
      JSON.stringify(requirement.dependencies), requirement.verificationMethod,
    );
  }

  createMilestone(runId: string, input: { id: string; title: string; objective: string; position: number }): void {
    const now = nowUtc();
    this.run(
      "INSERT OR IGNORE INTO milestones(id, run_id, title, objective, state, position, created_at, updated_at) VALUES (?, ?, ?, ?, 'planned', ?, ?, ?)",
      input.id, runId, input.title, input.objective, input.position, now, now,
    );
  }

  setMilestoneState(runId: string, milestoneId: string, state: MilestoneState, revision?: string): void {
    this.run(
      "UPDATE milestones SET state=?, revision=COALESCE(?, revision), updated_at=? WHERE run_id=? AND id=?",
      state, revision ?? null, nowUtc(), runId, milestoneId,
    );
    this.event(runId, `milestone.${state}`, "milestone", milestoneId, { revision });
  }

  pinMilestoneBranch(runId: string, milestoneId: string, branch: string): string {
    this.run(
      "UPDATE milestones SET branch=COALESCE(branch, ?), updated_at=? WHERE run_id=? AND id=?",
      branch, nowUtc(), runId, milestoneId,
    );
    const milestone = this.get<Row>("SELECT branch FROM milestones WHERE run_id=? AND id=?", runId, milestoneId);
    if (typeof milestone?.branch !== "string") throw new Error(`Não foi possível fixar o branch da etapa ${milestoneId}.`);
    return milestone.branch;
  }

  saveTask(task: Task): void {
    const now = nowUtc();
    this.run(
      `INSERT OR IGNORE INTO tasks(id, run_id, milestone_id, title, description, state, role,
       requirement_ids_json, dependencies_json, acceptance_json, planned_files_json, max_attempts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      task.id, task.runId, task.milestoneId, task.title, task.description, task.state, task.role,
      JSON.stringify(task.requirementIds), JSON.stringify(task.dependencies), JSON.stringify(task.acceptanceCriteria),
      JSON.stringify(task.plannedFiles), task.maxAttempts, now, now,
    );
    for (const dependency of task.dependencies) {
      this.run("INSERT OR IGNORE INTO dependencies(run_id, task_id, depends_on_task_id) VALUES (?, ?, ?)", task.runId, task.id, dependency);
    }
  }

  setTaskState(runId: string, taskId: string, state: TaskState): void {
    this.run("UPDATE tasks SET state=?, updated_at=? WHERE run_id=? AND id=?", state, nowUtc(), runId, taskId);
    this.event(runId, `task.${state}`, "task", taskId, {});
  }

  listTasks(runId: string): Row[] { return this.all("SELECT * FROM tasks WHERE run_id=? ORDER BY created_at, id", runId); }
  listMilestones(runId: string): Row[] { return this.all("SELECT * FROM milestones WHERE run_id=? ORDER BY position", runId); }
  listRequirements(runId: string): Row[] { return this.all("SELECT * FROM requirements WHERE run_id=? ORDER BY id", runId); }
  listEvents(runId: string, limit = 100): Row[] {
    return this.all("SELECT * FROM events WHERE run_id=? ORDER BY sequence DESC LIMIT ?", runId, limit);
  }

  enqueueCommand(runId: string, command: string, payload: unknown = {}): string {
    const id = createId("cmd");
    this.run(
      "INSERT INTO control_commands(id, run_id, command, payload_json, state, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
      id, runId, command, JSON.stringify(payload), nowUtc(),
    );
    this.event(runId, "control.queued", "control_command", id, { command });
    return id;
  }

  pendingCommands(runId: string): Row[] {
    return this.all("SELECT * FROM control_commands WHERE run_id=? AND state='pending' ORDER BY created_at", runId);
  }

  handleCommand(id: string): void {
    this.run("UPDATE control_commands SET state='handled', handled_at=? WHERE id=?", nowUtc(), id);
  }

  createApproval(input: { runId: string; milestoneId: string; revision: string; decision: string; actor: string; scope: string; feedbackPath?: string }): string {
    const id = createId("approval");
    this.run(
      "INSERT INTO approvals(id, run_id, milestone_id, revision, decision, actor, scope, feedback_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      id, input.runId, input.milestoneId, input.revision, input.decision, input.actor, input.scope, input.feedbackPath ?? null, nowUtc(),
    );
    this.event(input.runId, "approval.recorded", "approval", id, input);
    return id;
  }
}
