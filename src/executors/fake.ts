import type { ExecutionRequest, ExecutionResult } from "../domain/types.js";
import type { Executor } from "./types.js";

export class FakeExecutor implements Executor {
  readonly name = "fake";

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    await Promise.resolve();
    if (request.task.description.includes("[inject:blocked]")) {
      return {
        taskId: request.task.id,
        outcome: "blocked",
        summary: "Falha determinística injetada pela fixture.",
        changedFiles: [], claimedChecks: [], decisions: [],
        blockers: ["fixture_injected_block"], suggestedFollowUps: ["Remover a injeção e retomar."],
      };
    }
    return {
      taskId: request.task.id,
      outcome: "ready_for_verification",
      summary: "Execução fake concluída; nenhuma afirmação substitui os verificadores.",
      changedFiles: [], claimedChecks: [], decisions: [], blockers: [], suggestedFollowUps: [],
      usage: { inputTokens: 0, outputTokens: 0, costUsd: "0" },
    };
  }
}
