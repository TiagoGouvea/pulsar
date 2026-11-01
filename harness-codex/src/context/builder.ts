import path from "node:path";
import type { HarnessConfig } from "../config/schema.js";
import type { Requirement, Task } from "../domain/types.js";
import type { StateStore } from "../state/store.js";
import { readdir, readFile } from "node:fs/promises";
import { sha256, writeJson } from "../utils/core.js";

async function taskFeedback(input: { config: HarnessConfig; runId: string; task: Task }): Promise<string> {
  const directory = path.join(input.config.storage.root, "runs", input.runId, "milestones", input.task.milestoneId);
  let files: string[];
  try {
    files = await readdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
  const prefix = `human-feedback-${encodeURIComponent(input.task.id)}-`;
  const matching = files.filter((file) => file.startsWith(prefix) && file.endsWith(".md")).sort();
  const entries: string[] = [];
  let remaining = 30_000;
  for (const file of matching) {
    if (remaining <= 0) break;
    const content = (await readFile(path.join(directory, file), "utf8")).trim();
    if (!content) continue;
    const excerpt = content.slice(0, remaining);
    entries.push(`### ${file}\n${excerpt}`);
    remaining -= excerpt.length;
  }
  return entries.length
    ? `Feedback humano para esta tarefa (requisitos de correção; preserve o escopo e resolva estes pontos antes de concluir):\n${entries.join("\n\n")}`
    : "";
}

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
  const feedback = await taskFeedback(input);
  const sections = [
    "Você implementa uma tarefa delimitada dentro de um workspace autorizado.",
    "Não altere o harness, seu estado, políticas ou orçamento. Não aprove seu próprio trabalho.",
    `Tarefa ${input.task.id}: ${input.task.description}`,
    `Critérios: ${input.task.acceptanceCriteria.map((item) => `- ${item}`).join("\n")}`,
    `Requisitos:\n${relevant.map((item) => `[${item.id}] ${item.description}\nOrigem: ${item.sourceSection}`).join("\n")}`,
    feedback,
    input.config.project.designDirectory
      ? `Design oficial: ${input.config.project.designDirectory}. Use essas referências sem criar uma variante desktop; em telas largas aplique somente o reflow definido nos requisitos.`
      : "",
    lessons.length ? `Aprendizados validados:\n${lessons.map((item) => `- ${String(item.recommended_action)} (${String(item.id)})`).join("\n")}` : "",
    "Ao terminar, responda somente JSON válido com: taskId, outcome, summary, changedFiles, claimedChecks, decisions, blockers, suggestedFollowUps.",
    "changedFiles, claimedChecks, decisions, blockers e suggestedFollowUps devem ser arrays JSON de strings; use [] quando vazios, nunca objeto ou null. claimedChecks não é evidência.",
    "outcome deve ser ready_for_verification, blocked ou failed.",
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
