// Tested with Claude Code 2.1.310 (`claude --help`). Also used for GLM via ANTHROPIC_BASE_URL (Z.ai).
import { cliAdapter, withAttachments } from "./exec.js";

/** Headless permissions: broad inside the worktree, no .env/secrets, no push/commit/deploy. */
const settings = JSON.stringify({
  permissions: {
    allow: ["Read", "Edit", "Write", "Glob", "Grep", "Bash(yarn *)", "Bash(npx *)", "Bash(npm *)", "Bash(node *)",
      "Bash(ls *)", "Bash(mkdir *)", "Bash(cat *)", "Bash(git status*)", "Bash(git diff*)", "Bash(git log*)"],
    deny: ["Read(./.env)", "Read(./.env.*)", "Read(./secrets/**)", "Read(../**)", "Edit(../**)", "Write(../**)",
      "Bash(git push*)", "Bash(git commit*)", "Bash(git checkout*)", "Bash(firebase deploy*)", "WebFetch"],
  },
});

export const claudeCode = cliAdapter({
  bin: "claude",
  args: (spec, run) => [
    "-p", withAttachments(run), "--output-format", "json", "--model", spec.model,
    "--permission-mode", "dontAsk", "--settings", settings, "--setting-sources", "project",
    "--strict-mcp-config", "--no-session-persistence",
  ],
  parse(stdout) {
    const r = JSON.parse(stdout.trim().split("\n").pop()!);
    const u = r.usage ?? {};
    return {
      finalText: String(r.result ?? ""),
      isError: Boolean(r.is_error),
      usage: {
        inputTokens: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
        outputTokens: u.output_tokens ?? 0,
        cachedTokens: u.cache_read_input_tokens ?? 0,
        costUsd: typeof r.total_cost_usd === "number" ? r.total_cost_usd : undefined,
      },
    };
  },
});
