import path from "node:path";
import type { HarnessConfig } from "../config/schema.js";
import type { Requirement, Task } from "../domain/types.js";
import type { StateStore } from "../state/store.js";
import { sha256, writeJson } from "../utils/core.js";

export async function buildTaskContext(input: {
  config: HarnessConfig;
  store: StateStore;
  runId: string;
  task: Task;
  requirements: Requirement[];
  attemptDirectory: string;
}): Promise<string> {
  const relevant = input.requirements.filter((requirement) => input.task.requirementIds.includes(requirement.id));
  const lessons = input.store.all<Record<string, unknown>>(
    `SELECT * FROM lessons WHERE project_id=? AND status='validated' ORDER BY created_at DESC LIMIT 5`, input.config.project.id,
  );
  const sections = [
    "Você implementa uma tarefa delimitada dentro de um workspace autorizado.",
    "Não altere o harness, seu estado, políticas ou orçamento. Não aprove seu próprio trabalho.",
    `Tarefa ${input.task.id}: ${input.task.description}`,
    `Critérios: ${input.task.acceptanceCriteria.map((item) => `- ${item}`).join("\n")}`,
    `Requisitos:\n${relevant.map((item) => `[${item.id}] ${item.description}\nOrigem: ${item.sourceSection}`).join("\n")}`,
    input.config.project.designDirectory
      ? `Design oficial: ${input.config.project.designDirectory}. Use essas referências sem criar uma variante desktop; em telas largas aplique somente o reflow definido nos requisitos.`
      : "",
    lessons.length ? `Aprendizados validados:\n${lessons.map((item) => `- ${String(item.recommended_action)} (${String(item.id)})`).join("\n")}` : "",
    "Ao terminar, responda somente JSON válido com: taskId, outcome, summary, changedFiles, claimedChecks, decisions, blockers, suggestedFollowUps.",
    "outcome deve ser ready_for_verification, blocked ou failed. claimedChecks não é evidência.",
  ].filter(Boolean);
  const prompt = sections.join("\n\n");
  const manifest = {
    runId: input.runId,
    taskId: input.task.id,
    requirementIds: input.task.requirementIds,
    designDirectory: input.config.project.designDirectory ?? null,
    lessonIds: lessons.map((lesson) => lesson.id),
    estimatedTokens: Math.ceil(prompt.length / 4),
    estimator: "utf16_chars_divided_by_4_conservative",
    sha256: sha256(prompt),
  };
  await writeJson(path.join(input.attemptDirectory, "context-manifest.json"), manifest);
  return prompt;
}
