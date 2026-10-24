import type { Ctx } from "./config.js";
import { log } from "./logger.js";

/** Generic webhook: POST {event, project, message, data, ts}. Never throws. */
export async function notify(ctx: Ctx, event: string, message: string, data: Record<string, unknown> = {}) {
  log(`[notify:${event}] ${message}`);
  const url = ctx.env[ctx.config.notify.webhookEnv];
  if (!url || !ctx.config.notify.events.includes(event)) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, project: ctx.config.project.name, message, data, ts: new Date().toISOString() }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    log(`webhook falhou: ${(e as Error).message}`);
  }
}
