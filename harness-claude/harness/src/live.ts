// harness watch: one glyph per transcript event of the model calls in progress (pi, codex and claude stream formats).
import { closeSync, existsSync, openSync, readdirSync, readSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "./config.js";
import { fmtDur } from "./logger.js";
import { hp, loadState } from "./state.js";

/** · model turn, T tool call, ✎ file edit, ✓/✗ tool result, ! error. */
export function glyphs(line: string): string {
  let e: any;
  try { e = JSON.parse(line); } catch { return ""; }
  const edit = (name: string) => /^(edit|write|multiedit|apply_patch)$/i.test(name);
  switch (e.type) {
    // pi
    case "turn_start": return "·";
    case "tool_execution_start": return edit(e.toolName ?? "") ? "✎" : "T";
    case "tool_execution_end": return e.isError ? "✗" : "✓";
    // codex
    case "item.started": return e.item?.type === "file_change" ? "✎" : e.item?.type === "command_execution" ? "T" : "";
    case "item.completed":
      if (e.item?.type === "agent_message") return "·";
      if (e.item?.type === "error") return "!";
      if (e.item?.type === "command_execution" || e.item?.type === "file_change") return e.item.status === "failed" ? "✗" : "✓";
      return "";
    case "turn.failed": case "error": return "!";
    // claude stream-json
    case "assistant": {
      const parts: any[] = e.message?.content ?? [];
      return (parts.some((p) => p.type === "text" || p.type === "thinking") ? "·" : "") +
        parts.filter((p) => p.type === "tool_use").map((p) => (edit(p.name ?? "") ? "✎" : "T")).join("");
    }
    case "user": return ((e.message?.content ?? []) as any[]).filter((p) => p.type === "tool_result").map((p) => (p.is_error ? "✗" : "✓")).join("");
    default: return "";
  }
}

interface Call { tag: string; path: string; pos: number; rest: string; start: number; last: number; n: Record<string, number>; warned: number }

/** Calls whose prompt was written but whose result was not (yet): `<attempt>-<role>-<worker>` under runs/<feature>/. */
function activeCalls(ctx: Ctx): { tag: string; path: string; start: number }[] {
  const runs = hp(ctx, "runs"), out: { tag: string; path: string; start: number }[] = [];
  if (!existsSync(runs)) return out;
  const recent = Date.now() - 3 * 3600_000;
  for (const f of readdirSync(runs)) {
    const dir = join(runs, f);
    if (!statSync(dir).isDirectory()) continue;
    for (const p of readdirSync(dir).filter((x) => x.endsWith(".prompt.md"))) {
      const base = p.slice(0, -".prompt.md".length), prompt = statSync(join(dir, p)).mtimeMs;
      const res = join(dir, `${base}.result.json`);
      if (prompt < recent || (existsSync(res) && statSync(res).mtimeMs >= prompt)) continue;
      const [attempt, role, ...worker] = base.split("-");   // roles use "_", worker ids may contain "-"
      out.push({ tag: `${f} ${role} ${worker.join("-")} t${attempt}`, path: join(dir, `${base}.jsonl`), start: prompt });
    }
  }
  return out;
}

function readNew(c: Call): string {
  if (!existsSync(c.path)) return "";
  const size = statSync(c.path).size;
  if (size < c.pos) { c.pos = 0; c.rest = ""; }   // rewritten from scratch
  if (size === c.pos) return "";
  const buf = Buffer.alloc(size - c.pos), fd = openSync(c.path, "r");
  readSync(fd, buf, 0, buf.length, c.pos);
  closeSync(fd);
  c.pos = size;
  c.last = statSync(c.path).mtimeMs;
  const lines = (c.rest + buf.toString()).split("\n");
  c.rest = lines.pop()!;
  return lines.map(glyphs).join("");
}

// no .jsonl while running: worker started by a harness older than transcript streaming
const summary = (c: Call) => !existsSync(c.path) ? `${fmtDur(Date.now() - c.start)} · sem transcript ao vivo (processo iniciado antes do streaming)` : `${fmtDur(Date.now() - c.start)} · T${(c.n.T ?? 0) + (c.n["✎"] ?? 0)} ✓${c.n["✓"] ?? 0} ✗${c.n["✗"] ?? 0} · último evento ${fmtDur(Date.now() - c.last)} atrás`;

/** Live view for `harness watch`: called every second, prints through `out` (glyphs stay on one line per call). */
export function liveTicker(ctx: Ctx, out: (s: string) => void) {
  const calls = new Map<string, Call>();
  let lineOf = "", lastSummary = Date.now(), idleSince = 0, idleShown = 0;
  const newline = () => { if (lineOf) { out("\n"); lineOf = ""; } };
  return {
    /** A console.log line is about to be printed. */
    breakLine: newline,
    tick() {
      const now = Date.now();
      const active = activeCalls(ctx);
      for (const a of active) {
        if (calls.has(a.path)) continue;
        const c: Call = { ...a, pos: 0, rest: "", last: existsSync(a.path) ? statSync(a.path).mtimeMs : a.start, n: {}, warned: 0 };
        calls.set(a.path, c);
        newline();
        out(`⋯ ${c.tag} · iniciada há ${fmtDur(now - c.start)}\n`);
      }
      for (const [k, c] of calls) {
        if (!active.some((a) => a.path === k)) { calls.delete(k); continue; }   // the console line reports the end
        const g = readNew(c);
        for (const ch of g) c.n[ch] = (c.n[ch] ?? 0) + 1;
        const shown = g.length > 400 ? `…${g.slice(-400)}` : g;   // first read of a long-running call
        if (shown) {
          if (lineOf !== k) { newline(); out(calls.size > 1 ? `  ${c.tag.split(" ")[0]} ` : "  "); lineOf = k; }
          out(shown);
        }
        if (existsSync(c.path) && now - c.last > 5 * 60_000 && now - c.warned > 5 * 60_000) { c.warned = now; newline(); out(`⚠ ${c.tag} sem eventos há ${fmtDur(now - c.last)}\n`); }
      }
      if (calls.size && now - lastSummary >= 60_000) {
        lastSummary = now;
        newline();
        for (const c of calls.values()) out(`  ${c.tag} · ${summary(c)}\n`);
      }
      // between model calls: gates, reviews' setup, merge
      const running = ["INIT", "STAGE_RUNNING", "STAGE_GATES"].includes(loadState(ctx)?.phase ?? "");
      if (calls.size || !running) { idleSince = idleShown = 0; return; }
      idleSince ||= now;
      if (now - idleSince >= 20_000 && now - idleShown >= 60_000) { idleShown = now; newline(); out(`⋯ sem chamada de modelo há ${fmtDur(now - idleSince)} (gates, autofix ou merge)\n`); }
    },
  };
}
