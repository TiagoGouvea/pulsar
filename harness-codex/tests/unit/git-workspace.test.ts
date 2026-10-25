import { mkdir, mkdtemp, realpath, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { checkpointFiles, currentRevision, inspectGitWorkspace } from "../../src/git/workspace.js";
import { runProcess } from "../../src/utils/process.js";

describe("workspace Git", () => {
  test("isola branch, revisão e checkpoint da aplicação dentro do monorepo", async () => {
    const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), "pulsar monorepo "));
    const protectedRoot = path.join(repositoryRoot, "harness-codex");
    const workspace = path.join(repositoryRoot, "pulsar-codex");
    await mkdir(protectedRoot);
    await mkdir(workspace);
    await runProcess(["git", "init", "-b", "main"], { cwd: repositoryRoot });
    await runProcess(["git", "config", "user.name", "Harness Test"], { cwd: repositoryRoot });
    await runProcess(["git", "config", "user.email", "harness@example.invalid"], { cwd: repositoryRoot });
    await writeFile(path.join(protectedRoot, "harness.txt"), "initial\n");
    await writeFile(path.join(workspace, "app.txt"), "initial\n");
    await runProcess(["git", "add", "."], { cwd: repositoryRoot });
    await runProcess(["git", "commit", "-m", "initial"], { cwd: repositoryRoot });

    const revisionBeforeHarnessChange = await currentRevision(workspace);
    await writeFile(path.join(protectedRoot, "harness.txt"), "other agent\n");
    await runProcess(["git", "add", "harness-codex/harness.txt"], { cwd: repositoryRoot });
    await runProcess(["git", "commit", "-m", "other agent"], { cwd: repositoryRoot });
    expect(await currentRevision(workspace)).toBe(revisionBeforeHarnessChange);
    await writeFile(path.join(protectedRoot, "harness.txt"), "other agent staged\n");
    await runProcess(["git", "add", "harness-codex/harness.txt"], { cwd: repositoryRoot });

    const git = await inspectGitWorkspace(workspace, protectedRoot);
    expect(git).toEqual({
      repositoryRoot: await realpath(repositoryRoot), commonGitDirectory: path.join(await realpath(repositoryRoot), ".git"),
      branch: "main", sharedWithProtectedRoot: true, linkedWorktree: false,
    });

    await writeFile(path.join(workspace, "app.txt"), "changed\n");
    const checkpoint = await checkpointFiles({
      workspace, protectedRoot, runId: "run-test", taskId: "task-001", files: ["app.txt"],
    });
    expect(checkpoint.committed).toBe(true);
    const committedFiles = await runProcess(["git", "show", "--format=", "--name-only", "HEAD"], { cwd: repositoryRoot });
    expect(committedFiles.stdout.trim()).toBe("pulsar-codex/app.txt");
    const stagedFiles = await runProcess(["git", "diff", "--cached", "--name-only"], { cwd: repositoryRoot });
    expect(stagedFiles.stdout.trim()).toBe("harness-codex/harness.txt");
  });

  test("somente inspeciona e preserva o branch de um repositório próprio", async () => {
    const protectedRoot = await mkdtemp(path.join(os.tmpdir(), "harness protected "));
    const workspace = path.join(protectedRoot, "pulsar-app");
    await mkdir(workspace);
    await runProcess(["git", "init", "-b", "main"], { cwd: workspace });
    const git = await inspectGitWorkspace(workspace, protectedRoot);
    expect(git.branch).toBe("main");
    expect(git.sharedWithProtectedRoot).toBe(false);
    const head = await runProcess(["git", "symbolic-ref", "--short", "HEAD"], { cwd: workspace });
    expect(head.stdout.trim()).toBe("main");
  });

  test("faz checkpoint sem criar branch em repositório próprio", async () => {
    const protectedRoot = await mkdtemp(path.join(os.tmpdir(), "harness protected "));
    const workspace = path.join(protectedRoot, "pulsar-app");
    await mkdir(workspace);
    await runProcess(["git", "init", "-b", "main"], { cwd: workspace });
    await runProcess(["git", "config", "user.name", "Harness Test"], { cwd: workspace });
    await runProcess(["git", "config", "user.email", "harness@example.invalid"], { cwd: workspace });
    await writeFile(path.join(workspace, "app.txt"), "initial\n");
    await runProcess(["git", "add", "app.txt"], { cwd: workspace });
    await runProcess(["git", "commit", "-m", "initial"], { cwd: workspace });

    await writeFile(path.join(workspace, "app.txt"), "changed\n");
    const checkpoint = await checkpointFiles({
      workspace, protectedRoot, runId: "run-test", taskId: "task-001", files: ["app.txt"],
    });
    expect(checkpoint.committed).toBe(true);
    expect((await inspectGitWorkspace(workspace)).branch).toBe("main");
    const branches = await runProcess(["git", "branch", "--format=%(refname:short)"], { cwd: workspace });
    expect(branches.stdout.trim()).toBe("main");
  });

  test("reconhece worktree vinculado como o mesmo repositório sem trocar branch", async () => {
    const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), "pulsar worktree "));
    const harnessRoot = path.join(repositoryRoot, "harness-codex");
    const applicationDirectory = path.join(repositoryRoot, "pulsar-codex");
    const linkedRoot = `${repositoryRoot}-linked`;
    await mkdir(harnessRoot);
    await mkdir(applicationDirectory);
    await runProcess(["git", "init", "-b", "main"], { cwd: repositoryRoot });
    await runProcess(["git", "config", "user.name", "Harness Test"], { cwd: repositoryRoot });
    await runProcess(["git", "config", "user.email", "harness@example.invalid"], { cwd: repositoryRoot });
    await writeFile(path.join(applicationDirectory, "app.txt"), "initial\n");
    await runProcess(["git", "add", "."], { cwd: repositoryRoot });
    await runProcess(["git", "commit", "-m", "initial"], { cwd: repositoryRoot });
    await runProcess(["git", "worktree", "add", "-b", "0-setup", linkedRoot], { cwd: repositoryRoot });

    const linkedWorkspace = path.join(linkedRoot, "pulsar-codex");
    const git = await inspectGitWorkspace(linkedWorkspace, harnessRoot);

    expect(git.sharedWithProtectedRoot).toBe(true);
    expect(git.linkedWorktree).toBe(true);
    expect(git.branch).toBe("0-setup");
    expect((await inspectGitWorkspace(applicationDirectory)).branch).toBe("main");
  });
});
