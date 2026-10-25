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
export const currentBranch = (root: string) => git(root, "branch", "--show-current");

/** Detached worktree in .worktrees/<name> at `base` (never creates or switches branches). Returns the project dir
 *  inside it: the repo may be a subfolder of a monorepo. */
export async function addWorktree(root: string, name: string, base: string) {
  const path = wtPath(root, name);
  if (!existsSync(path)) await git(root, "worktree", "add", "--detach", path, base);
  return join(path, relative(await git(root, "rev-parse", "--show-toplevel"), realpathSync(root)));
}

export async function removeWorktree(root: string, name: string) {
  if (existsSync(wtPath(root, name))) await tryGit(root, "worktree", "remove", "--force", wtPath(root, name));
  await tryGit(root, "worktree", "prune");
}

/** Names of the harness worktrees (under .worktrees/). */
export async function listWorktrees(root: string) {
  const base = join(realpathSync(root), ".worktrees");   // git reports resolved paths (/private/var/... on macOS)
  return (await git(root, "worktree", "list", "--porcelain")).split("\n\n")
    .map((b) => relative(base, b.match(/^worktree (.+)$/m)?.[1] ?? "")).filter((n) => n && !n.startsWith(".."));
}

/** Removes orphan feature worktrees left by a crash (`keep` decides which survive). */
export async function pruneOrphans(root: string, keep: (name: string) => boolean) {
  const removed = (await listWorktrees(root)).filter((n) => !keep(n));
  for (const n of removed) await removeWorktree(root, n);
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

export const diff = (cwd: string, base: string) => git(cwd, "diff", "--relative", base, "HEAD", ...EXCL);
export const changedFiles = async (cwd: string, base: string) =>
  (await git(cwd, "diff", "--relative", "--name-only", base, "HEAD", ...EXCL)).split("\n").filter(Boolean);

/** Brings the latest commits of `branch` into the worktree. On conflict the markers are left for the worker. */
export async function integrate(cwd: string, branch: string) {
  if (await tryGit(cwd, "merge", "--no-edit", branch)) return { ok: true };
  return { ok: false, conflict: await git(cwd, "diff", "--name-only", "--diff-filter=U") };
}

/** Squashes the worktree's work into one commit on top of `branch` and fast-forwards the root checkout, which must
 *  have `branch` checked out. Never switches branches; retries when someone else commits meanwhile. */
export async function land(root: string, cwd: string, branch: string, msg: string): Promise<{ ok: boolean; conflict?: string }> {
  for (let i = 1; ; i++) {
    const integ = await integrate(cwd, branch);
    if (!integ.ok) return integ;
    await git(cwd, "reset", "--soft", await git(root, "rev-parse", branch));
    if (await tryGit(cwd, "diff", "--cached", "--quiet")) return { ok: true };
    await git(cwd, "commit", "--no-verify", "-m", msg);
    const now = await currentBranch(root);
    if (now !== branch) throw new Error(`a branch do repo mudou de "${branch}" para "${now || "detached"}"; o harness nunca troca de branch: volte para ${branch} e rode harness resume`);
    if (await tryGit(root, "merge", "--ff-only", "--quiet", await head(cwd))) return { ok: true };
    if (i === 5) throw new Error(`não consegui avançar ${branch} (mudanças locais conflitantes em ${root}?)`);
    await new Promise((r) => setTimeout(r, 1000 * i));
  }
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

export const isClean = async (root: string) => (await git(root, "status", "--porcelain", ...EXCL)) === "";
export const hasRemote = async (root: string) => (await git(root, "remote")).length > 0;
