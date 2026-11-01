import { describe, expect, test } from "vitest";
import type { ModelCandidate } from "../../src/domain/types.js";
import { extractResult, lastAssistantOutput, localApiFor, prepareResponseDiagnostic, supportsPiReasoningEffort } from "../../src/executors/pi.js";

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
  test("preserva resposta não parseável com segredos mascarados e tamanho limitado", () => {
    const secret = "sk-test-secretvalue123456";
    const raw = `[INITIAL RESPONSE] {"apiKey":"${secret}"}`;
    const diagnostic = prepareResponseDiagnostic(raw, undefined, []);

    expect(diagnostic.content).toContain("[INITIAL RESPONSE]");
    expect(diagnostic.content).toContain("[REDACTED]");
    expect(diagnostic.content).not.toContain(secret);
    expect(diagnostic.truncated).toBe(false);

    const large = prepareResponseDiagnostic("x".repeat(70_000), undefined, []);
    expect(large.content).toHaveLength(64_000);
    expect(large.truncated).toBe(true);
    expect(large.originalChars).toBe(70_000);
  });

  test("aceita o id original durante revisão e normaliza para o id canônico", () => {
    expect(extractResult(JSON.stringify(result), "task-001-review", ["task-001-review", "task-001"]).taskId)
      .toBe("task-001-review");
  });

  test("rejeita id que não pertence à tarefa", () => {
    expect(() => extractResult(JSON.stringify({ ...result, taskId: "task-999" }), "task-001"))
      .toThrow(/taskId inesperado/);
  });

  test("normaliza aliases de solicitação de alterações", () => {
    expect(extractResult(JSON.stringify({ ...result, outcome: "needs_changes" }), "task-001").outcome)
      .toBe("changes_requested");
    expect(extractResult(JSON.stringify({ ...result, outcome: "revisions_requested" }), "task-001").outcome)
      .toBe("changes_requested");
  });

  test("rejeita outcome fora do contrato", () => {
    expect(() => extractResult(JSON.stringify({ ...result, outcome: "talvez" }), "task-001"))
      .toThrow(/outcome inesperado/);
  });

  test("rejeita campos extras e tipos incompatíveis com o schema estrito", () => {
    expect(() => extractResult(JSON.stringify({ ...result, extra: true }), "task-001")).toThrow(/contrato estruturado/);
    expect(() => extractResult(JSON.stringify({ ...result, changedFiles: [1] }), "task-001")).toThrow(/changedFiles inválido/);
  });

  test("usa json-llm-repair para corrigir sintaxe e registra a recuperação", () => {
    const diagnostics: Array<{ status: string; reason: string }> = [];
    const malformed = `{taskId: 'task-001', outcome: 'ready_for_verification', summary: 'ok', changedFiles: [], claimedChecks: [], decisions: [], blockers: [], suggestedFollowUps: [],}`;
    const parsed = extractResult(malformed, "task-001", ["task-001"], (diagnostic) => diagnostics.push(diagnostic));

    expect(parsed.summary).toBe("ok");
    expect(diagnostics.map(({ status }) => status)).toEqual(["started", "resolved"]);
    expect(diagnostics[0]?.reason).toMatch(/JSON inválido/);
  });

  test("registra quando json-llm-repair não resolve tipos inválidos do contrato", () => {
    const diagnostics: Array<{ status: string; reason: string; detail?: string }> = [];

    expect(() => extractResult(
      JSON.stringify({ ...result, claimedChecks: [42] }), "task-001", ["task-001"],
      (diagnostic) => diagnostics.push(diagnostic),
    )).toThrow(/json-llm-repair foi executado, mas não resolveu o contrato/);
    expect(diagnostics.map(({ status }) => status)).toEqual(["started", "unresolved"]);
    expect(diagnostics[1]?.detail).toMatch(/claimedChecks inválido/);
  });

  test("registra resposta vazia como caso não reparável", () => {
    const diagnostics: Array<{ status: string; reason: string }> = [];

    expect(() => extractResult("", "task-001", ["task-001"], (diagnostic) => diagnostics.push(diagnostic)))
      .toThrow(/não pôde ser executado sem conteúdo/);
    expect(diagnostics).toEqual([expect.objectContaining({ status: "skipped", responseChars: 0 })]);
  });
});

describe("protocolo local do Pi", () => {
  test("usa Responses para GPT-OSS e Chat Completions para os demais", () => {
    expect(localApiFor(localCandidate({ modelId: "mlx-community/gpt-oss-20b", family: "gpt-oss" })))
      .toBe("openai-responses");
    expect(localApiFor(localCandidate({}))).toBe("openai-completions");
  });

  test("não anuncia reasoning effort ao Pi para Qwen 3.5 do LM Studio", () => {
    expect(supportsPiReasoningEffort(localCandidate({ capabilities: ["text", "tools", "reasoning"] }))).toBe(false);
    expect(supportsPiReasoningEffort(localCandidate({
      provider: "openrouter", modality: "metered_api", capabilities: ["text", "reasoning"],
    }))).toBe(true);
    expect(supportsPiReasoningEffort(localCandidate({
      family: "gpt-oss", modelId: "mlx-community/gpt-oss-20b", capabilities: ["text", "reasoning"],
    }))).toBe(true);
  });

  test("só usa raciocínio quando ele é um objeto JSON completo", () => {
    const messages = [{
      role: "assistant",
      content: [{ type: "thinking", thinking: JSON.stringify(result) }],
    }];
    expect(lastAssistantOutput(messages)).toBe(JSON.stringify(result));
    expect(lastAssistantOutput([{ role: "assistant", content: [{ type: "thinking", thinking: "We need analyze carefully" }] }])).toBeUndefined();
    expect(lastAssistantOutput(messages, "resposta normal")).toBe("resposta normal");
  });
});
