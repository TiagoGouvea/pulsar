import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { ModelCandidate } from "../../src/domain/types.js";
import { localApiEndpoint, loadLmStudioModel, unloadLmStudioModels, withLmStudioModel } from "../../src/providers/lmstudio.js";
import { createTestConfig } from "../helpers/config.js";

const candidate: ModelCandidate = {
  alias: "local-coder",
  executor: "pi",
  provider: "lmstudio",
  modelId: "qwen3-coder-30b-a3b-instruct",
  endpoint: "http://localhost:1235/v1",
  family: "qwen3-coder",
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

describe("ciclo de vida via API do LM Studio/Bionic", () => {
  test("deriva os endpoints nativos sem perder prefixos de caminho", () => {
    expect(localApiEndpoint("http://localhost:1235/v1", "models/load").href)
      .toBe("http://localhost:1235/api/v1/models/load");
    expect(localApiEndpoint("http://localhost:1235/proxy/v1/", "models").href)
      .toBe("http://localhost:1235/proxy/api/v1/models");
  });

  test("descarrega instâncias existentes, carrega um modelo e descarrega ao final", async () => {
    const config = await createTestConfig(await mkdtemp(path.join(os.tmpdir(), "harness-lmstudio-api-test-")));
    const requests: Array<{ url: string; body?: string }> = [];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = requestUrl(input);
      requests.push({ url, ...(typeof init?.body === "string" ? { body: init.body } : {}) });
      if (url.endsWith("/models") && requests.length === 1) {
        return Promise.resolve(new Response(JSON.stringify({ models: [{ key: "phonon", loaded_instances: [{ id: "phonon-instance" }] }] }), { status: 200 }));
      }
      if (url.endsWith("/models") && requests.length === 4) {
        return Promise.resolve(new Response(JSON.stringify({ models: [{ key: candidate.modelId, loaded_instances: [{ id: "coder-instance" }] }] }), { status: 200 }));
      }
      if (url.endsWith("/models/unload")) return Promise.resolve(new Response(JSON.stringify({ instance_id: "unloaded" }), { status: 200 }));
      if (url.endsWith("/models/load")) return Promise.resolve(new Response(JSON.stringify({ instance_id: "coder-instance", status: "loaded" }), { status: 200 }));
      throw new Error(`Unexpected request: ${url} (${requests.length})`);
    });

    const actions = await withLmStudioModel(config, candidate, () => Promise.resolve("ok"));

    expect(actions).toBe("ok");
    expect(requests.map((request) => request.url.split("/").at(-1))).toEqual([
      "models", "unload", "load", "models", "unload",
    ]);
    expect(JSON.parse(requests[2]?.body ?? "{}")).toMatchObject({ model: candidate.modelId, context_length: 8192 });
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  test("tenta descarregar no final quando a inferência falha", async () => {
    const config = await createTestConfig(await mkdtemp(path.join(os.tmpdir(), "harness-lmstudio-api-failure-")));
    const requests: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = requestUrl(input);
      requests.push(url);
      if (url.endsWith("/models")) {
        return Promise.resolve(new Response(JSON.stringify({ models: [{ key: candidate.modelId, loaded_instances: [] }] }), { status: 200 }));
      }
      if (url.endsWith("/models/load")) return Promise.resolve(new Response(JSON.stringify({ instance_id: "coder" }), { status: 200 }));
      throw new Error("inference failed");
    });

    await expect(withLmStudioModel(config, candidate, () => Promise.reject(new Error("inference failed"))))
      .rejects.toThrow("inference failed");
    expect(requests.at(-1)).toContain("/api/v1/models");
  });

  test("descarrega mesmo quando a API de load falha", async () => {
    const config = await createTestConfig(await mkdtemp(path.join(os.tmpdir(), "harness-lmstudio-load-failure-")));
    const requests: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = requestUrl(input);
      requests.push(url);
      if (url.endsWith("/models")) return Promise.resolve(new Response(JSON.stringify({ models: [] }), { status: 200 }));
      if (url.endsWith("/models/load")) return Promise.resolve(new Response("load failed", { status: 500 }));
      throw new Error(`Unexpected request: ${url}`);
    });

    await expect(loadLmStudioModel(config, candidate)).rejects.toThrow("HTTP 500");
    await expect(unloadLmStudioModels(config)).resolves.toEqual([]);
    expect(requests.filter((url) => url.endsWith("/models"))).toHaveLength(2);
  });
});
