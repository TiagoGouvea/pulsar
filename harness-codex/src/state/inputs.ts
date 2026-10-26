import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { HarnessConfig } from "../config/schema.js";
import type { StateStore } from "./store.js";
import { createId, hashFile, nowUtc, sha256, writeJson } from "../utils/core.js";

const PLANNING_CONFIG_PATH_SUFFIX = "#planning";

function planningConfigPath(config: HarnessConfig): string {
  return `${config.configPath}${PLANNING_CONFIG_PATH_SUFFIX}`;
}

export function planningConfigFingerprint(config: HarnessConfig): { sha256: string; sizeBytes: number } {
  const serialized = JSON.stringify({
    project: {
      id: config.project.id,
      workspace: config.project.workspace,
      specs: config.project.specs,
      designDirectory: config.project.designDirectory ?? null,
      milestones: config.project.milestones,
      profile: config.project.profile,
      timezone: config.project.timezone,
    },
    maxAttemptsPerTask: config.execution.maxAttemptsPerTask,
  });
  return { sha256: sha256(serialized), sizeBytes: Buffer.byteLength(serialized) };
}

function insertPlanningConfig(config: HarnessConfig, store: StateStore, runId: string): Record<string, unknown> {
  const fingerprint = planningConfigFingerprint(config);
  const entry = {
    id: createId("input"), kind: "planning_config", path: planningConfigPath(config),
    ...fingerprint, capturedAt: nowUtc(),
  };
  store.run(
    "INSERT OR IGNORE INTO input_versions(id, run_id, kind, path, sha256, size_bytes, captured_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    entry.id, runId, entry.kind, entry.path, entry.sha256, entry.sizeBytes, entry.capturedAt,
  );
  return entry;
}

export async function captureInputs(config: HarnessConfig, store: StateStore, runId: string): Promise<void> {
  const entries = [];
  for (const specPath of config.project.specs) {
    const details = await stat(specPath);
    const entry = {
      id: createId("input"), kind: "specification", path: specPath,
      sha256: await hashFile(specPath), sizeBytes: details.size, capturedAt: nowUtc(),
    };
    store.run(
      "INSERT OR IGNORE INTO input_versions(id, run_id, kind, path, sha256, size_bytes, captured_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      entry.id, runId, entry.kind, entry.path, entry.sha256, entry.sizeBytes, entry.capturedAt,
    );
    entries.push(entry);
  }
  const configEntry = {
    id: createId("input"), kind: "config", path: config.configPath,
    sha256: await hashFile(config.configPath), sizeBytes: (await stat(config.configPath)).size, capturedAt: nowUtc(),
  };
  store.run(
    "INSERT OR IGNORE INTO input_versions(id, run_id, kind, path, sha256, size_bytes, captured_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    configEntry.id, runId, configEntry.kind, configEntry.path, configEntry.sha256, configEntry.sizeBytes, configEntry.capturedAt,
  );
  entries.push(configEntry);
  entries.push(insertPlanningConfig(config, store, runId));
  await writeJson(path.join(config.storage.root, "runs", runId, "input-manifest.json"), { runId, entries });
  store.event(runId, "inputs.captured", "run", runId, { count: entries.length });
}

export async function readSpecs(config: HarnessConfig): Promise<Array<{ path: string; content: string }>> {
  return Promise.all(config.project.specs.map(async (specPath) => ({ path: specPath, content: await readFile(specPath, "utf8") })));
}

export async function detectInputChanges(config: HarnessConfig, store: StateStore, runId: string): Promise<Array<{ path: string; previous: string; current: string }>> {
  const changes = [];
  for (const inputPath of config.project.specs) {
    const latest = store.get<Record<string, unknown>>(
      "SELECT sha256 FROM input_versions WHERE run_id=? AND path=? ORDER BY captured_at DESC LIMIT 1", runId, inputPath,
    );
    if (!latest || typeof latest.sha256 !== "string") continue;
    const current = await hashFile(inputPath);
    if (current !== latest.sha256) changes.push({ path: inputPath, previous: latest.sha256, current });
  }
  const fingerprint = planningConfigFingerprint(config);
  const fingerprintPath = planningConfigPath(config);
  const planningInput = store.get<Record<string, unknown>>(
    "SELECT sha256 FROM input_versions WHERE run_id=? AND kind='planning_config' ORDER BY captured_at DESC LIMIT 1",
    runId,
  );
  if (!planningInput || typeof planningInput.sha256 !== "string") {
    insertPlanningConfig(config, store, runId);
    store.event(runId, "inputs.planning_config_baselined", "run", runId, {
      path: fingerprintPath,
      reason: "legacy_run",
    });
  } else if (fingerprint.sha256 !== planningInput.sha256) {
    changes.push({ path: fingerprintPath, previous: planningInput.sha256, current: fingerprint.sha256 });
  }
  return changes;
}
