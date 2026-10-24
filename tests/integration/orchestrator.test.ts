import { appendFile, mkdtemp } from "node:fs/promises";
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
