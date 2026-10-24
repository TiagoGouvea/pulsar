import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { checkpointFiles, prepareExecutionBranch } from "../../src/git/workspace.js";
import { runProcess } from "../../src/utils/process.js";

describe("workspace Git", () => {
  test("permite branch e checkpoint em repositório próprio abaixo do diretório protegido", async () => {
    const protectedRoot = await mkdtemp(path.join(os.tmpdir(), "harness protected "));
    const workspace = path.join(protectedRoot, "pulsar-app");
    await mkdir(workspace);
    await runProcess(["git", "init", "-b", "main"], { cwd: workspace });
    await runProcess(["git", "config", "user.name", "Harness Test"], { cwd: workspace });
    await runProcess(["git", "config", "user.email", "harness@example.invalid"], { cwd: workspace });
    await writeFile(path.join(workspace, "app.txt"), "initial\n");
    await runProcess(["git", "add", "app.txt"], { cwd: workspace });
    await runProcess(["git", "commit", "-m", "initial"], { cwd: workspace });

    const branch = await prepareExecutionBranch(workspace, "run-test", protectedRoot);
    expect(branch).toEqual({ status: "created", detail: "harness/run-test" });

    await writeFile(path.join(workspace, "app.txt"), "changed\n");
    const checkpoint = await checkpointFiles({
      workspace, protectedRoot, runId: "run-test", taskId: "task-001", files: ["app.txt"],
    });
    expect(checkpoint.committed).toBe(true);
  });
});
