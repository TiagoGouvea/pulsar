import { mkdtemp, readFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { writeWorkAttributionReport } from "../../src/reports/generator.js";
import { StateStore } from "../../src/state/store.js";
import { nowUtc, writeJson } from "../../src/utils/core.js";
import { createTestConfig } from "../helpers/config.js";

describe("relatório de atribuição de trabalho", () => {
  test("liga requisitos, tentativa, modelo e arquivos e preserva feedback entre atualizações", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness work attribution "));
    const config = await createTestConfig(root);
    const store = new StateStore(config.storage.root);
    const runId = "run-attribution-test";
    const attemptId = "attempt-local-qwen";
    const startedAt = nowUtc();
    const finishedAt = new Date(Date.now() + 1000).toISOString();
    try {
      store.upsertProject({ id: config.project.id, workspace: config.project.workspace, profile: config.project.profile, timezone: config.project.timezone });
      store.createRun({ id: runId, projectId: config.project.id, configPath: config.configPath, configHash: "test" });
      store.createMilestone(runId, { id: "1-base", title: "Base", objective: "Auth", position: 1 });
      store.saveTask({
        id: "task-001", runId, milestoneId: "1-base", title: "Implementar autenticação", description: "",
        state: "passed", role: "implementer", requirementIds: ["REQ-1-001"], dependencies: [],
        acceptanceCriteria: [], plannedFiles: [], maxAttempts: 2,
      });
      store.run(
        "INSERT INTO attempts(id, run_id, task_id, number, executor, candidate_key, status, result_json, started_at, finished_at) VALUES (?, ?, ?, 1, 'pi', 'local-qwen', 'ready_for_verification', ?, ?, ?)",
        attemptId, runId, "task-001", JSON.stringify({ changedFiles: ["src/auth.ts"] }), startedAt, finishedAt,
      );
      store.run(
        "INSERT INTO sessions(id, attempt_id, role, model_key, independent, started_at, finished_at) VALUES ('session-1', ?, 'implementer', 'local-qwen', 0, ?, ?)",
        attemptId, startedAt, finishedAt,
      );
      store.run(
        "INSERT INTO provider_calls(id, attempt_id, provider, model_id, modality, state, started_at, finished_at) VALUES ('call-1', ?, 'lmstudio', 'qwen3.5-9b-mlx', 'local', 'completed', ?, ?)",
        attemptId, startedAt, finishedAt,
      );
      const attributionPath = path.join(config.storage.root, "runs", runId, "tasks", "task-001", "attempt-001", "work-attribution.json");
      await mkdir(path.dirname(attributionPath), { recursive: true });
      await writeJson(attributionPath, { observedChangedFiles: ["src/auth.ts"], declaredChangedFiles: ["src/auth.ts"] });

      await writeWorkAttributionReport(config, store, runId, "1-base");
      const feedbackPath = path.join(config.storage.root, "runs", runId, "work-attribution-1-base-feedback.csv");
      const initialFeedback = await readFile(feedbackPath, "utf8");
      await writeFileForTest(feedbackPath, initialFeedback.replace('"",""', '"bom","Boa implementação"'));
      await writeWorkAttributionReport(config, store, runId, "1-base");

      const report = await readFile(path.join(config.storage.root, "runs", runId, "work-attribution-1-base.md"), "utf8");
      const feedback = await readFile(feedbackPath, "utf8");
      expect(report).toContain("REQ-1-001");
      expect(report).toContain("local-qwen");
      expect(report).toContain("src/auth.ts");
      expect(feedback).toContain("Boa implementação");
    } finally {
      store.close();
    }
  });
});

async function writeFileForTest(filePath: string, value: string): Promise<void> {
  const { writeFile } = await import("node:fs/promises");
  await writeFile(filePath, value);
}
