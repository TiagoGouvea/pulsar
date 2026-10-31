import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { ModelCandidate } from "../../src/domain/types.js";
import { testLocalModels, testStructuredLocalModels, writeLocalModelTestReport } from "../../src/providers/local-model-test.js";
import { localApiEndpoint } from "../../src/providers/lmstudio.js";
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

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
}

describe("probes de provedores", () => {
  test("normaliza endpoints OpenAI e nativos", () => {
    expect(openAiEndpoint("http://localhost:1235/v1", "models").href).toBe("http://localhost:1235/v1/models");
    expect(openAiEndpoint("http://localhost:1235/", "chat/completions").href).toBe("http://localhost:1235/v1/chat/completions");
    expect(localApiEndpoint("http://localhost:1235/v1", "models").href).toBe("http://localhost:1235/api/v1/models");
  });

  test("valida disponibilidade, texto e function calling locais pela API", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness providers "));
    const config = await createTestConfig(root);
    let instanceLoaded = false;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = requestUrl(input);
      if (url.endsWith("/api/v1/models")) return Promise.resolve(new Response(JSON.stringify({ models: [{ key: candidate.modelId, loaded_instances: instanceLoaded ? [{ id: "test-instance" }] : [] }] }), { status: 200 }));
      if (url.endsWith("/v1/models")) return Promise.resolve(new Response(JSON.stringify({ data: [{ id: candidate.modelId }] }), { status: 200 }));
      if (url.endsWith("/api/v1/models/load")) {
        instanceLoaded = true;
        return Promise.resolve(new Response(JSON.stringify({ instance_id: "test-instance" }), { status: 200 }));
      }
      if (url.endsWith("/api/v1/models/unload")) {
        instanceLoaded = false;
        return Promise.resolve(new Response(JSON.stringify({ instance_id: "test-instance" }), { status: 200 }));
      }
      if (url.endsWith("/v1/chat/completions")) {
        const body = typeof init?.body === "string" ? init.body : "";
        if (body.includes("report_value")) {
          return Promise.resolve(new Response(JSON.stringify({
            choices: [{ message: { tool_calls: [{ function: { name: "report_value", arguments: "{\"value\":7}" } }] } }],
          }), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: "oi" } }] }), { status: 200 }));
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const checks = await probeCandidate(config, candidate, { inference: true });

    expect(checks.map((check) => [check.id, check.status])).toEqual([
      ["model.local-test.availability", "pass"],
      ["model.local-test.text", "pass"],
      ["model.local-test.tools", "pass"],
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  test("mede carga e resposta, descarrega e grava relatório local", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness local benchmark "));
    const config = await createTestConfig(root);
    let instanceLoaded = false;
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = requestUrl(input);
      if (url.endsWith("/api/v1/models")) {
        return Promise.resolve(new Response(JSON.stringify({ models: [{ key: candidate.modelId, loaded_instances: instanceLoaded ? [{ id: "test-instance" }] : [] }] }), { status: 200 }));
      }
      if (url.endsWith("/api/v1/models/load")) {
        instanceLoaded = true;
        return Promise.resolve(new Response(JSON.stringify({ instance_id: "test-instance", status: "loaded" }), { status: 200 }));
      }
      if (url.endsWith("/api/v1/models/unload")) {
        instanceLoaded = false;
        return Promise.resolve(new Response(JSON.stringify({ instance_id: "test-instance" }), { status: 200 }));
      }
      if (url.endsWith("/v1/chat/completions")) {
        return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: [{ type: "text", text: "oi" }] } }], usage: { prompt_tokens: 5, completion_tokens: 1 }, stats: { generation_time: 0.25 } }), { status: 200 }));
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    const results = await testLocalModels(config, [candidate]);
    const reportPath = await writeLocalModelTestReport(config, results);

    const result = results[0];
    expect(result?.status).toBe("passed");
    expect(result?.response).toBe("oi");
    expect(typeof result?.loadDurationMs).toBe("number");
    expect(typeof result?.responseDurationMs).toBe("number");
    expect(result?.generationDurationMs).toBe(250);
    expect(instanceLoaded).toBe(false);
    expect(reportPath).toContain("local-model-tests");
  });

  test("compara variantes de JSON Schema estrito", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness structured output "));
    const config = await createTestConfig(root);
    let instanceLoaded = false;
    const result = {
      taskId: "json-smoke", outcome: "ready_for_verification", summary: "ok",
      changedFiles: [], claimedChecks: [], decisions: [], blockers: [], suggestedFollowUps: [],
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = requestUrl(input);
      if (url.endsWith("/api/v1/models")) return Promise.resolve(new Response(JSON.stringify({ models: [{ key: candidate.modelId, loaded_instances: instanceLoaded ? [{ id: "test-instance" }] : [] }] }), { status: 200 }));
      if (url.endsWith("/api/v1/models/load")) {
        instanceLoaded = true;
        return Promise.resolve(new Response(JSON.stringify({ instance_id: "test-instance" }), { status: 200 }));
      }
      if (url.endsWith("/api/v1/models/unload")) {
        instanceLoaded = false;
        return Promise.resolve(new Response(JSON.stringify({ instance_id: "test-instance" }), { status: 200 }));
      }
      if (url.endsWith("/v1/chat/completions")) return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(result) } }] }), { status: 200 }));
      throw new Error(`Unexpected request: ${url} (${String(init?.method)})`);
    });

    const { results, lifecycle } = await testStructuredLocalModels(config, [candidate]);

    expect(results.map((item) => [item.variant, item.status, item.outputChannel])).toEqual([
      ["chat-json-schema", "passed", "content"], ["chat-json-schema-no-thinking", "passed", "content"],
    ]);
    expect(fetchMock.mock.calls.filter(([input]) => requestUrl(input).endsWith("/v1/chat/completions"))).toHaveLength(2);
    expect(lifecycle.map((item) => item.phase)).toEqual(["before_unload", "unloaded", "loading", "loaded", "before_unload", "unloaded"]);
    const schemaCall = fetchMock.mock.calls.find(([input, init]) => requestUrl(input).endsWith("/v1/chat/completions") && typeof init?.body === "string" && init.body.includes("json_schema"));
    expect(JSON.parse(String(schemaCall?.[1]?.body))).toMatchObject({ response_format: { type: "json_schema", json_schema: { strict: true } } });
  });

  test("aceita apenas JSON válido no canal de raciocínio e não registra raciocínio livre", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness structured reasoning "));
    const config = await createTestConfig(root);
    let instanceLoaded = false;
    const validJson = JSON.stringify({ taskId: "json-smoke", outcome: "ready_for_verification", summary: "ok", changedFiles: [], claimedChecks: [], decisions: [], blockers: [], suggestedFollowUps: [] });
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = requestUrl(input);
      if (url.endsWith("/api/v1/models")) return Promise.resolve(new Response(JSON.stringify({ models: [{ key: candidate.modelId, loaded_instances: instanceLoaded ? [{ id: "test-instance" }] : [] }] }), { status: 200 }));
      if (url.endsWith("/api/v1/models/load")) { instanceLoaded = true; return Promise.resolve(new Response(JSON.stringify({ instance_id: "test-instance" }), { status: 200 })); }
      if (url.endsWith("/api/v1/models/unload")) { instanceLoaded = false; return Promise.resolve(new Response(JSON.stringify({ instance_id: "test-instance" }), { status: 200 })); }
      if (url.endsWith("/v1/chat/completions")) return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: "", reasoning_content: validJson } }] }), { status: 200 }));
      throw new Error(`Unexpected request: ${url} (${String(init?.method)})`);
    });
    const { results } = await testStructuredLocalModels(config, [candidate]);
    expect(results.map((item) => [item.status, item.outputChannel])).toEqual([
      ["passed_reasoning_channel", "reasoning_content"], ["passed_reasoning_channel", "reasoning_content"],
    ]);
    expect(results.every((item) => item.response === validJson)).toBe(true);
  });
});
