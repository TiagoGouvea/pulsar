import path from "node:path";
import type { HarnessConfig } from "../config/schema.js";
import type { StateStore } from "../state/store.js";
import { currentRevision } from "../git/workspace.js";
import { createId, nowUtc, writeJson } from "../utils/core.js";
import { runProcess } from "../utils/process.js";

export interface VerificationSummary {
  passed: boolean;
  revision: string;
  results: Array<{ id: string; status: "passed" | "failed" | "skipped"; exitCode: number | null; outputPath?: string }>;
}

export async function verifyCommands(input: {
  config: HarnessConfig;
  store: StateStore;
  runId: string;
  taskId?: string;
  commandNames: string[];
  outputDirectory: string;
}): Promise<VerificationSummary> {
  const revision = await currentRevision(input.config.project.workspace);
  const results: VerificationSummary["results"] = [];
  for (const name of input.commandNames) {
    const command = input.config.commands[name];
    if (!command) {
      results.push({ id: name, status: "skipped", exitCode: null });
      continue;
    }
    const executable = command[0];
    if (!executable || !input.config.security.allowedCommands.includes(executable)) {
      results.push({ id: name, status: "failed", exitCode: null });
      continue;
    }
    const verifierId = createId("verification");
    const outputPath = path.join(input.outputDirectory, `${name}.log`);
    const startedAt = nowUtc();
    const result = await runProcess(command, {
      cwd: input.config.project.workspace,
      timeoutMs: input.config.execution.taskTimeoutMinutes * 60_000,
      outputPath,
      redactPatterns: input.config.security.redactPatterns,
    });
    const status = result.exitCode === 0 && !result.timedOut ? "passed" : "failed";
    input.store.run(
      `INSERT INTO verifier_runs(id, run_id, task_id, revision, verifier_id, verifier_version, status,
       command_json, exit_code, output_path, started_at, finished_at) VALUES (?, ?, ?, ?, ?, '1', ?, ?, ?, ?, ?, ?)`,
      verifierId, input.runId, input.taskId ?? null, revision, name, status, JSON.stringify(command), result.exitCode, outputPath, startedAt, nowUtc(),
    );
    results.push({ id: name, status, exitCode: result.exitCode, outputPath });
    if (status === "failed") break;
  }
  const summary = { passed: results.every((item) => item.status !== "failed"), revision, results };
  await writeJson(path.join(input.outputDirectory, "verification.json"), summary);
  return summary;
}

export function invalidateStaleVerifications(store: StateStore, runId: string, current: string): number {
  const stale = store.all<Record<string, unknown>>(
    "SELECT id FROM verifier_runs WHERE run_id=? AND revision<>? AND status='passed'", runId, current,
  );
  for (const row of stale) {
    store.run("UPDATE verifier_runs SET status='stale' WHERE id=?", String(row.id));
    store.event(runId, "verification.invalidated", "verifier_run", String(row.id), { currentRevision: current });
  }
  return stale.length;
}
