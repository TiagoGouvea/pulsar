import type { HarnessConfig } from "../config/schema.js";
import type { ModelCandidate } from "../domain/types.js";
import { runProcess, type ProcessResult } from "../utils/process.js";

function assertLocal(candidate: ModelCandidate): void {
  if (candidate.modality !== "local") throw new Error(`${candidate.alias} não é um candidato local.`);
}

export async function loadLmStudioModel(config: HarnessConfig, candidate: ModelCandidate): Promise<ProcessResult[]> {
  assertLocal(candidate);
  const unload = await runProcess(["lms", "unload", "--all"], { cwd: config.configDirectory, timeoutMs: 60_000 });
  if (unload.exitCode !== 0) throw new Error(`Falha ao descarregar modelos: ${unload.stderr || unload.stdout}`);
  const load = await runProcess([
    "lms", "load", candidate.modelId,
    "--identifier", candidate.modelId,
    "--context-length", String(Math.min(candidate.contextTokens, config.localInference.initialContextTokens)),
  ], { cwd: config.configDirectory, timeoutMs: 15 * 60_000 });
  if (load.exitCode !== 0) throw new Error(`Falha ao carregar ${candidate.alias}: ${load.stderr || load.stdout}`);
  return [unload, load];
}

export async function unloadLmStudioModels(config: HarnessConfig): Promise<ProcessResult> {
  return runProcess(["lms", "unload", "--all"], { cwd: config.configDirectory, timeoutMs: 60_000 });
}
