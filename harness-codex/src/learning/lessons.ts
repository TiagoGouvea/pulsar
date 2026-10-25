import type { StateStore } from "../state/store.js";
import { createId, nowUtc } from "../utils/core.js";

export interface LessonInput {
  projectId: string;
  scope: "project" | "profile" | "global";
  tags: string[];
  observation: string;
  recommendedAction: string;
  evidenceIds: string[];
  confidence: "hypothesis" | "supported" | "strong";
  applicability: Record<string, string>;
  reviewAfterRuns?: number;
}

export function createLesson(store: StateStore, input: LessonInput, validate = false): string {
  if (validate && input.evidenceIds.length === 0) {
    throw new Error("Lesson sem evidência não pode ser validada.");
  }
  const id = createId("lesson");
  store.run(
    `INSERT INTO lessons(id, project_id, scope, tags_json, observation, recommended_action, evidence_ids_json,
     status, confidence, applicability_json, supersedes_json, review_after_runs, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?)`,
    id, input.projectId, input.scope, JSON.stringify(input.tags), input.observation, input.recommendedAction,
    JSON.stringify(input.evidenceIds), validate ? "validated" : "candidate", input.confidence,
    JSON.stringify(input.applicability), input.reviewAfterRuns ?? null, nowUtc(),
  );
  return id;
}

export function supersedeLesson(store: StateStore, lessonId: string, replacementId: string): void {
  store.transaction(() => {
    store.run("UPDATE lessons SET status='superseded', supersedes_json=? WHERE id=?", JSON.stringify([replacementId]), lessonId);
  });
}
