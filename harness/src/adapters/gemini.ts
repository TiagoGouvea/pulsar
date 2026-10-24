// Gemini CLI NOT installed on this machine when written (npm @google/gemini-cli 0.65.0 is the latest).
// Flags follow the official docs: -p (non-interactive), --output-format json, --yolo (auto-approve tools).
// Run `gemini --help` after installing and adjust if needed.
import { cliAdapter } from "./exec.js";

export const gemini = cliAdapter({
  bin: "gemini",
  args: (spec, run) => [
    "-p", [run.prompt, ...(run.attachments ?? []).map((a) => `@${a}`)].join("\n"),
    "-m", spec.model, "--output-format", "json", "--yolo",
  ],
  parse(stdout) {
    const r = JSON.parse(stdout.slice(stdout.indexOf("{")));
    const models = Object.values<any>(r.stats?.models ?? {});
    const sum = (k: string) => models.reduce((a, m) => a + (m.tokens?.[k] ?? 0), 0);
    return {
      finalText: String(r.response ?? ""),
      isError: Boolean(r.error),
      usage: { inputTokens: sum("prompt"), outputTokens: sum("candidates"), cachedTokens: sum("cached") },
    };
  },
});
