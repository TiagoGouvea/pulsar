import { describe, expect, test } from "vitest";
import { shouldMarkProviderCostUncertain } from "../../src/budget/call-accounting.js";

describe("incerteza de custo de chamadas", () => {
  test("não cobra como incerta falhas antes de fazer uma chamada ao provedor", () => {
    for (const phase of ["runtime_setup", "session_setup"]) {
      expect(shouldMarkProviderCostUncertain({
        modality: "metered_api", outcome: "failed", hasUsage: false, phase,
      })).toBe(false);
    }
  });

  test("preserva incerteza se uma chamada paga falhar sem métricas", () => {
    expect(shouldMarkProviderCostUncertain({
      modality: "metered_api", outcome: "failed", hasUsage: false, phase: "provider_request",
    })).toBe(true);
  });

  test("usa as métricas observadas de uma execução incompleta", () => {
    expect(shouldMarkProviderCostUncertain({
      modality: "metered_api", outcome: "failed", hasUsage: true, partialUsage: true, phase: "timeout",
    })).toBe(true);
    expect(shouldMarkProviderCostUncertain({
      modality: "metered_api", outcome: "failed", hasUsage: true, phase: "timeout",
    })).toBe(false);
  });
});
