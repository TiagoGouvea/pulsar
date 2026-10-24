import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { runProcess } from "../utils/process.js";
import { sha256 } from "../utils/core.js";

export async function isGitRepository(workspace: string): Promise<boolean> {
  const result = await runProcess(["git", "rev-parse", "--is-inside-work-tree"], { cwd: workspace, timeoutMs: 3_000 });
  return result.exitCode === 0 && result.stdout.trim() === "true";
}

export async function currentRevision(workspace: string): Promise<string> {
  if (!(await isGitRepository(workspace))) return `nogit:${await directoryFingerprint(workspace)}`;
  const head = await runProcess(["git", "rev-parse", "HEAD"], { cwd: workspace, timeoutMs: 3_000 });
  const status = await runProcess(["git", "status", "--porcelain=v1", "-z", "--untracked-files=all"], { cwd: workspace, timeoutMs: 5_000 });
  const diff = await runProcess(["git", "diff", "--binary", "HEAD"], { cwd: workspace, timeoutMs: 10_000 });
  return `${head.exitCode === 0 ? head.stdout.trim() : "unborn"}:${sha256(status.stdout + diff.stdout)}`;
}

async function directoryFingerprint(root: string): Promise<string> {
  const pieces: string[] = [];
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (["node_modules", ".git", ".harness"].includes(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile() && (await stat(absolute)).size < 2_000_000) {
        pieces.push(`${path.relative(root, absolute)}:${sha256(await readFile(absolute))}`);
      }
    }
  }
  await walk(root);
  return sha256(pieces.sort().join("\n"));
}
