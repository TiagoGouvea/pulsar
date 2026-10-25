import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { redact } from "../security/redaction.js";

export interface ProcessResult {
  command: string[];
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export async function runProcess(
  command: string[],
  options: { cwd: string; timeoutMs?: number; env?: NodeJS.ProcessEnv; outputPath?: string; redactPatterns?: string[] },
): Promise<ProcessResult> {
  if (command.length === 0 || !command[0]) throw new Error("Comando vazio.");
  const started = performance.now();
  return new Promise((resolve, reject) => {
    const executable = command[0];
    if (!executable) { reject(new Error("Comando vazio.")); return; }
    const child = spawn(executable, command.slice(1), {
      cwd: options.cwd,
      env: options.env ?? process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.on("error", reject);
    const timer = options.timeoutMs ? setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => { if (!child.killed) child.kill("SIGKILL"); }, 3_000).unref();
    }, options.timeoutMs) : undefined;
    child.on("close", (exitCode, signal) => {
      if (timer) clearTimeout(timer);
      const result = {
        command,
        exitCode,
        signal,
        stdout: redact(stdout, options.redactPatterns),
        stderr: redact(stderr, options.redactPatterns),
        durationMs: Math.round(performance.now() - started),
        timedOut,
      };
      if (options.outputPath) {
        const outputPath = options.outputPath;
        void mkdir(path.dirname(outputPath), { recursive: true })
          .then(() => writeFile(outputPath, `${result.stdout}\n${result.stderr}`, { mode: 0o600 }))
          .then(() => resolve(result), reject);
      } else {
        resolve(result);
      }
    });
  });
}

export async function commandAvailable(command: string): Promise<boolean> {
  const result = await runProcess(["/usr/bin/env", "which", command], { cwd: process.cwd(), timeoutMs: 2_000 });
  return result.exitCode === 0;
}
