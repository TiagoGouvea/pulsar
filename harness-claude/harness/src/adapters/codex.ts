// Tested with codex-cli 0.163.0 (`codex exec --help`): --json emits JSONL events.
import { cliAdapter, jsonLines } from "./exec.js";

export function parseCodex(stdout: string) {
  const evs = jsonLines(stdout);
  const msgs = evs.filter((e) => e.type === "item.completed" && e.item?.type === "agent_message");
  const usage = evs.filter((e) => e.type === "turn.completed").reduce(
    (a, e) => ({
      // input_tokens already includes cached_input_tokens: bill only the uncached part at full price
      inputTokens: a.inputTokens + (e.usage?.input_tokens ?? 0) - (e.usage?.cached_input_tokens ?? 0),
      outputTokens: a.outputTokens + (e.usage?.output_tokens ?? 0),
      cachedTokens: a.cachedTokens + (e.usage?.cached_input_tokens ?? 0),
    }),
    { inputTokens: 0, outputTokens: 0, cachedTokens: 0 },
  );
  return {
    finalText: String(msgs.at(-1)?.item?.text ?? ""),
    isError: evs.some((e) => e.type === "turn.failed" || e.type === "error"),
    usage,
  };
}

export const codex = cliAdapter({
  bin: "codex",
  args: (spec, run) => [
    "exec", "--json", "-m", spec.model, "-s", "workspace-write", "-C", run.cwd, "--skip-git-repo-check", "--ephemeral",
    ...(run.attachments ?? []).flatMap((a) => ["-i", a]), "--", run.prompt,
  ],
  parse: parseCodex,
});
