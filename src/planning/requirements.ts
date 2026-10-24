import path from "node:path";
import type { HarnessConfig } from "../config/schema.js";
import type { Requirement, Task } from "../domain/types.js";
import { readSpecs } from "../state/inputs.js";

const headingPattern = /^#{1,6}\s+(REQ-[A-Za-z0-9_-]+)(?:\s+\[(required|optional|out_of_scope)\])?\s*[-:]?\s*(.*)$/i;

export async function extractRequirements(config: HarnessConfig): Promise<Requirement[]> {
  const specifications = await readSpecs(config);
  const requirements: Requirement[] = [];
  for (const specification of specifications) {
    const lines = specification.content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const match = headingPattern.exec(lines[index] ?? "");
      if (!match) continue;
      const matchedId = match[1];
      if (!matchedId) continue;
      const id = matchedId.toUpperCase();
      const priority = (match[2]?.toLowerCase() ?? "required") as Requirement["priority"];
      const descriptionParts = [match[3]?.trim() ?? ""];
      const acceptance: string[] = [];
      const dependencies: string[] = [];
      let section = "description";
      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        const line = lines[cursor] ?? "";
        if (/^#{1,6}\s+/.test(line)) break;
        if (/^\s*(?:Crit[eé]rios|Acceptance)/i.test(line)) { section = "acceptance"; continue; }
        if (/^\s*(?:Depend[eê]ncias|Dependencies)/i.test(line)) { section = "dependencies"; continue; }
        const bullet = /^\s*[-*]\s+(.+)$/.exec(line)?.[1]?.trim();
        if (bullet && section === "acceptance") acceptance.push(bullet);
        else if (bullet && section === "dependencies") dependencies.push(...bullet.match(/REQ-[A-Za-z0-9_-]+/gi)?.map((item) => item.toUpperCase()) ?? []);
        else if (line.trim() && section === "description") descriptionParts.push(line.trim());
      }
      requirements.push({
        id,
        sourcePath: specification.path,
        sourceSection: `${path.basename(specification.path)}:${index + 1}`,
        description: descriptionParts.filter(Boolean).join(" "),
        priority,
        acceptanceCriteria: acceptance.length ? acceptance : [`Comportamento de ${id} demonstrado por teste observável.`],
        risks: [], dependencies, verificationMethod: "automated_and_human",
      });
    }
  }
  const duplicates = requirements.filter((item, index) => requirements.findIndex((other) => other.id === item.id) !== index);
  if (duplicates.length) throw new Error(`IDs de requisitos duplicados: ${duplicates.map((item) => item.id).join(", ")}`);
  if (!requirements.length) {
    throw new Error("Nenhum requisito rastreável encontrado. Use cabeçalhos `## REQ-001 [required] Título`.");
  }
  return requirements;
}

export function createTasks(runId: string, requirements: Requirement[], maxAttempts: number): Task[] {
  const required = requirements.filter((requirement) => requirement.priority !== "out_of_scope");
  const taskByRequirement = new Map(required.map((requirement, index) => [requirement.id, `task-${String(index + 1).padStart(3, "0")}`]));
  const tasks = required.map((requirement): Task => {
    const taskId = taskByRequirement.get(requirement.id);
    if (!taskId) throw new Error(`Tarefa ausente para ${requirement.id}`);
    return {
      id: taskId,
      runId,
      milestoneId: "milestone-001",
      title: requirement.description.split(".")[0]?.slice(0, 100) || requirement.id,
      description: requirement.description,
      state: "pending",
      role: "implementer",
      requirementIds: [requirement.id],
      dependencies: requirement.dependencies.map((id) => taskByRequirement.get(id)).filter((id): id is string => Boolean(id)),
      acceptanceCriteria: requirement.acceptanceCriteria,
      plannedFiles: [], maxAttempts,
    };
  });
  assertAcyclic(tasks);
  return tasks;
}

export function assertAcyclic(tasks: Task[]): void {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) throw new Error(`Dependência circular detectada em ${id}.`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of byId.get(id)?.dependencies ?? []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  for (const task of tasks) visit(task.id);
}
