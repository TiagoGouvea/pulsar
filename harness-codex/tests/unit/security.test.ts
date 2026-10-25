import { mkdtemp, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { redact } from "../../src/security/redaction.js";
import { runProcess } from "../../src/utils/process.js";

describe("segurança", () => {
  test("redige credenciais", () => {
    expect(redact("OPENROUTER_API_KEY=sk-example-secret-value")).not.toContain("secret-value");
    expect(redact("Authorization: Bearer abcdefghijklmnop")).toContain("[REDACTED]");
  });

  test("argumentos e cwd com espaços não passam por shell", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "harness path ; touch nope "));
    const result = await runProcess(["node", "-e", "process.stdout.write(process.cwd())"], { cwd });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(await realpath(cwd));
  });
});
