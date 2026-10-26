import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { planningConfigFingerprint } from "../../src/state/inputs.js";
import { createTestConfig } from "../helpers/config.js";

describe("entrada estrutural da configuração", () => {
  test("ignora parâmetros operacionais e detecta mudanças de planejamento", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness-input-fingerprint-"));
    const config = await createTestConfig(root);
    const operationalChange = {
      ...config,
      execution: {
        ...config.execution,
        reviewTimeoutMinutes: 4,
        maxAttemptsPerTask: config.execution.maxAttemptsPerTask + 1,
      },
    };
    const structuralChange = {
      ...config,
      project: { ...config.project, profile: "changed-profile" },
    };

    expect(planningConfigFingerprint(operationalChange).sha256)
      .toBe(planningConfigFingerprint(config).sha256);
    expect(planningConfigFingerprint(structuralChange).sha256)
      .not.toBe(planningConfigFingerprint(config).sha256);
  });
});
