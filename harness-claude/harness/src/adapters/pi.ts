// Tested with pi 1.2.0 (`pi --help`, docs/json.md): `--mode json` emits JSONL session events.
// OpenRouter models: "openrouter/<id>". Local LM Studio: "lmstudio/<key>" (provider generated in .harness/pi-agent/models.json);
// the model is loaded alone before the call and unloaded after it (lmstudio.ts).
import { readFileSync } from "node:fs";
import { cliAdapter, jsonLines } from "./exec.js";
import type { WorkerAdapter } from "./types.js";
import { isLocal, listModels, lmKey, loadOnly, unload } from "./lmstudio.js";

const base = cliAdapter({
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

/** pi prices calls from its own table (off by up to 2x); OpenRouter's generation API has the billed cost. */
export async function openrouterCost(stdout: string, key: string | undefined): Promise<number | undefined> {
  const ids = jsonLines(stdout).filter((e) => e.type === "message_end" && e.message?.role === "assistant" && e.message.provider === "openrouter").map((e) => String(e.message.responseId ?? ""));
  if (!key || !ids.length || ids.some((id) => !id.startsWith("gen-"))) return undefined;
  const one = async (id: string) => {
    for (let i = 0; i < 5; i++) {   // stats show up a few seconds after the generation
      const r = await fetch(`https://openrouter.ai/api/v1/generation?id=${id}`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10_000) }).catch(() => undefined);
      const cost = r?.ok ? Number((await r.json() as any).data?.total_cost) : NaN;
      if (Number.isFinite(cost)) return cost;
      await new Promise((ok) => setTimeout(ok, 2000 * (i + 1)));
    }
    throw new Error(`custo da geração ${id} indisponível`);
  };
  return Promise.all(ids.map(one)).then((cs) => cs.reduce((a, c) => a + c, 0), () => undefined);
}

export const pi: WorkerAdapter = {
  ...base,
  async run(spec, run, opts) {
    const r = await base.run(spec, run, opts);
    const billed = isLocal(spec) ? undefined : await openrouterCost(readFileSync(opts.transcriptPath, "utf8"), opts.env.OPENROUTER_API_KEY);
    return billed === undefined ? r : { ...r, usage: { ...r.usage, costUsd: billed } };
  },
};
