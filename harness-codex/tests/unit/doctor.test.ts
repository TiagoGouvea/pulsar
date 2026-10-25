import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { gitWorkspaceChecks } from "../../src/preflight/doctor.js";
import { runProcess } from "../../src/utils/process.js";
import { createTestConfig } from "../helpers/config.js";

describe("doctor Git", () => {
  test("reconhece monorepo compartilhado e branch manual", async () => {
    const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), "doctor-monorepo-"));
    const harnessRoot = path.join(repositoryRoot, "harness-codex");
    const workspace = path.join(repositoryRoot, "pulsar-codex");
    await mkdir(harnessRoot);
    await mkdir(workspace);
    await runProcess(["git", "init", "-b", "0-setup"], { cwd: repositoryRoot });
    await writeFile(path.join(workspace, "README.md"), "# App\n");
    const config = await createTestConfig(harnessRoot);
    config.project.workspace = workspace;

    const checks = await gitWorkspaceChecks(config, harnessRoot);

    expect(checks.find((check) => check.id === "git.repository")?.status).toBe("pass");
    expect(checks.find((check) => check.id === "git.shared-repository")?.status).toBe("pass");
    expect(checks.find((check) => check.id === "git.worktree")?.status).toBe("pass");
    expect(checks.find((check) => check.id === "git.branch")?.evidence).toBe("0-setup");
    expect(checks.find((check) => check.id === "git.branch-policy")?.status).toBe("pass");
  });
});
