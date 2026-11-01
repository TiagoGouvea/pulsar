import { describe, expect, test } from "vitest";
import type { ExecutionResult, ModelCandidate } from "../../src/domain/types.js";
import {
  consumesTaskAttempt,
  attemptedModelAliases,
  canAuthorizeExtraReviewRetry,
  countCurrentReviewFailures,
  currentReviewFailureAttempts,
  effectiveTaskAttemptLimit,
  executionFailureSignature,
  hasOnlyTechnicalFailures,
  reviewRequestedChanges,
  shouldUseHardImplementerPool,
} from "../../src/orchestrator/controller.js";

describe("limite de tentativas da tarefa", () => {
  test("não consome uma tentativa quando a falha pertence ao executor", () => {
    const technicalFailure = {
      status: "failed",
      result_json: JSON.stringify({ outcome: "failed", blockers: ["pi_execution_failed"] }),
    };
    const requestedRevision = {
      status: "ready_for_verification",
      result_json: JSON.stringify({ outcome: "ready_for_verification", blockers: [] }),
    };

    expect(consumesTaskAttempt(technicalFailure)).toBe(false);
    expect(consumesTaskAttempt(requestedRevision)).toBe(true);
    expect(consumesTaskAttempt({ status: "failed", result_json: "inválido" })).toBe(true);
    expect(hasOnlyTechnicalFailures([technicalFailure, { ...technicalFailure }])).toBe(true);
    expect(hasOnlyTechnicalFailures([technicalFailure, requestedRevision])).toBe(false);
    expect(hasOnlyTechnicalFailures([])).toBe(false);
  });

  test("permite aumentar o limite operacional sem reduzir o limite planejado", () => {
    expect(effectiveTaskAttemptLimit(3, 4)).toBe(4);
    expect(effectiveTaskAttemptLimit(4, 3)).toBe(4);
  });

  test("escalona tarefas críticas após duas tentativas, inclusive falhas técnicas", () => {
    expect(shouldUseHardImplementerPool(true, 0)).toBe(false);
    expect(shouldUseHardImplementerPool(true, 1)).toBe(false);
    expect(shouldUseHardImplementerPool(true, 2)).toBe(true);
    expect(shouldUseHardImplementerPool(false, 5)).toBe(false);
  });

  test("conta falhas iguais por modelo para permitir failover entre modelos", () => {
    const result: ExecutionResult = {
      taskId: "task-004", outcome: "failed", summary: "Falha técnica", changedFiles: [], claimedChecks: [],
      decisions: [], blockers: ["pi_execution_failed"], suggestedFollowUps: [],
    };
    expect(executionFailureSignature("local-coder", result)).not.toBe(executionFailureSignature("sol-top", result));
    expect(executionFailureSignature("local-coder", result)).toBe(executionFailureSignature("local-coder", result));
    expect(executionFailureSignature("sol-top", { ...result, outcome: "ready_for_verification" })).toBeNull();
  });

  test("não repete um modelo cuja carga falhou por falta de recursos", () => {
    const candidate: ModelCandidate = {
      alias: "local-coder", executor: "pi", provider: "lmstudio", modelId: "qwen3-coder", family: "qwen3-coder",
      modality: "local", capabilities: ["text", "tools"], roles: ["implementer"], enabled: true,
      contextTokens: 8192, maxOutputTokens: 2048,
    };
    expect(attemptedModelAliases([{
      candidate_key: "pi:lmstudio:qwen3-coder:current",
      result_json: JSON.stringify({ outcome: "failed", diagnostics: { phase: "model_load" } }),
    }], [candidate])).toEqual(["local-coder"]);
  });
});

describe("rodada de revisão", () => {
  const technicalFailure = {
    result_json: JSON.stringify({ outcome: "failed", blockers: ["pi_execution_failed"] }),
  };
  const validReview = {
    result_json: JSON.stringify({ outcome: "changes_requested", blockers: ["ajuste necessário"] }),
  };

  test("descarta falhas técnicas anteriores a uma revisão válida", () => {
    expect(countCurrentReviewFailures([
      technicalFailure, technicalFailure, validReview, technicalFailure,
    ])).toBe(1);
  });

  test("mantém a contagem quando ainda não houve revisão válida", () => {
    expect(countCurrentReviewFailures([technicalFailure, technicalFailure])).toBe(2);
  });

  test("retorna apenas modelos da sequência consecutiva de falhas técnicas", () => {
    const earlierFailure = { candidate_key: "old", ...technicalFailure };
    const valid = { candidate_key: "reviewed", result_json: validReview.result_json };
    const currentFailure = { candidate_key: "next", ...technicalFailure };
    expect(currentReviewFailureAttempts([earlierFailure, valid, currentFailure])).toEqual([currentFailure]);
  });

  test("mapeia aliases já gravados nas tentativas de revisão", () => {
    const aliases = attemptedModelAliases([
      { candidate_key: "review-alias", result_json: technicalFailure.result_json },
    ], [{ alias: "review-alias" } as ModelCandidate]);
    expect(aliases).toEqual(["review-alias"]);
  });

  test("autoriza tentativa extra somente após esgotar revisão independente da tarefa indicada", () => {
    const eligible = {
      blockedCause: "independent_review_execution_failed",
      blockedTaskId: "task-004",
      taskId: "task-004",
      taskState: "verifying",
      priorFailures: 9,
      maxAttempts: 9,
    };
    expect(canAuthorizeExtraReviewRetry(eligible)).toBe(true);
    expect(canAuthorizeExtraReviewRetry({ ...eligible, priorFailures: 8 })).toBe(false);
    expect(canAuthorizeExtraReviewRetry({ ...eligible, taskState: "blocked" })).toBe(false);
    expect(canAuthorizeExtraReviewRetry({ ...eligible, blockedTaskId: "task-003" })).toBe(false);
  });

  test("reconhece os estados atual e legados de alterações solicitadas", () => {
    expect(reviewRequestedChanges("changes_requested")).toBe(true);
    expect(reviewRequestedChanges("needs_changes")).toBe(true);
    expect(reviewRequestedChanges("revisions_requested")).toBe(true);
    expect(reviewRequestedChanges("failed")).toBe(false);
  });
});
