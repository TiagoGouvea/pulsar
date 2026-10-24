import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { HarnessConfig } from "../config/schema.js";
import type { StateStore } from "./store.js";
import { createId, hashFile, nowUtc, writeJson } from "../utils/core.js";

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
  await writeJson(path.join(config.storage.root, "runs", runId, "input-manifest.json"), { runId, entries });
  store.event(runId, "inputs.captured", "run", runId, { count: entries.length });
}

export async function readSpecs(config: HarnessConfig): Promise<Array<{ path: string; content: string }>> {
  return Promise.all(config.project.specs.map(async (specPath) => ({ path: specPath, content: await readFile(specPath, "utf8") })));
}
