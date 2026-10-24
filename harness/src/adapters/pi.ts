// Tested with pi 1.2.0 (`pi --help`, docs/json.md): `--mode json` emits JSONL session events.
// OpenRouter models: "openrouter/<id>". Local LM Studio: "lmstudio/<id>" (custom provider in ~/.pi/agent/models.json).
import { cliAdapter, jsonLines } from "./exec.js";

export const pi = cliAdapter({
  bin: "pi",
  args: (spec, run) => [
    "-p", "--mode", "json", "--model", spec.model, "--no-session", "--no-mcp", "--no-approve",
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
    if (!spec.model.startsWith("lmstudio/")) return true;
    try {
      const r = await fetch(`${env.LMSTUDIO_BASE_URL ?? "http://localhost:1234/v1"}/models`, { signal: AbortSignal.timeout(3000) });
      const ids: string[] = ((await r.json()) as any).data?.map((m: any) => m.id) ?? [];
      return ids.includes(spec.model.slice("lmstudio/".length));
    } catch {
      return false;
    }
  },
});
