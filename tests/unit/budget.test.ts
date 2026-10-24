import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { BudgetLedger } from "../../src/budget/ledger.js";
import type { ModelCandidate } from "../../src/domain/types.js";
import { StateStore } from "../../src/state/store.js";
import { createTestConfig } from "../helpers/config.js";

const paid: ModelCandidate = {
  alias: "paid", executor: "pi", provider: "p", modelId: "m", family: "f", modality: "metered_api",
  capabilities: ["text", "tools"], roles: ["implementer"], enabled: true, contextTokens: 8192,
  maxOutputTokens: 1024, inputUsdPerMillion: "1", outputUsdPerMillion: "1",
};

describe("orçamento", () => {
  test("bloqueia pago sem limite", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness-budget-"));
    const config = await createTestConfig(root);
    const store = new StateStore(config.storage.root);
    try {
      store.upsertProject({ id: config.project.id, workspace: config.project.workspace, profile: "generic", timezone: "UTC" });
      store.createRun({ id: "r", projectId: config.project.id, configPath: config.configPath, configHash: "h" });
      expect(() => new BudgetLedger(store, config).reserve("r", "t", paid, 1n)).toThrow(/projectLimit/);
    } finally { store.close(); }
  });

  test("reservas sequenciais não ultrapassam saldo e reserva final", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness-budget-"));
    const config = await createTestConfig(root, { projectLimit: "1" });
    const store = new StateStore(config.storage.root);
    try {
      store.upsertProject({ id: config.project.id, workspace: config.project.workspace, profile: "generic", timezone: "UTC" });
      store.createRun({ id: "r", projectId: config.project.id, configPath: config.configPath, configHash: "h" });
      const ledger = new BudgetLedger(store, config);
      ledger.reserve("r", "t1", paid, 600_000n);
      expect(() => ledger.reserve("r", "t2", paid, 300_000n)).toThrow(/insuficiente/);
    } finally { store.close(); }
  });
});
