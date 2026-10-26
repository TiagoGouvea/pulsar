import { appendFile, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { Orchestrator } from "../../src/orchestrator/controller.js";
import { createTestConfig } from "../helpers/config.js";
import { runProcess } from "../../src/utils/process.js";
import { currentRevision } from "../../src/git/workspace.js";

describe("controlador", () => {
  test("executa fake, verifica e pausa no gate sem duplicar tarefas", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness-run-"));
    const config = await createTestConfig(root);
    const orchestrator = new Orchestrator(config);
    try {
      const runId = await orchestrator.run();
      expect(orchestrator.store.getRun(runId)?.state).toBe("awaiting_human");
      expect(orchestrator.store.listTasks(runId).every((task) => task.state === "passed")).toBe(true);
      expect(orchestrator.store.all("SELECT id FROM sessions WHERE independent=1")).toHaveLength(2);
      expect(orchestrator.store.all("SELECT id FROM provider_calls WHERE state='completed'")).toHaveLength(4);
      const count = orchestrator.store.listTasks(runId).length;
      await orchestrator.run(runId);
      expect(orchestrator.store.listTasks(runId)).toHaveLength(count);
      expect(orchestrator.store.getRun(runId)?.state).toBe("awaiting_human");
    } finally { orchestrator.close(); }
  });

  test("mudança de entrada exige replanejamento explícito", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness-input-"));
    const config = await createTestConfig(root);
    const orchestrator = new Orchestrator(config);
    try {
      const runId = await orchestrator.plan();
      const specPath = config.project.specs[0];
      if (!specPath) throw new Error("Spec de teste ausente.");
      await appendFile(specPath, "\n## REQ-003 [required] Novo escopo\n");
      await orchestrator.run(runId);
      expect(orchestrator.store.getRun(runId)?.state).toBe("blocked");
      expect(orchestrator.store.listEvents(runId).some((event) => event.type === "inputs.changed")).toBe(true);
    } finally { orchestrator.close(); }
  });

  test("cria baseline estrutural ao retomar uma run legada com ajuste operacional", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness-legacy-input-"));
    const config = await createTestConfig(root);
    const planningOrchestrator = new Orchestrator(config);
    const runId = await planningOrchestrator.plan();
    planningOrchestrator.store.run(
      "DELETE FROM input_versions WHERE run_id=? AND kind='planning_config'",
      runId,
    );
    planningOrchestrator.close();

    const resumedOrchestrator = new Orchestrator({
      ...config,
      execution: { ...config.execution, reviewTimeoutMinutes: 4 },
    });
    try {
      await resumedOrchestrator.run(runId);

      expect(resumedOrchestrator.store.getRun(runId)?.state).toBe("awaiting_human");
      expect(resumedOrchestrator.store.listEvents(runId)
        .some((event) => event.type === "inputs.planning_config_baselined")).toBe(true);
    } finally { resumedOrchestrator.close(); }
  });

  test("retoma tarefa bloqueada quando o limite operacional aumenta e a revisão pede alterações", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness-attempt-capacity-"));
    const config = await createTestConfig(root);
    const planningOrchestrator = new Orchestrator(config);
    const runId = await planningOrchestrator.plan();
    const task = planningOrchestrator.store.listTasks(runId)[0];
    if (!task) throw new Error("Tarefa de teste ausente.");
    const taskId = String(task.id);
    const now = new Date().toISOString();
    const implementation = JSON.stringify({
      taskId, outcome: "ready_for_verification", summary: "Rodada concluída.",
      changedFiles: [], claimedChecks: [], decisions: [], blockers: [], suggestedFollowUps: [],
    });
    for (const number of [1, 2]) {
      planningOrchestrator.store.run(
        "INSERT INTO attempts(id, run_id, task_id, number, executor, candidate_key, status, result_json, started_at, finished_at) VALUES (?, ?, ?, ?, 'fake', 'fake', 'ready_for_verification', ?, ?, ?)",
        `attempt-capacity-${number}`, runId, taskId, number, implementation, now, now,
      );
    }
    planningOrchestrator.store.run(
      "INSERT INTO attempts(id, run_id, task_id, number, executor, candidate_key, status, result_json, started_at, finished_at) VALUES ('review-capacity', ?, ?, 1, 'fake', 'fake', 'changes_requested', ?, ?, ?)",
      runId, `${taskId}-review`, JSON.stringify({
        taskId: `${taskId}-review`, outcome: "changes_requested", summary: "Ajuste necessário.",
        changedFiles: [], claimedChecks: [], decisions: [], blockers: ["ajuste"], suggestedFollowUps: [],
      }), now, now,
    );
    planningOrchestrator.store.setTaskState(runId, taskId, "blocked");
    planningOrchestrator.store.setRunState(runId, "blocked", { cause: "max_attempts", taskId });
    planningOrchestrator.close();

    const resumedOrchestrator = new Orchestrator({
      ...config,
      execution: { ...config.execution, maxAttemptsPerTask: 3 },
    });
    try {
      await resumedOrchestrator.run(runId);

      expect(resumedOrchestrator.store.getRun(runId)?.state).toBe("awaiting_human");
      expect(resumedOrchestrator.store.all(
        "SELECT id FROM attempts WHERE run_id=? AND task_id=?",
        runId, taskId,
      )).toHaveLength(3);
      expect(resumedOrchestrator.store.listEvents(runId)
        .some((event) => event.type === "task.attempt_capacity_recovered")).toBe(true);
    } finally { resumedOrchestrator.close(); }
  });

  test("não aceita sucesso alegado quando verificador falha", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness-fail-"));
    const config = await createTestConfig(root, { testCommand: ["node", "-e", "process.exit(3)"] });
    const orchestrator = new Orchestrator(config);
    try {
      const runId = await orchestrator.run();
      expect(orchestrator.store.getRun(runId)?.state).toBe("blocked");
      expect(orchestrator.store.listTasks(runId).some((task) => task.state === "passed")).toBe(false);
    } finally { orchestrator.close(); }
  });

  test("retoma na verificação sem repetir uma tentativa implementadora concluída", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness-recovery-"));
    const config = await createTestConfig(root);
    const orchestrator = new Orchestrator(config);
    try {
      const runId = await orchestrator.plan();
      const task = orchestrator.store.listTasks(runId)[0];
      if (!task) throw new Error("Tarefa de teste ausente.");
      const attemptId = "attempt-recoverable";
      const result = {
        taskId: String(task.id), outcome: "ready_for_verification", summary: "Implementação concluída.",
        changedFiles: ["arquivo-inexistente.md"], claimedChecks: [], decisions: [], blockers: [], suggestedFollowUps: [],
        usage: { inputTokens: 1, outputTokens: 1, costUsd: "0" },
      };
      orchestrator.store.run(
        "INSERT INTO attempts(id, run_id, task_id, number, executor, candidate_key, status, result_json, started_at, finished_at) VALUES (?, ?, ?, 1, 'fake', 'fake', 'ready_for_verification', ?, ?, ?)",
        attemptId, runId, String(task.id), JSON.stringify(result), new Date().toISOString(), new Date().toISOString(),
      );
      orchestrator.store.run(
        "INSERT INTO sessions(id, attempt_id, role, model_key, independent, started_at, finished_at) VALUES ('session-recoverable', ?, 'implementer', 'fake', 0, ?, ?)",
        attemptId, new Date().toISOString(), new Date().toISOString(),
      );
      orchestrator.store.setTaskState(runId, String(task.id), "running");

      await orchestrator.run(runId);

      expect(orchestrator.store.getRun(runId)?.state).toBe("awaiting_human");
      expect(orchestrator.store.listTasks(runId)[0]?.state).toBe("passed");
      expect(orchestrator.store.all("SELECT id FROM attempts WHERE run_id=? AND task_id=?", runId, String(task.id))).toHaveLength(1);
      expect(orchestrator.store.listEvents(runId).some((event) => event.type === "task.recovery_resumed")).toBe(true);
    } finally { orchestrator.close(); }
  });

  test("retoma revisão interrompida sem repetir implementação ou verificação válida", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness-review-recovery-"));
    const config = await createTestConfig(root);
    const orchestrator = new Orchestrator(config);
    try {
      const runId = await orchestrator.plan();
      const task = orchestrator.store.listTasks(runId)[0];
      if (!task) throw new Error("Tarefa de teste ausente.");
      const taskId = String(task.id);
      const now = new Date().toISOString();
      const revision = await currentRevision(config.project.workspace);
      const result = {
        taskId, outcome: "ready_for_verification", summary: "Implementação concluída.",
        changedFiles: [], claimedChecks: [], decisions: [], blockers: [], suggestedFollowUps: [],
        usage: { inputTokens: 1, outputTokens: 1, costUsd: "0" },
      };
      orchestrator.store.run(
        "INSERT INTO attempts(id, run_id, task_id, number, executor, candidate_key, status, result_json, started_at, finished_at) VALUES ('attempt-implementation', ?, ?, 1, 'fake', 'fake', 'ready_for_verification', ?, ?, ?)",
        runId, taskId, JSON.stringify(result), now, now,
      );
      orchestrator.store.run(
        "INSERT INTO sessions(id, attempt_id, role, model_key, independent, started_at, finished_at) VALUES ('session-implementation', 'attempt-implementation', 'implementer', 'fake', 0, ?, ?)",
        now, now,
      );
      orchestrator.store.run(
        "INSERT INTO verifier_runs(id, run_id, task_id, revision, verifier_id, verifier_version, status, started_at, finished_at) VALUES ('verification-passed', ?, ?, ?, 'test', '1', 'passed', ?, ?)",
        runId, taskId, revision, now, now,
      );
      orchestrator.store.run(
        "INSERT INTO attempts(id, run_id, task_id, number, executor, candidate_key, status, started_at) VALUES ('attempt-review-interrupted', ?, ?, 1, 'fake', 'fake', 'running', ?)",
        runId, `${taskId}-review`, now,
      );
      orchestrator.store.run(
        "INSERT INTO sessions(id, attempt_id, role, model_key, independent, started_at) VALUES ('session-review-interrupted', 'attempt-review-interrupted', 'functionalReviewer', 'fake', 1, ?)",
        now,
      );
      orchestrator.store.run(
        "INSERT INTO provider_calls(id, attempt_id, provider, model_id, modality, state, estimated_micros, started_at) VALUES ('call-review-interrupted', 'attempt-review-interrupted', 'fake', 'v1', 'fake', 'running', 123, ?)",
        now,
      );
      orchestrator.store.run(
        "INSERT INTO cost_reservations(id, run_id, task_id, amount_micros, state, created_at) VALUES ('reservation-review-interrupted', ?, ?, 123, 'active', ?)",
        runId, taskId, now,
      );
      orchestrator.store.setTaskState(runId, taskId, "verifying");

      await orchestrator.run(runId);

      expect(orchestrator.store.getRun(runId)?.state).toBe("awaiting_human");
      expect(orchestrator.store.all("SELECT id FROM attempts WHERE run_id=? AND task_id=?", runId, taskId)).toHaveLength(1);
      const reviews = orchestrator.store.all<Record<string, unknown>>(
        "SELECT status, number FROM attempts WHERE run_id=? AND task_id=? ORDER BY number",
        runId, `${taskId}-review`,
      );
      expect(reviews).toMatchObject([{ status: "failed", number: 1 }, { status: "ready_for_verification", number: 2 }]);
      expect(orchestrator.store.get<Record<string, unknown>>("SELECT state FROM provider_calls WHERE id='call-review-interrupted'")?.state).toBe("uncertain");
      expect(orchestrator.store.get<Record<string, unknown>>("SELECT state FROM cost_reservations WHERE id='reservation-review-interrupted'")?.state).toBe("uncertain");
      expect(orchestrator.store.listEvents(runId).some((event) => event.type === "task.review_interrupted")).toBe(true);
    } finally { orchestrator.close(); }
  });

  test("recupera bloqueio causado por resposta inválida do revisor", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness-review-contract-"));
    const config = await createTestConfig(root);
    const orchestrator = new Orchestrator(config);
    try {
      const runId = await orchestrator.plan();
      const task = orchestrator.store.listTasks(runId)[0];
      if (!task) throw new Error("Tarefa de teste ausente.");
      const taskId = String(task.id);
      const now = new Date().toISOString();
      const revision = await currentRevision(config.project.workspace);
      const implementation = {
        taskId, outcome: "ready_for_verification", summary: "Implementação válida.",
        changedFiles: [], claimedChecks: [], decisions: [], blockers: [], suggestedFollowUps: [],
      };
      const invalidReview = {
        taskId: `${taskId}-review`, outcome: "failed", summary: "Contrato JSON inválido.",
        changedFiles: [], claimedChecks: [], decisions: [], blockers: ["pi_execution_failed"], suggestedFollowUps: [],
      };
      orchestrator.store.run(
        "INSERT INTO attempts(id, run_id, task_id, number, executor, candidate_key, status, result_json, started_at, finished_at) VALUES ('attempt-valid-implementation', ?, ?, 1, 'fake', 'fake', 'ready_for_verification', ?, ?, ?)",
        runId, taskId, JSON.stringify(implementation), now, now,
      );
      orchestrator.store.run(
        "INSERT INTO sessions(id, attempt_id, role, model_key, independent, started_at, finished_at) VALUES ('session-valid-implementation', 'attempt-valid-implementation', 'implementer', 'fake', 0, ?, ?)",
        now, now,
      );
      orchestrator.store.run(
        "INSERT INTO verifier_runs(id, run_id, task_id, revision, verifier_id, verifier_version, status, started_at, finished_at) VALUES ('verification-before-invalid-review', ?, ?, ?, 'test', '1', 'passed', ?, ?)",
        runId, taskId, revision, now, now,
      );
      orchestrator.store.run(
        "INSERT INTO attempts(id, run_id, task_id, number, executor, candidate_key, status, result_json, started_at, finished_at) VALUES ('attempt-invalid-review', ?, ?, 1, 'fake', 'fake', 'failed', ?, ?, ?)",
        runId, `${taskId}-review`, JSON.stringify(invalidReview), now, now,
      );
      orchestrator.store.setTaskState(runId, taskId, "blocked");
      orchestrator.store.setRunState(runId, "blocked", { cause: "max_attempts", taskId });

      await orchestrator.run(runId);

      expect(orchestrator.store.getRun(runId)?.state).toBe("awaiting_human");
      expect(orchestrator.store.listTasks(runId)[0]?.state).toBe("passed");
      expect(orchestrator.store.all("SELECT id FROM attempts WHERE run_id=? AND task_id=?", runId, taskId)).toHaveLength(1);
      expect(orchestrator.store.all("SELECT id FROM attempts WHERE run_id=? AND task_id=?", runId, `${taskId}-review`)).toHaveLength(2);
      expect(orchestrator.store.listEvents(runId).some((event) => event.type === "task.recovery_resumed")).toBe(true);
    } finally { orchestrator.close(); }
  });

  test("fixa o branch durante a etapa e nunca o troca", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness-branch-"));
    const config = await createTestConfig(root);
    await runProcess(["git", "init", "-b", "0-setup"], { cwd: config.project.workspace });
    await runProcess(["git", "config", "user.name", "Harness Test"], { cwd: config.project.workspace });
    await runProcess(["git", "config", "user.email", "harness@example.invalid"], { cwd: config.project.workspace });
    await runProcess(["git", "commit", "--allow-empty", "-m", "initial"], { cwd: config.project.workspace });
    const orchestrator = new Orchestrator(config);
    try {
      const runId = await orchestrator.run();
      const milestone = orchestrator.store.listMilestones(runId)[0];
      expect(milestone?.branch).toBe("0-setup");
      await runProcess(["git", "switch", "-c", "outro-branch"], { cwd: config.project.workspace });
      await expect(orchestrator.approve(runId, "0-setup", String(milestone?.revision), "human"))
        .rejects.toThrow(/fixada no branch 0-setup/);
      expect((await runProcess(["git", "branch", "--show-current"], { cwd: config.project.workspace })).stdout.trim()).toBe("outro-branch");
    } finally { orchestrator.close(); }
  });
});
