import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { StateStore } from "../../src/state/store.js";
import { createLesson } from "../../src/learning/lessons.js";

describe("estado durável", () => {
  test("migra, registra eventos e impede lesson validada sem evidência", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness-state-"));
    const store = new StateStore(root);
    try {
      store.upsertProject({ id: "p", workspace: "/tmp/p", profile: "generic", timezone: "UTC" });
      store.createRun({ id: "r", projectId: "p", configPath: "/tmp/c", configHash: "h" });
      expect(store.listEvents("r")).toHaveLength(1);
      store.createMilestone("r", { id: "stage-a", title: "A", objective: "A", position: 1 });
      expect(store.pinMilestoneBranch("r", "stage-a", "feature/stage-a")).toBe("feature/stage-a");
      expect(store.pinMilestoneBranch("r", "stage-a", "outro-branch")).toBe("feature/stage-a");
      expect(() => createLesson(store, {
        projectId: "p", scope: "project", tags: ["test"], observation: "x",
        recommendedAction: "y", evidenceIds: [], confidence: "supported", applicability: {},
      }, true)).toThrow(/evidência/);
      const id = createLesson(store, {
        projectId: "p", scope: "project", tags: ["test"], observation: "x",
        recommendedAction: "y", evidenceIds: ["attempt-1"], confidence: "supported", applicability: {},
      }, true);
      expect(store.get<Record<string, unknown>>("SELECT status FROM lessons WHERE id=?", id)?.status).toBe("validated");
    } finally { store.close(); }
  });
});
