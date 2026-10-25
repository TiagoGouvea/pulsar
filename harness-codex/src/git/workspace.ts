import { readdir, readFile, realpath, stat } from "node:fs/promises";
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
  commonGitDirectory: string | null;
  branch: string | null;
  sharedWithProtectedRoot: boolean;
  linkedWorktree: boolean;
}

async function gitDirectory(cwd: string, argument: "--git-dir" | "--git-common-dir"): Promise<string | null> {
  const result = await runProcess(["git", "rev-parse", argument], { cwd, timeoutMs: 3_000 });
  if (result.exitCode !== 0) return null;
  const resolved = path.resolve(cwd, result.stdout.trim());
  return realpath(resolved).catch(() => resolved);
}

export async function inspectGitWorkspace(workspace: string, protectedRoot?: string): Promise<GitWorkspaceInfo> {
  const repository = await runProcess(["git", "rev-parse", "--show-toplevel"], { cwd: workspace, timeoutMs: 3_000 });
  if (repository.exitCode !== 0) {
    return { repositoryRoot: null, commonGitDirectory: null, branch: null, sharedWithProtectedRoot: false, linkedWorktree: false };
  }
  const repositoryRoot = path.resolve(repository.stdout.trim());
  const gitDir = await gitDirectory(workspace, "--git-dir");
  const commonGitDirectory = await gitDirectory(workspace, "--git-common-dir");
  const current = await runProcess(["git", "branch", "--show-current"], { cwd: workspace, timeoutMs: 3_000 });
  const branch = current.exitCode === 0 && current.stdout.trim() ? current.stdout.trim() : null;
  const linkedWorktree = Boolean(gitDir && commonGitDirectory && gitDir !== commonGitDirectory);
  if (!protectedRoot) return { repositoryRoot, commonGitDirectory, branch, sharedWithProtectedRoot: false, linkedWorktree };
  const protectedCommonGitDirectory = await gitDirectory(protectedRoot, "--git-common-dir");
  const sharedWithProtectedRoot = Boolean(commonGitDirectory && protectedCommonGitDirectory
    && commonGitDirectory === protectedCommonGitDirectory);
  return { repositoryRoot, commonGitDirectory, branch, sharedWithProtectedRoot, linkedWorktree };
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

export async function workspaceChanges(workspace: string): Promise<string[]> {
  const repository = await runProcess(["git", "rev-parse", "--show-toplevel"], { cwd: workspace, timeoutMs: 3_000 });
  if (repository.exitCode !== 0) return [];
  const repositoryRoot = await realpath(repository.stdout.trim());
  const workspaceRoot = await realpath(workspace);
  const relativeWorkspace = path.relative(repositoryRoot, workspaceRoot).split(path.sep).join("/") || ".";
  const status = await runProcess(
    ["git", "status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all", "--", relativeWorkspace],
    { cwd: repositoryRoot, timeoutMs: 10_000 },
  );
  if (status.exitCode !== 0) throw new Error(`Falha ao inspecionar alterações do workspace: ${status.stderr}`);
  return status.stdout.split("\0").filter(Boolean).map((entry) => entry.slice(3));
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
}): Promise<{ committed: boolean; revision: string; discoveredFiles: string[]; unmatchedReportedFiles: string[] }> {
  const repository = await runProcess(["git", "rev-parse", "--show-toplevel"], { cwd: input.workspace, timeoutMs: 3_000 });
  if (repository.exitCode !== 0) {
    return { committed: false, revision: await currentRevision(input.workspace), discoveredFiles: [], unmatchedReportedFiles: input.files };
  }
  const repositoryRoot = await realpath(repository.stdout.trim());
  const workspaceRoot = await realpath(input.workspace);
  const protectedRoot = await realpath(input.protectedRoot).catch(() => path.resolve(input.protectedRoot));
  if (repositoryRoot === protectedRoot) {
    return { committed: false, revision: await currentRevision(input.workspace), discoveredFiles: [], unmatchedReportedFiles: [] };
  }
  const discoveredFiles = await workspaceChanges(input.workspace);
  const reported = input.files.map((file) => ({
    original: file,
    repositoryPath: path.relative(
      repositoryRoot,
      assertPathInside(path.resolve(workspaceRoot, file), workspaceRoot),
    ).split(path.sep).join("/"),
  }));
  const unmatchedReportedFiles = reported
    .filter(({ repositoryPath }) => !discoveredFiles.some((file) => file === repositoryPath || file.startsWith(`${repositoryPath}/`)))
    .map(({ original }) => original);
  if (!discoveredFiles.length) {
    return { committed: false, revision: await currentRevision(input.workspace), discoveredFiles, unmatchedReportedFiles };
  }
  const added = await runProcess(["git", "add", "--", ...discoveredFiles], { cwd: repositoryRoot, timeoutMs: 10_000 });
  if (added.exitCode !== 0) throw new Error(`Falha no checkpoint de ${input.taskId}: ${added.stderr}`);
  const empty = await runProcess(["git", "diff", "--cached", "--quiet", "--", ...discoveredFiles], { cwd: repositoryRoot, timeoutMs: 3_000 });
  if (empty.exitCode === 0) {
    return { committed: false, revision: await currentRevision(input.workspace), discoveredFiles, unmatchedReportedFiles };
  }
  const committed = await runProcess(
    ["git", "commit", "--only", "-m", `harness(${input.runId}): ${input.taskId}`, "--", ...discoveredFiles],
    { cwd: repositoryRoot, timeoutMs: 30_000 },
  );
  if (committed.exitCode !== 0) throw new Error(`Falha ao criar checkpoint de ${input.taskId}: ${committed.stderr}`);
  return { committed: true, revision: await currentRevision(input.workspace), discoveredFiles, unmatchedReportedFiles };
}
