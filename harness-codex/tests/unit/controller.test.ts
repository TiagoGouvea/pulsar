import { describe, expect, test } from "vitest";
import {
  consumesTaskAttempt,
  countCurrentReviewFailures,
  effectiveTaskAttemptLimit,
  reviewRequestedChanges,
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
  });

  test("permite aumentar o limite operacional sem reduzir o limite planejado", () => {
    expect(effectiveTaskAttemptLimit(3, 4)).toBe(4);
    expect(effectiveTaskAttemptLimit(4, 3)).toBe(4);
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

  test("reconhece os estados atual e legados de alterações solicitadas", () => {
    expect(reviewRequestedChanges("changes_requested")).toBe(true);
    expect(reviewRequestedChanges("needs_changes")).toBe(true);
    expect(reviewRequestedChanges("revisions_requested")).toBe(true);
    expect(reviewRequestedChanges("failed")).toBe(false);
  });
});
