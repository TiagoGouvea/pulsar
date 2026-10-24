import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { ModelCandidate } from "../../src/domain/types.js";
import { openAiEndpoint, probeCandidate } from "../../src/providers/probes.js";
import { createTestConfig } from "../helpers/config.js";

const candidate: ModelCandidate = {
  alias: "local-test",
  executor: "pi",
  provider: "lmstudio",
  modelId: "model-test",
  endpoint: "http://localhost:1235/v1",
  family: "test",
  modality: "local",
  capabilities: ["text", "tools", "reasoning"],
  roles: ["implementer"],
  enabled: true,
  contextTokens: 8192,
  maxOutputTokens: 2048,
};

afterEach(() => vi.restoreAllMocks());

describe("probes de provedores", () => {
  test("normaliza endpoints OpenAI com ou sem /v1", () => {
    expect(openAiEndpoint("http://localhost:1235/v1", "models").href).toBe("http://localhost:1235/v1/models");
    expect(openAiEndpoint("http://localhost:1235/", "chat/completions").href).toBe("http://localhost:1235/v1/chat/completions");
  });

  test("valida disponibilidade, texto e function calling locais", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness providers "));
    const config = await createTestConfig(root);
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: candidate.modelId }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "oi" } }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { tool_calls: [{ function: { name: "report_value", arguments: "{\"value\":7}" } }] } }],
      }), { status: 200 }));

    const checks = await probeCandidate(config, candidate, { inference: true });

    expect(checks.map((check) => [check.id, check.status])).toEqual([
      ["model.local-test.availability", "pass"],
      ["model.local-test.text", "pass"],
      ["model.local-test.tools", "pass"],
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
