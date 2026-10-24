import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test, vi } from "vitest";
import type { ModelCandidate } from "../../src/domain/types.js";
import { withLmStudioModel } from "../../src/providers/lmstudio.js";
import type { ProcessResult } from "../../src/utils/process.js";
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

function processResult(command: string[], exitCode = 0): ProcessResult {
  return { command, exitCode, signal: null, stdout: "", stderr: "", durationMs: 1, timedOut: false };
}

describe("ciclo de vida do LM Studio", () => {
  test("descarrega, carrega somente o candidato e descarrega após o sucesso", async () => {
    const config = await createTestConfig(await mkdtemp(path.join(os.tmpdir(), "harness lmstudio ")));
    const steps: string[] = [];
    const runner = (command: string[]): Promise<ProcessResult> => {
      steps.push(command.join(" "));
      return Promise.resolve(processResult(command));
    };

    const result = await withLmStudioModel(config, candidate, () => {
      steps.push("inference");
      return Promise.resolve("ok");
    }, runner);

    expect(result).toBe("ok");
    expect(steps).toEqual([
      "lms unload --all",
      "lms load qwen3-coder-30b-a3b-instruct --identifier qwen3-coder-30b-a3b-instruct --context-length 8192",
      "inference",
      "lms unload --all",
    ]);
  });

  test("descarrega no final quando a inferência falha", async () => {
    const config = await createTestConfig(await mkdtemp(path.join(os.tmpdir(), "harness lmstudio fail ")));
    const commands: string[] = [];
    const runner = (command: string[]): Promise<ProcessResult> => {
      commands.push(command.join(" "));
      return Promise.resolve(processResult(command));
    };

    await expect(withLmStudioModel(
      config,
      candidate,
      () => Promise.reject(new Error("inference failed")),
      runner,
    )).rejects.toThrow("inference failed");

    expect(commands.at(-1)).toBe("lms unload --all");
    expect(commands.filter((command) => command === "lms unload --all")).toHaveLength(2);
  });

  test("tenta a limpeza mesmo quando o carregamento falha", async () => {
    const config = await createTestConfig(await mkdtemp(path.join(os.tmpdir(), "harness lmstudio load fail ")));
    let invocation = 0;
    const runner = vi.fn((command: string[]): Promise<ProcessResult> => {
      invocation += 1;
      return Promise.resolve(processResult(command, invocation === 2 ? 1 : 0));
    });

    await expect(withLmStudioModel(config, candidate, () => Promise.resolve("unused"), runner)).rejects.toThrow("Falha ao carregar");

    expect(runner).toHaveBeenCalledTimes(3);
    expect(runner.mock.calls[2]?.[0]).toEqual(["lms", "unload", "--all"]);
  });
});
