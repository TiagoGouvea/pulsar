import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { firebaseProjectChecks, gitWorkspaceChecks } from "../../src/preflight/doctor.js";
import { runProcess } from "../../src/utils/process.js";
import { createTestConfig } from "../helpers/config.js";

afterEach(() => vi.unstubAllEnvs());

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

describe("preflight Firebase", () => {
  test("exige emuladores locais e confere infraestrutura de testes das Rules", async () => {
    const workspace = await mkdtemp(path.join(os.tmpdir(), "firebase-preflight-"));
    await writeFile(path.join(workspace, "firebase.json"), JSON.stringify({
      firestore: { rules: "firestore.rules" },
      emulators: { auth: { port: 9099 }, firestore: { port: 8080 }, ui: { enabled: false } },
    }));
    await writeFile(path.join(workspace, "firestore.rules"), "rules_version = '2';\n");
    await writeFile(path.join(workspace, "package.json"), JSON.stringify({
      scripts: { "test:rules": "firebase emulators:exec" },
      devDependencies: { "@firebase/rules-unit-testing": "^4.0.0" },
    }));
    const config = await createTestConfig(workspace);
    config.project.workspace = workspace;
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "localhost:9099");

    const checks = await firebaseProjectChecks(config);

    expect(checks.find((check) => check.id === "firebase.emulators")?.status).toBe("pass");
    expect(checks.find((check) => check.id === "firebase.rules-file")?.status).toBe("pass");
    expect(checks.find((check) => check.id === "firebase.rules-tests")?.status).toBe("pass");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "production.example:443");
    expect((await firebaseProjectChecks(config)).find((check) => check.id === "firebase.firestore-endpoint")?.status).toBe("block");
  });
});
