import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { reconcileInterruptedCall } from "../../src/orchestrator/reconcile.js";
import { StateStore } from "../../src/state/store.js";
import { createTestConfig } from "../helpers/config.js";

async function createInterruptedState() {
  const root = await mkdtemp(path.join(os.tmpdir(), "harness-reconcile-"));
  const config = await createTestConfig(root, { projectLimit: "60" });
  const store = new StateStore(config.storage.root);
  store.upsertProject({ id: config.project.id, workspace: config.project.workspace, profile: "generic", timezone: "UTC" });
  store.createRun({ id: "r", projectId: config.project.id, configPath: config.configPath, configHash: "h" });
  store.createMilestone("r", { id: "1-base", title: "Base", objective: "Base", position: 1 });
  store.saveTask({
    id: "task-002", runId: "r", milestoneId: "1-base", title: "T", description: "T", state: "running",
    role: "implementer", requirementIds: ["REQ-1-001"], dependencies: [], acceptanceCriteria: ["ok"], plannedFiles: [], maxAttempts: 3,
  });
  store.run(
    `INSERT INTO attempts(id, run_id, task_id, number, executor, candidate_key, status, started_at)
     VALUES ('a6', 'r', 'task-002', 6, 'pi', 'pi:openrouter:openai/gpt-6.1-sol:current', 'running', '2026-10-31T18:39:01.661Z')`,
  );
  store.run(
    `INSERT INTO provider_calls(id, attempt_id, provider, model_id, modality, state, estimated_micros, started_at, finished_at)
     VALUES ('c6', 'a6', 'openrouter', 'openai/gpt-6.1-sol', 'metered_api', 'uncertain', 82570, '2026-10-31T18:39:01.748Z', '2026-10-31T18:43:29.741Z')`,
  );
  store.run(
    `INSERT INTO cost_reservations(id, run_id, task_id, provider_call_id, amount_micros, state, created_at)
     VALUES ('res6', 'r', 'task-002', NULL, 82570, 'active', '2026-10-31T18:39:01.661Z')`,
  );
  store.setTaskState("r", "task-002", "blocked");
  store.setRunState("r", "blocked", { cause: "interrupted_attempt_requires_reconciliation", taskId: "task-002" });
  return { store, config };
}

describe("reconciliação de chamadas interrompidas", () => {
  test("registra custo confirmado, tokens e deixa a tarefa retentável", async () => {
    const { store } = await createInterruptedState();
    try {
      const result = reconcileInterruptedCall(store, {
        runId: "r", providerCallId: "c6", actualCostUsd: "0.5575", inputTokens: 922299,
        outputTokens: 19711, note: "OpenRouter Activity: 23 gerações entre 15:39 e 15:43.", retryInterruptedTask: true,
      });
      expect(result).toMatchObject({ taskId: "task-002", attemptNumber: 6, actualCostMicros: "557500", taskMadeRetryable: true });
      expect(store.get("SELECT state, reported_micros, uncertain_micros, input_tokens, output_tokens FROM provider_calls WHERE id='c6'")).toMatchObject({
        state: "reconciled", reported_micros: 557500, uncertain_micros: null, input_tokens: 922299, output_tokens: 19711,
      });
      expect(store.get("SELECT state, released_at FROM cost_reservations WHERE id='res6'")?.state).toBe("released");
      expect(store.get("SELECT kind, amount_micros FROM ledger_entries WHERE provider_call_id='c6'")).toMatchObject({ kind: "reconciliation", amount_micros: 557500 });
      expect(store.get("SELECT state FROM tasks WHERE run_id='r' AND id='task-002'")?.state).toBe("changes_requested");
      const failedAttempt = store.get<Record<string, unknown>>("SELECT status, result_json FROM attempts WHERE id='a6'");
      expect(failedAttempt?.status).toBe("failed");
      expect(JSON.parse(String(failedAttempt?.result_json))).toMatchObject({ outcome: "failed", blockers: ["pi_execution_failed"] });
    } finally { store.close(); }
  });

  test("recusa reconciliar a mesma chamada duas vezes", async () => {
    const { store } = await createInterruptedState();
    try {
      const input = { runId: "r", providerCallId: "c6", actualCostUsd: "0.5575", note: "Activity" };
      reconcileInterruptedCall(store, input);
      expect(() => reconcileInterruptedCall(store, input)).toThrow(/não uncertain/);
    } finally { store.close(); }
  });
});
