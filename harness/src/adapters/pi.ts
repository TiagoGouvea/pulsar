// Tested with pi 1.2.0 (`pi --help`, docs/json.md): `--mode json` emits JSONL session events.
// OpenRouter models: "openrouter/<id>". Local LM Studio: "lmstudio/<key>" (provider generated in .harness/pi-agent/models.json);
// the model is loaded alone before the call and unloaded after it (lmstudio.ts).
import { cliAdapter, jsonLines } from "./exec.js";
import { isLocal, listModels, lmKey, loadOnly, unload } from "./lmstudio.js";

export const pi = cliAdapter({
  bin: "pi",
  args: (spec, run) => [
    "-p", "--mode", "json", ...(isLocal(spec) ? ["--provider", "lmstudio", "--model", lmKey(spec)] : ["--model", spec.model]),
    "--no-session", "--no-mcp", "--no-approve",
    ...(run.attachments ?? []).map((a) => `@${a}`), "--", run.prompt,
  ],
  parse(stdout) {
    const evs = jsonLines(stdout);
    const assistant = evs.filter((e) => e.type === "message_end" && e.message?.role === "assistant").map((e) => e.message);
    const last = assistant.at(-1);
    const text = Array.isArray(last?.content)
      ? last.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n")
      : String(last?.content ?? "");
    const usage = assistant.reduce(
      (a, m) => ({
        inputTokens: a.inputTokens + (m.usage?.input ?? 0),
        outputTokens: a.outputTokens + (m.usage?.output ?? 0),
        cachedTokens: a.cachedTokens + (m.usage?.cacheRead ?? 0),
        costUsd: a.costUsd + (m.usage?.cost?.total ?? 0),
      }),
      { inputTokens: 0, outputTokens: 0, cachedTokens: 0, costUsd: 0 },
    );
    return {
      finalText: text,
      isError: last?.stopReason === "error" || evs.some((e) => e.type === "agent_settled" && e.aborted),
      usage: { ...usage, costUsd: usage.costUsd || undefined },
    };
  },
  async available(spec, env) {
    if (!isLocal(spec)) return true;
    return listModels(env).then((ms) => ms.some((m) => m.key === lmKey(spec)), () => false);
  },
  prepare: (spec, env) => (isLocal(spec) ? loadOnly(spec, env).catch((e) => String(e.message)) : Promise.resolve(null)),
  release: async (spec, env) => { if (isLocal(spec)) await unload(spec, env); },
});
