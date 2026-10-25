import { existsSync, realpathSync } from "node:fs";
import { join, relative } from "node:path";
import { execa } from "execa";

const ID = ["-c", "user.name=pulsar-harness", "-c", "user.email=harness@localhost", "-c", "commit.gpgsign=false"];
const EXCL = ["--", ".", ":(exclude).harness"];

export async function git(cwd: string, ...args: string[]) {
  const r = await execa("git", [...ID, ...args], { cwd, reject: false });
  if (r.exitCode !== 0) throw new Error(`git ${args.join(" ")} (${cwd}): ${r.stderr || r.stdout}`);
  return String(r.stdout).trim();
}
const tryGit = (cwd: string, ...a: string[]) => git(cwd, ...a).then(() => true, () => false);

export const wtPath = (root: string, name: string) => join(root, ".worktrees", name);
export const head = (cwd: string) => git(cwd, "rev-parse", "HEAD");
export const branchExists = (root: string, b: string) => tryGit(root, "rev-parse", "--verify", "--quiet", `refs/heads/${b}`);
export const currentBranch = (root: string) => git(root, "branch", "--show-current");

export async function ensureBranch(root: string, name: string, from: string) {
  if (!(await branchExists(root, name))) await git(root, "branch", name, from);
}

/** Creates (or reuses) a worktree in .worktrees/<name> on `branch`, created from `base` if missing. */
export async function addWorktree(root: string, name: string, branch: string, base: string) {
  const path = wtPath(root, name);
  if (existsSync(path)) return path;
  if (await branchExists(root, branch)) await git(root, "worktree", "add", path, branch);
  else await git(root, "worktree", "add", "-b", branch, path, base);
  return path;
}

export async function removeWorktree(root: string, path: string, deleteBranch?: string) {
  if (existsSync(path)) await tryGit(root, "worktree", "remove", "--force", path);
  await tryGit(root, "worktree", "prune");
  if (deleteBranch) await tryGit(root, "branch", "-D", deleteBranch);
}

export async function listWorktrees(root: string) {
  const out = await git(root, "worktree", "list", "--porcelain");
  const real = realpathSync(root);   // git reports resolved paths (/private/var/... on macOS)
  return out.split("\n\n").map((b) => ({
    path: b.match(/^worktree (.+)$/m)?.[1] ?? "",
    branch: b.match(/^branch refs\/heads\/(.+)$/m)?.[1],
  })).filter((w) => relative(real, w.path).startsWith(".worktrees"));
}

/** Removes orphan feature worktrees (and their branches) left by a crash. Keeps stage worktrees. */
export async function pruneOrphans(root: string, keep: (name: string) => boolean) {
  const removed: string[] = [];
  for (const w of await listWorktrees(root)) {
    const name = relative(join(realpathSync(root), ".worktrees"), w.path);
    if (keep(name)) continue;
    await removeWorktree(root, w.path, w.branch);
    removed.push(name);
  }
  return removed;
}

/** Commits everything except .harness/ (state belongs to the orchestrator). Returns the new sha or null. */
export async function commitAll(cwd: string, msg: string) {
  await git(cwd, "add", "-A", ...EXCL);
  const merging = existsSync(join(await git(cwd, "rev-parse", "--absolute-git-dir"), "MERGE_HEAD"));
  if (!merging && (await tryGit(cwd, "diff", "--cached", "--quiet"))) return null;
  await git(cwd, "commit", "--no-verify", "-m", msg);
  return head(cwd);
}

export async function resetHard(cwd: string, ref: string) {
  await tryGit(cwd, "merge", "--abort");
  await git(cwd, "reset", "--hard", ref);
  await git(cwd, "clean", "-fd", ...EXCL);
}

export const diff = (cwd: string, base: string) => git(cwd, "diff", base, "HEAD", ...EXCL);
export const changedFiles = async (cwd: string, base: string) =>
  (await git(cwd, "diff", "--name-only", base, "HEAD", ...EXCL)).split("\n").filter(Boolean);

/** Brings the latest stage branch into the feature branch. On conflict the markers are left for the worker. */
export async function integrate(cwd: string, stageBranch: string) {
  if (await tryGit(cwd, "merge", "--no-edit", stageBranch)) return { ok: true };
  return { ok: false, conflict: await git(cwd, "diff", "--name-only", "--diff-filter=U") };
}

/** Merges `branch` into the branch checked out at `cwd` (no fast-forward). Aborts on conflict. */
export async function mergeNoFf(cwd: string, branch: string, msg: string) {
  if (await tryGit(cwd, "merge", "--no-ff", "-m", msg, branch)) return true;
  await tryGit(cwd, "merge", "--abort");
  return false;
}

/** Commits only the given paths (orchestrator state snapshots: .harness, checkpoints). */
export async function commitPaths(cwd: string, paths: string[], msg: string) {
  const present = paths.filter((p) => existsSync(join(cwd, p)));
  if (!present.length) return null;
  await git(cwd, "add", "-A", "--", ...present);
  if (await tryGit(cwd, "diff", "--cached", "--quiet")) return null;
  await git(cwd, "commit", "--no-verify", "-m", msg, "--", ...present);
  return head(cwd);
}

/** Merges `branch` into `main` without disturbing the root checkout when it is on another branch. */
export async function mergeToMain(root: string, main: string, branch: string, msg: string) {
  if ((await currentBranch(root)) === main) return mergeNoFf(root, branch, msg);
  const tmp = await addWorktree(root, "main-merge", main, main);
  try { return await mergeNoFf(tmp, branch, msg); } finally { await removeWorktree(root, tmp); }
}

export const tag = (root: string, name: string) => git(root, "tag", "-f", name);
export const isClean = async (root: string) => (await git(root, "status", "--porcelain", ...EXCL)) === "";
export const hasRemote = async (root: string) => (await git(root, "remote")).length > 0;
