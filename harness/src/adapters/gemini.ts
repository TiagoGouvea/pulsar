// Google models via Antigravity CLI `agy` 1.4.0 (`agy --help`, `agy models`).
// `-p --output-format json` returns {status, response, usage{input_tokens, output_tokens, cache_read_tokens}}.
// Auth is the agy login (no API key); no cost is reported, so billing is "subscription" in the config.
import { cliAdapter, withAttachments } from "./exec.js";

export const gemini = cliAdapter({
  bin: "agy",
  args: (spec, run) => ["-p", withAttachments(run), "--model", spec.model, "--output-format", "json", "--dangerously-skip-permissions"],
  parse(stdout) {
    const r = JSON.parse(stdout.slice(stdout.indexOf("{")));
    const u = r.usage ?? {};
    return {
      finalText: String(r.response ?? ""),
      isError: r.status !== "SUCCESS",
      usage: { inputTokens: u.input_tokens ?? 0, outputTokens: (u.output_tokens ?? 0) + (u.thinking_tokens ?? 0), cachedTokens: u.cache_read_tokens ?? 0 },
    };
  },
});
