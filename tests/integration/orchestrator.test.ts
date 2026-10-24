import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { Orchestrator } from "../../src/orchestrator/controller.js";
import { createTestConfig } from "../helpers/config.js";

describe("controlador", () => {
  test("executa fake, verifica e pausa no gate sem duplicar tarefas", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness-run-"));
    const config = await createTestConfig(root);
    const orchestrator = new Orchestrator(config);
    try {
      const runId = await orchestrator.run();
      expect(orchestrator.store.getRun(runId)?.state).toBe("awaiting_human");
      expect(orchestrator.store.listTasks(runId).every((task) => task.state === "passed")).toBe(true);
      const count = orchestrator.store.listTasks(runId).length;
      await orchestrator.run(runId);
      expect(orchestrator.store.listTasks(runId)).toHaveLength(count);
      expect(orchestrator.store.getRun(runId)?.state).toBe("awaiting_human");
    } finally { orchestrator.close(); }
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
});
