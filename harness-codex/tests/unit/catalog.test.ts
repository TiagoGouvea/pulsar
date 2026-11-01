import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { ModelCatalog } from "../../src/providers/catalog.js";
import { createTestConfig } from "../helpers/config.js";

describe("roteamento de modelos", () => {
  test("usa pools e preserva família diferente na revisão", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness-catalog-"));
    const config = await createTestConfig(root, { executor: "pi" });
    config.models = [
      { alias: "cheap-a", executor: "pi", provider: "p", modelId: "a", family: "family-a", modality: "local", capabilities: ["text", "tools"], roles: ["implementer"], enabled: true, contextTokens: 8192, maxOutputTokens: 1024 },
      { alias: "cheap-b", executor: "pi", provider: "p", modelId: "b", family: "family-b", modality: "local", capabilities: ["text", "tools"], roles: ["implementer", "functionalReviewer"], enabled: true, contextTokens: 8192, maxOutputTokens: 1024 },
      { alias: "review-c", executor: "pi", provider: "p", modelId: "c", family: "family-c", modality: "local", capabilities: ["text", "tools"], roles: ["functionalReviewer"], enabled: true, contextTokens: 8192, maxOutputTokens: 1024 },
      { alias: "diagnostic-d", executor: "pi", provider: "p", modelId: "d", family: "family-d", modality: "local", capabilities: ["text", "tools"], roles: ["diagnostic"], enabled: true, contextTokens: 8192, maxOutputTokens: 1024 },
    ];
    config.routing = {
      pools: {
        planner: ["cheap-a"], testAuthor: ["cheap-a"], implementer: ["cheap-a", "cheap-b"], hardImplementer: ["cheap-b"],
        functionalReviewer: ["cheap-b", "review-c"], visualReviewer: ["review-c"], securityReviewer: ["review-c"],
        diagnostic: ["diagnostic-d", "cheap-a"], learningAnalyst: ["review-c"],
      },
      hardTaskPatterns: ["privacidade"],
    };
    const catalog = new ModelCatalog(config);
    const first = catalog.select("implementer", ["text", "tools"], { seed: "same", attempt: 1 });
    const second = catalog.select("implementer", ["text", "tools"], { seed: "different", attempt: 8 });
    const fallback = catalog.select("implementer", ["text", "tools"], { excludeAliases: ["cheap-a"] });
    const hard = catalog.select("implementer", ["text", "tools"], { hard: true });
    expect(first.alias).toBe("cheap-a");
    expect(second.alias).toBe("cheap-a");
    expect(fallback.alias).toBe("cheap-b");
    expect(hard.alias).toBe("cheap-b");
    const firstReviewer = catalog.selectReviewer("functionalReviewer", first, "same", 1);
    const secondReviewer = catalog.selectReviewer("functionalReviewer", first, "same", 2);
    const emergencyReviewer = catalog.selectReviewer("functionalReviewer", first, "same", 3);
    const nextUnusedReviewer = catalog.selectReviewer("functionalReviewer", first, "same", 1, [firstReviewer.alias, secondReviewer.alias]);
    expect(firstReviewer.family).not.toBe(first.family);
    expect(secondReviewer.alias).not.toBe(firstReviewer.alias);
    expect(emergencyReviewer.alias).toBe("diagnostic-d");
    expect(nextUnusedReviewer.alias).toBe("diagnostic-d");
    expect(() => catalog.selectReviewer("functionalReviewer", first, "same", 1, [firstReviewer.alias, secondReviewer.alias, emergencyReviewer.alias])).toThrow("Pool de revisão esgotado");
    expect(catalog.isHardTask("Revisar privacidade dos dados")).toBe(true);
  });
});
