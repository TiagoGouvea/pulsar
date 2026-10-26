import { describe, expect, test } from "vitest";
import { summarizeModelPerformance } from "../../src/reports/generator.js";

describe("desempenho por modelo", () => {
  test("separa sucesso técnico, revisão com alterações e timeout", () => {
    const base = {
      alias: "reviewer",
      provider: "openrouter",
      model_id: "vendor/model",
      role: "functionalReviewer",
      reported_micros: 10,
      uncertain_micros: null,
    };
    const [performance] = summarizeModelPerformance([
      {
        ...base,
        result_json: JSON.stringify({ outcome: "changes_requested", blockers: ["corrigir teste"] }),
      },
      {
        ...base,
        reported_micros: null,
        uncertain_micros: 5,
        result_json: JSON.stringify({ outcome: "failed", blockers: ["pi_execution_failed"] }),
      },
    ]);

    expect(performance).toMatchObject({
      calls: 2,
      technicalSuccesses: 1,
      technicalFailures: 1,
      changesRequested: 1,
      technicalSuccessRatePercent: 50,
      confirmedMicros: "10",
      uncertainMicros: "5",
    });
  });
});
