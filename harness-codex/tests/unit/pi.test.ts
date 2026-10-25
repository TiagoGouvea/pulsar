import { describe, expect, test } from "vitest";
import { extractResult } from "../../src/executors/pi.js";

const result = {
  taskId: "task-001",
  outcome: "ready_for_verification",
  summary: "Revisão aprovada.",
  changedFiles: [],
  claimedChecks: [],
  decisions: [],
  blockers: [],
  suggestedFollowUps: [],
};

describe("contrato estruturado do Pi", () => {
  test("aceita o id original durante revisão e normaliza para o id canônico", () => {
    expect(extractResult(JSON.stringify(result), "task-001-review", ["task-001-review", "task-001"]).taskId)
      .toBe("task-001-review");
  });

  test("rejeita id que não pertence à tarefa", () => {
    expect(() => extractResult(JSON.stringify({ ...result, taskId: "task-999" }), "task-001"))
      .toThrow(/taskId inesperado/);
  });
});
