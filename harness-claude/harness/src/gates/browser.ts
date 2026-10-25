// Shared browser plumbing for G8/G9/G10/G12 and screenshots. Playwright is loaded from the APP's
// node_modules (the app already depends on it for e2e), so the harness itself stays light.
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { execa } from "execa";
import type { Ctx } from "../config.js";
import { baseEnv } from "../adapters/exec.js";

export const VIEWPORTS = { mobile: { width: 375, height: 812 }, desktop: { width: 1280, height: 800 } } as const;
export interface AppRoute { path: string; name: string; tags?: string[]; setup?: string }

export function appRequire(appAbs: string) {
  return createRequire(join(appAbs, "package.json"));
}

export function loadPlaywright(appAbs: string): any {
  const req = appRequire(appAbs);
  for (const m of ["playwright", "@playwright/test"]) {
    try { return req(m); } catch { /* next */ }
  }
  throw new Error("playwright não está instalado no app (dependência obrigatória da etapa 0)");
}

export function readRoutes(ctx: Ctx, appAbs: string): AppRoute[] {
  const f = join(appAbs, ctx.config.browser.routesFile);
  if (!existsSync(f)) throw new Error(`${ctx.config.browser.routesFile} não existe no app (o inicializador deve criá-lo)`);
  return JSON.parse(readFileSync(f, "utf8"));
}

/** Gate env: only public Firebase config; emulators never need secrets. */
export const gateEnv = (ctx: Ctx) => baseEnv(Object.fromEntries(
  ["FIREBASE_PROJECT_ID", "FIREBASE_WEB_CONFIG_JSON"].flatMap((k) => (ctx.env[k] ? [[k, ctx.env[k]!]] : [])),
));

/** Starts the app server (emulators + seed + preview), waits for baseUrl, runs fn, kills the process tree. */
export async function withServer<T>(ctx: Ctx, appAbs: string, fn: (baseUrl: string) => Promise<T>): Promise<T> {
  const { serveCmd, baseUrl, readyTimeoutSec } = ctx.config.browser;
  const child = execa(serveCmd, { shell: true, cwd: appAbs, env: gateEnv(ctx), extendEnv: false, detached: true, reject: false, stdio: "ignore" });
  let exited = false;
  child.then(() => { exited = true; });
  try {
    const deadline = Date.now() + readyTimeoutSec * 1000;
    for (;;) {
      try { if ((await fetch(baseUrl, { signal: AbortSignal.timeout(2000) })).ok) break; } catch { /* not yet */ }
      if (Date.now() > deadline || exited) throw new Error(`servidor não respondeu em ${baseUrl} (${serveCmd})`);
      await new Promise((r) => setTimeout(r, 1000));
    }
    return await fn(baseUrl);
  } finally {
    try { process.kill(-child.pid!, "SIGTERM"); } catch { /* gone */ }
  }
}

export async function withBrowser<T>(appAbs: string, fn: (browser: any) => Promise<T>): Promise<T> {
  const browser = await loadPlaywright(appAbs).chromium.launch();
  try { return await fn(browser); } finally { await browser.close(); }
}

/** Opens each route on each viewport and calls fn(page, route, viewportName). */
export async function forEachPage(appAbs: string, baseUrl: string, routes: AppRoute[], viewports: Record<string, { width: number; height: number }>, fn: (page: any, r: AppRoute, vp: string) => Promise<void>) {
  await withBrowser(appAbs, async (browser) => {
    for (const [vp, size] of Object.entries(viewports)) {
      const page = await (await browser.newContext({ viewport: size })).newPage();
      for (const r of routes) {
        await page.goto(new URL(r.path, baseUrl).href, { waitUntil: "networkidle" });
        await fn(page, r, vp);
      }
      await page.context().close();
    }
  });
}
