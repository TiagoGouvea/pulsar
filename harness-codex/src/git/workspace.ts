import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { runProcess } from "../utils/process.js";
import { sha256 } from "../utils/core.js";
import { assertPathInside } from "../security/workspace.js";

export async function isGitRepository(workspace: string): Promise<boolean> {
  const result = await runProcess(["git", "rev-parse", "--is-inside-work-tree"], { cwd: workspace, timeoutMs: 3_000 });
  return result.exitCode === 0 && result.stdout.trim() === "true";
}

export interface GitWorkspaceInfo {
  repositoryRoot: string | null;
  branch: string | null;
  sharedWithProtectedRoot: boolean;
}

export async function inspectGitWorkspace(workspace: string, protectedRoot?: string): Promise<GitWorkspaceInfo> {
  const repository = await runProcess(["git", "rev-parse", "--show-toplevel"], { cwd: workspace, timeoutMs: 3_000 });
  if (repository.exitCode !== 0) {
    return { repositoryRoot: null, branch: null, sharedWithProtectedRoot: false };
  }
  const repositoryRoot = path.resolve(repository.stdout.trim());
  const current = await runProcess(["git", "branch", "--show-current"], { cwd: workspace, timeoutMs: 3_000 });
  const branch = current.exitCode === 0 && current.stdout.trim() ? current.stdout.trim() : null;
  if (!protectedRoot) return { repositoryRoot, branch, sharedWithProtectedRoot: false };
  const protectedRepository = await runProcess(["git", "rev-parse", "--show-toplevel"], { cwd: protectedRoot, timeoutMs: 3_000 });
  const sharedWithProtectedRoot = protectedRepository.exitCode === 0
    && path.resolve(protectedRepository.stdout.trim()) === repositoryRoot;
  return { repositoryRoot, branch, sharedWithProtectedRoot };
}

export async function currentRevision(workspace: string): Promise<string> {
  if (!(await isGitRepository(workspace))) return `nogit:${await directoryFingerprint(workspace)}`;
  const repository = await runProcess(["git", "rev-parse", "--show-toplevel"], { cwd: workspace, timeoutMs: 3_000 });
  const relativeWorkspace = path.relative(repository.stdout.trim(), workspace).split(path.sep).join("/");
  const treeReference = relativeWorkspace ? `HEAD:${relativeWorkspace}` : "HEAD^{tree}";
  const tree = await runProcess(["git", "rev-parse", treeReference], { cwd: workspace, timeoutMs: 3_000 });
  const status = await runProcess(["git", "status", "--porcelain=v1", "-z", "--untracked-files=all", "--", "."], { cwd: workspace, timeoutMs: 5_000 });
  const diff = await runProcess(["git", "diff", "--binary", "HEAD", "--", "."], { cwd: workspace, timeoutMs: 10_000 });
  return `${tree.exitCode === 0 ? tree.stdout.trim() : "unborn"}:${sha256(status.stdout + diff.stdout)}`;
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
  const empty = await runProcess(["git", "diff", "--cached", "--quiet", "--", ...relativeFiles], { cwd: input.workspace, timeoutMs: 3_000 });
  if (empty.exitCode === 0) return { committed: false, revision: await currentRevision(input.workspace) };
  const committed = await runProcess(["git", "commit", "--only", "-m", `harness(${input.runId}): ${input.taskId}`, "--", ...relativeFiles], { cwd: input.workspace, timeoutMs: 30_000 });
  if (committed.exitCode !== 0) throw new Error(`Falha ao criar checkpoint de ${input.taskId}: ${committed.stderr}`);
  return { committed: true, revision: await currentRevision(input.workspace) };
}
