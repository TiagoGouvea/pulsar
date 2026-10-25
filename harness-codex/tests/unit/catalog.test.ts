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
    ];
    config.routing = {
      pools: {
        planner: ["cheap-a"], testAuthor: ["cheap-a"], implementer: ["cheap-a", "cheap-b"], hardImplementer: ["cheap-b"],
        functionalReviewer: ["cheap-b", "review-c"], visualReviewer: ["review-c"], securityReviewer: ["review-c"],
        diagnostic: ["cheap-a"], learningAnalyst: ["review-c"],
      },
      hardTaskPatterns: ["privacidade"],
    };
    const catalog = new ModelCatalog(config);
    const first = catalog.select("implementer", ["text", "tools"], { seed: "same", attempt: 1 });
    const second = catalog.select("implementer", ["text", "tools"], { seed: "same", attempt: 2 });
    expect(second.alias).not.toBe(first.alias);
    expect(catalog.selectReviewer("functionalReviewer", first, "same").family).not.toBe(first.family);
    expect(catalog.isHardTask("Revisar privacidade dos dados")).toBe(true);
  });
});
