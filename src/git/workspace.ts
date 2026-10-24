import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { runProcess } from "../utils/process.js";
import { sha256 } from "../utils/core.js";
import { assertPathInside } from "../security/workspace.js";

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

export async function prepareExecutionBranch(workspace: string, runId: string, protectedRoot: string): Promise<{ status: "created" | "skipped"; detail: string }> {
  const repository = await runProcess(["git", "rev-parse", "--show-toplevel"], { cwd: workspace, timeoutMs: 3_000 });
  if (repository.exitCode !== 0) return { status: "skipped", detail: "Workspace ainda não é um repositório Git." };
  const repositoryRoot = repository.stdout.trim();
  if (path.resolve(repositoryRoot) === path.resolve(protectedRoot)) {
    return { status: "skipped", detail: "Fixture/repositório do harness: branch não foi alterada." };
  }
  const branch = `harness/${runId}`;
  const current = await runProcess(["git", "branch", "--show-current"], { cwd: workspace, timeoutMs: 3_000 });
  if (current.stdout.trim() === branch) return { status: "created", detail: branch };
  const exists = await runProcess(["git", "show-ref", "--verify", `refs/heads/${branch}`], { cwd: workspace, timeoutMs: 3_000 });
  const command = exists.exitCode === 0 ? ["git", "switch", branch] : ["git", "switch", "-c", branch];
  const switched = await runProcess(command, { cwd: workspace, timeoutMs: 10_000 });
  if (switched.exitCode !== 0) throw new Error(`Não foi possível preparar a branch ${branch}: ${switched.stderr}`);
  return { status: "created", detail: branch };
}

export async function checkpointFiles(input: {
  workspace: string;
  protectedRoot: string;
  runId: string;
  taskId: string;
  files: string[];
}): Promise<{ committed: boolean; revision: string }> {
  const repository = await runProcess(["git", "rev-parse", "--show-toplevel"], { cwd: input.workspace, timeoutMs: 3_000 });
  if (repository.exitCode !== 0) return { committed: false, revision: await currentRevision(input.workspace) };
  const repositoryRoot = repository.stdout.trim();
  if (path.resolve(repositoryRoot) === path.resolve(input.protectedRoot)) {
    return { committed: false, revision: await currentRevision(input.workspace) };
  }
  const relativeFiles = input.files.map((file) => path.relative(input.workspace, assertPathInside(path.resolve(input.workspace, file), input.workspace)));
  if (!relativeFiles.length) return { committed: false, revision: await currentRevision(input.workspace) };
  const added = await runProcess(["git", "add", "--", ...relativeFiles], { cwd: input.workspace, timeoutMs: 10_000 });
  if (added.exitCode !== 0) throw new Error(`Falha no checkpoint de ${input.taskId}: ${added.stderr}`);
  const empty = await runProcess(["git", "diff", "--cached", "--quiet"], { cwd: input.workspace, timeoutMs: 3_000 });
  if (empty.exitCode === 0) return { committed: false, revision: await currentRevision(input.workspace) };
  const committed = await runProcess(["git", "commit", "-m", `harness(${input.runId}): ${input.taskId}`], { cwd: input.workspace, timeoutMs: 30_000 });
  if (committed.exitCode !== 0) throw new Error(`Falha ao criar checkpoint de ${input.taskId}: ${committed.stderr}`);
  return { committed: true, revision: await currentRevision(input.workspace) };
}
