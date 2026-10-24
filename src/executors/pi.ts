import {
  createAgentSession,
  ModelRuntime,
  SessionManager,
} from "@earendil-works/pi-coding-agent";
import type { ExecutionRequest, ExecutionResult, ModelCandidate } from "../domain/types.js";
import { safeError } from "../utils/core.js";
import type { Executor } from "./types.js";

const resultKeys = ["taskId", "outcome", "summary", "changedFiles", "claimedChecks", "decisions", "blockers", "suggestedFollowUps"];

function extractResult(text: string | undefined, taskId: string): ExecutionResult {
  if (!text) throw new Error("A sessão Pi terminou sem resposta textual.");
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)?.[1];
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  const raw = fenced ?? (first >= 0 && last > first ? text.slice(first, last + 1) : text);
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if (!resultKeys.every((key) => key in parsed) || parsed.taskId !== taskId) {
    throw new Error("Resultado do Pi não atende ao contrato estruturado da tarefa.");
  }
  return parsed as unknown as ExecutionResult;
}

async function createRuntime(candidate: ModelCandidate): Promise<{ runtime: ModelRuntime; model: NonNullable<ReturnType<ModelRuntime["getModel"]>> }> {
  const runtime = await ModelRuntime.create({ allowModelNetwork: false });
  if (candidate.modality === "local") {
    const endpoint = candidate.endpoint ?? "http://127.0.0.1:1234/v1";
    runtime.registerProvider(candidate.provider, {
      name: candidate.provider,
      baseUrl: endpoint.endsWith("/v1") ? endpoint : `${endpoint.replace(/\/$/, "")}/v1`,
      api: "openai-completions",
      apiKey: "lm-studio",
      models: [{
        id: candidate.modelId,
        name: candidate.alias,
        input: candidate.capabilities.includes("vision") ? ["text", "image"] : ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        reasoning: candidate.capabilities.includes("reasoning"),
        contextWindow: candidate.contextTokens,
        maxTokens: candidate.maxOutputTokens,
      }],
    });
  }
  if (candidate.credentialEnv) {
    const credential = process.env[candidate.credentialEnv];
    if (!credential) throw new Error(`Credencial ausente: ${candidate.credentialEnv}`);
    await runtime.setRuntimeApiKey(candidate.provider, credential);
  }
  const model = runtime.getModel(candidate.provider, candidate.modelId);
  if (!model) throw new Error(`Pi não encontrou ${candidate.provider}/${candidate.modelId}.`);
  return { runtime, model };
}

export class PiExecutor implements Executor {
  readonly name = "pi";
  private abortCurrent: (() => Promise<void>) | undefined;

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const { runtime, model } = await createRuntime(request.candidate);
    const { session } = await createAgentSession({
      cwd: request.workspace,
      modelRuntime: runtime,
      model,
      sessionManager: SessionManager.inMemory(),
      tools: request.readOnly ? ["read", "grep", "find", "ls"] : ["read", "bash", "edit", "write", "grep", "find", "ls"],
    });
    this.abortCurrent = () => session.abort();
    const timeout = setTimeout(() => { void session.abort(); }, request.timeoutMs);
    try {
      await session.prompt(request.prompt);
      const result = extractResult(session.getLastAssistantText(), request.task.id);
      const stats = session.getSessionStats();
      result.usage = {
        inputTokens: stats.tokens.input,
        outputTokens: stats.tokens.output,
        cachedTokens: stats.tokens.cacheRead,
        costUsd: String(stats.cost),
      };
      return result;
    } catch (error) {
      return {
        taskId: request.task.id, outcome: "failed", summary: safeError(error), changedFiles: [],
        claimedChecks: [], decisions: [], blockers: ["pi_execution_failed"], suggestedFollowUps: [],
      };
    } finally {
      clearTimeout(timeout);
      this.abortCurrent = undefined;
      session.dispose();
    }
  }

  async cancel(): Promise<void> { await this.abortCurrent?.(); }
}
