import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { execa } from "execa";
import type { RunOpts, Usage, WorkerAdapter, WorkerResult, WorkerRun, WorkerSpec } from "./types.js";

/** Minimal environment for subprocesses: no inherited secrets, only what the orchestrator injects. */
export function baseEnv(extra: Record<string, string> = {}): Record<string, string> {
  const keep = ["HOME", "USER", "LANG", "TMPDIR", "SHELL", "LOGNAME"];
  const env: Record<string, string> = Object.fromEntries(keep.filter((k) => process.env[k]).map((k) => [k, process.env[k]!]));
  env.PATH = [join(homedir(), ".local/bin"), process.env.PATH].join(":");
  return { ...env, CI: "1", TERM: "dumb", ...extra };
}

/** Runs a command killing the whole process tree on timeout. */
export async function runProcess(bin: string, args: string[], o: { cwd: string; env: Record<string, string>; timeoutMs: number; shell?: boolean }) {
  const start = Date.now();
  let timedOut = false;
  const child = execa(bin, args, {
    cwd: o.cwd, env: o.env, extendEnv: false, reject: false, detached: true, stdin: "ignore",
    shell: o.shell, maxBuffer: 256 * 1024 * 1024, all: true,
  });
  const kill = (sig: NodeJS.Signals) => { try { process.kill(-child.pid!, sig); } catch { /* already gone */ } };
  const timer = setTimeout(() => { timedOut = true; kill("SIGTERM"); setTimeout(() => kill("SIGKILL"), 5000).unref(); }, o.timeoutMs);
  const res = await child;
  clearTimeout(timer);
  return { stdout: String(res.stdout ?? ""), stderr: String(res.stderr ?? ""), all: String(res.all ?? ""), exitCode: res.exitCode ?? -1, timedOut, durationMs: Date.now() - start };
}

/** Shared adapter for every agent CLI: each CLI only declares how to build args and parse output. */
export function cliAdapter(def: {
  bin: string;
  args(spec: WorkerSpec, run: WorkerRun): string[];
  parse(stdout: string): { finalText: string; usage: Usage; isError?: boolean };
  available?: WorkerAdapter["available"];
  prepare?: WorkerAdapter["prepare"];
  release?: WorkerAdapter["release"];
}): WorkerAdapter {
  return {
    available: def.available,
    prepare: def.prepare,
    release: def.release,
    async run(spec, run, opts: RunOpts): Promise<WorkerResult> {
      const p = await runProcess(def.bin, def.args(spec, run), { cwd: run.cwd, env: baseEnv(opts.env), timeoutMs: spec.timeoutMin * 60_000 });
      mkdirSync(dirname(opts.transcriptPath), { recursive: true });
      writeFileSync(opts.transcriptPath, p.stdout);
      if (p.stderr) writeFileSync(opts.transcriptPath.replace(/\.jsonl$/, ".stderr.log"), p.stderr);
      let parsed: ReturnType<typeof def.parse>;
      try { parsed = def.parse(p.stdout); } catch { parsed = { finalText: p.stdout.slice(-4000), usage: { inputTokens: 0, outputTokens: 0 }, isError: true }; }
      return {
        ok: !p.timedOut && p.exitCode === 0 && !parsed.isError,
        exitCode: p.exitCode, timedOut: p.timedOut, finalText: parsed.finalText, usage: parsed.usage,
        durationMs: p.durationMs, transcriptPath: opts.transcriptPath,
      };
    },
  };
}

export const jsonLines = (s: string) => s.split("\n").flatMap((l) => {
  try { return l.trim() ? [JSON.parse(l)] : []; } catch { return []; }
});

export const lmstudioUrl = (env: Record<string, string | undefined>) => env.LMSTUDIO_BASE_URL ?? "http://localhost:1235/v1";

/** Images are referenced in the prompt for CLIs that read files themselves. */
export const withAttachments = (run: WorkerRun) =>
  run.attachments?.length ? `${run.prompt}\n\nImagens anexadas (leia cada uma):\n${run.attachments.map((a) => `- ${a}`).join("\n")}` : run.prompt;
