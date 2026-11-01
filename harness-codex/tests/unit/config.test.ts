import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { createTestConfig } from "../helpers/config.js";
import { extractRequirements, createTasks, milestoneFromRequirementId } from "../../src/planning/requirements.js";
import { makeHostingSnapshotSiteId } from "../../src/verification/hosting-snapshot.js";

describe("configuração e requisitos", () => {
  test("resolve caminhos com espaços e preserva obrigatórios", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness config "));
    const config = await createTestConfig(root);
    expect(config.project.workspace).toContain("workspace com espaços");
    expect(config.execution.implementationTimeoutMinutes).toBe(20);
    expect(config.execution.reviewTimeoutMinutes).toBe(2);
    expect(config.review.maxAttempts).toBe(9);
    const requirements = await extractRequirements(config);
    expect(requirements.map((item) => item.id)).toEqual(["REQ-001", "REQ-002"]);
    expect(requirements.every((item) => item.priority === "required")).toBe(true);
    const tasks = createTasks("run-test", requirements, 2);
    expect(tasks[1]?.dependencies).toEqual(["task-001"]);
    expect(tasks.every((task) => task.milestoneId === "0-setup")).toBe(true);
  });

  test("associa prefixos numéricos aos oito marcos do projeto", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness milestones "));
    const config = await createTestConfig(root);
    config.project.milestones = [
      "0-setup", "1-base", "2-registro", "3-insights", "4-curadoria", "5-pwa-push", "6-ia-generativa", "7-polimento",
    ].map((id) => ({ id, title: id, objective: id }));
    expect(config.project.milestones.map((_, index) => milestoneFromRequirementId(`REQ-${index}-001`, config)))
      .toEqual(config.project.milestones.map((item) => item.id));
  });

  test("gera site permanente determinístico dentro do limite do Firebase", () => {
    const version = "a".repeat(64);
    const siteId = makeHostingSnapshotSiteId("pulsar", "6-ia-generativa", version);
    expect(siteId).toBe("pulsar-6-ia-generat-aaaaaaaaaa");
    expect(siteId.length).toBeLessThanOrEqual(30);
    expect(makeHostingSnapshotSiteId("pulsar", "6-ia-generativa", version)).toBe(siteId);
  });
});
