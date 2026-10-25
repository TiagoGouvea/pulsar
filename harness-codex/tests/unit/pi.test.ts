import { describe, expect, test } from "vitest";
import type { ModelCandidate } from "../../src/domain/types.js";
import { extractResult, localApiFor } from "../../src/executors/pi.js";

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

function localCandidate(input: Partial<ModelCandidate>): ModelCandidate {
  return {
    alias: "local",
    executor: "pi",
    provider: "lmstudio",
    modelId: "qwen3.5-9b-mlx",
    family: "qwen3.5",
    modality: "local",
    capabilities: ["text", "tools"],
    roles: ["implementer"],
    enabled: true,
    contextTokens: 8192,
    maxOutputTokens: 2048,
    ...input,
  };
}

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

describe("protocolo local do Pi", () => {
  test("usa Responses para GPT-OSS e Chat Completions para os demais", () => {
    expect(localApiFor(localCandidate({ modelId: "mlx-community/gpt-oss-20b", family: "gpt-oss" })))
      .toBe("openai-responses");
    expect(localApiFor(localCandidate({}))).toBe("openai-completions");
  });
});
