import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { StateStore } from "../../src/state/store.js";
import { createLesson } from "../../src/learning/lessons.js";

describe("estado durável", () => {
  test("recupera lease cujo processo local não existe mais", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness-lease-"));
    const store = new StateStore(root);
    try {
      store.upsertProject({ id: "p", workspace: "/tmp/p", profile: "generic", timezone: "UTC" });
      store.createRun({ id: "r", projectId: "p", configPath: "/tmp/c", configHash: "h" });
      expect(store.acquireLease("r", "primeiro", 300)).toBe(true);
      expect(store.acquireLease("r", "segundo", 300)).toBe(false);
      store.run("UPDATE runs SET pid=999999, lease_expires_at='2999-01-01T00:00:00.000Z' WHERE id='r'");

      expect(store.acquireLease("r", "segundo", 300)).toBe(true);
      expect(store.get<Record<string, unknown>>("SELECT lease_owner FROM runs WHERE id='r'")?.lease_owner).toBe("segundo");
      expect(store.listEvents("r").some((event) => event.type === "lease.reclaimed")).toBe(true);
    } finally { store.close(); }
  });

  test("migra, registra eventos e impede lesson validada sem evidência", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness-state-"));
    const store = new StateStore(root);
    try {
      store.upsertProject({ id: "p", workspace: "/tmp/p", profile: "generic", timezone: "UTC" });
      store.createRun({ id: "r", projectId: "p", configPath: "/tmp/c", configHash: "h" });
      expect(store.get<Record<string, unknown>>("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1")?.version).toBe(3);
      expect(store.get<Record<string, unknown>>("SELECT name FROM sqlite_master WHERE type='table' AND name='run_sessions'")?.name).toBe("run_sessions");
      expect(store.listEvents("r")).toHaveLength(1);
      store.createMilestone("r", { id: "0-setup", title: "Setup", objective: "Setup", position: 1 });
      expect(store.pinMilestoneBranch("r", "0-setup", "0-setup")).toBe("0-setup");
      expect(store.pinMilestoneBranch("r", "0-setup", "outro-branch")).toBe("0-setup");
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

  test("espelha todo o estado da execução em JSON e reconstitui o JSONL a partir do SQLite", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "harness-json-mirror-"));
    const store = new StateStore(root);
    const runDirectory = path.join(root, "runs", "r-json");
    try {
      store.upsertProject({ id: "p-json", workspace: "/tmp/p", profile: "generic", timezone: "UTC" });
      store.createRun({ id: "r-json", projectId: "p-json", configPath: "/tmp/c", configHash: "h" });
      store.createMilestone("r-json", { id: "0-setup", title: "Setup", objective: "Objetivo", position: 0 });
      store.setMilestoneState("r-json", "0-setup", "in_progress");

      const snapshot = JSON.parse(await readFile(path.join(runDirectory, "state.json"), "utf8")) as Record<string, unknown>;
      expect(snapshot.format).toBe("pulsar-harness-run-state");
      expect(snapshot.schemaVersion).toBe(1);
      expect((snapshot.project as Record<string, unknown>).id).toBe("p-json");
      expect((snapshot.events as Record<string, unknown>).count).toBe(2);
      const eventsBefore = (await readFile(path.join(runDirectory, "events.jsonl"), "utf8"))
        .trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
      expect(eventsBefore.map((event) => event.type)).toEqual(["run.created", "milestone.in_progress"]);

      await writeFile(path.join(runDirectory, "events.jsonl"), "corrupted\n");
    } finally { store.close(); }

    const recovered = new StateStore(root);
    try {
      const rows = recovered.listEvents("r-json");
      const mirrored = (await readFile(path.join(runDirectory, "events.jsonl"), "utf8"))
        .trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
      expect(mirrored.map((event) => event.id)).toEqual(rows.reverse().map((event) => event.id));
      const snapshot = JSON.parse(await readFile(path.join(runDirectory, "state.json"), "utf8")) as Record<string, unknown>;
      expect((snapshot.milestones as Array<Record<string, unknown>>)[0]?.state).toBe("in_progress");
    } finally { recovered.close(); }
  });
});
