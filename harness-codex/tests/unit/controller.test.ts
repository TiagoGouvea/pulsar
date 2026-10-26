import { describe, expect, test } from "vitest";
import { consumesTaskAttempt, countCurrentReviewFailures } from "../../src/orchestrator/controller.js";

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
});
