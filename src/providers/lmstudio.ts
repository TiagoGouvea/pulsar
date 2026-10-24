import type { HarnessConfig } from "../config/schema.js";
import type { ModelCandidate } from "../domain/types.js";
import { runProcess, type ProcessResult } from "../utils/process.js";

export type ProcessRunner = typeof runProcess;

function assertLocal(candidate: ModelCandidate): void {
  if (candidate.modality !== "local") throw new Error(`${candidate.alias} não é um candidato local.`);
}

function assertSuccess(action: string, result: ProcessResult): void {
  if (result.exitCode !== 0) throw new Error(`${action}: ${result.stderr || result.stdout || `exit ${String(result.exitCode)}`}`);
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export async function loadLmStudioModel(
  config: HarnessConfig,
  candidate: ModelCandidate,
  runner: ProcessRunner = runProcess,
): Promise<ProcessResult[]> {
  assertLocal(candidate);
  const unload = await runner(["lms", "unload", "--all"], { cwd: config.configDirectory, timeoutMs: 60_000 });
  assertSuccess("Falha ao descarregar modelos antes do carregamento", unload);
  const load = await runner([
    "lms", "load", candidate.modelId,
    "--identifier", candidate.modelId,
    "--context-length", String(Math.min(candidate.contextTokens, config.localInference.initialContextTokens)),
  ], { cwd: config.configDirectory, timeoutMs: 15 * 60_000 });
  assertSuccess(`Falha ao carregar ${candidate.alias}`, load);
  return [unload, load];
}

export async function unloadLmStudioModels(
  config: HarnessConfig,
  runner: ProcessRunner = runProcess,
): Promise<ProcessResult> {
  return runner(["lms", "unload", "--all"], { cwd: config.configDirectory, timeoutMs: 60_000 });
}

export async function withLmStudioModel<T>(
  config: HarnessConfig,
  candidate: ModelCandidate,
  work: () => Promise<T>,
  runner: ProcessRunner = runProcess,
): Promise<T> {
  let result: T | undefined;
  let primaryError: unknown;
  try {
    await loadLmStudioModel(config, candidate, runner);
    result = await work();
  } catch (error) {
    primaryError = error;
  }

  let cleanupError: unknown;
  try {
    const unload = await unloadLmStudioModels(config, runner);
    assertSuccess("Falha ao descarregar modelos após o uso", unload);
  } catch (error) {
    cleanupError = error;
  }

  if (primaryError && cleanupError) {
    throw new AggregateError([primaryError, cleanupError], "A inferência local e a limpeza do LM Studio falharam.");
  }
  if (primaryError) throw asError(primaryError);
  if (cleanupError) throw asError(cleanupError);
  return result as T;
}
