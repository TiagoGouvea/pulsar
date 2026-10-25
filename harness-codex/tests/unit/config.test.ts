import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { createTestConfig } from "../helpers/config.js";
import { extractRequirements, createTasks, milestoneFromRequirementId } from "../../src/planning/requirements.js";

describe("configuração e requisitos", () => {
  test("resolve caminhos com espaços e preserva obrigatórios", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness config "));
    const config = await createTestConfig(root);
    expect(config.project.workspace).toContain("workspace com espaços");
    expect(config.execution.implementationTimeoutMinutes).toBe(15);
    expect(config.execution.reviewTimeoutMinutes).toBe(2);
    expect(config.review.maxAttempts).toBe(2);
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
});
