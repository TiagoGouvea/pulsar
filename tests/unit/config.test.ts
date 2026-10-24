import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { createTestConfig } from "../helpers/config.js";
import { extractRequirements, createTasks } from "../../src/planning/requirements.js";

describe("configuração e requisitos", () => {
  test("resolve caminhos com espaços e preserva obrigatórios", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness config "));
    const config = await createTestConfig(root);
    expect(config.project.workspace).toContain("workspace com espaços");
    const requirements = await extractRequirements(config);
    expect(requirements.map((item) => item.id)).toEqual(["REQ-001", "REQ-002"]);
    expect(requirements.every((item) => item.priority === "required")).toBe(true);
    const tasks = createTasks("run-test", requirements, 2);
    expect(tasks[1]?.dependencies).toEqual(["task-001"]);
  });
});
