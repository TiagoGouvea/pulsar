// Shared browser plumbing for G8/G9/G10/G12 and screenshots. Playwright is loaded from the APP's
// node_modules (the app already depends on it for e2e), so the harness itself stays light.
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, sep } from "node:path";
import { execa } from "execa";
import type { Ctx } from "../config.js";
import { baseEnv } from "../adapters/exec.js";
import { mutex } from "../state.js";

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

const portQueue = mutex();

/** Holds the ports lock (in-process queue + lock dir shared with the workers' port-lock.sh); orphan servers of worktrees are killed first. */
export const withPortLock = <T>(ctx: Ctx, appAbs: string, fn: () => Promise<T>): Promise<T> => portQueue(async () => {
  const lock = ctx.config.browser.portLock;
  for (;;) {
    try { mkdirSync(lock); break; } catch { /* held */ }
    try { if (Date.now() - statSync(lock).mtimeMs > 30 * 60_000) rmSync(lock, { recursive: true, force: true }); } catch { /* released meanwhile */ }
    await new Promise((r) => setTimeout(r, 2000));
  }
  try {
    await killOrphans(ctx, appAbs);
    return await fn();
  } finally {
    rmSync(lock, { recursive: true, force: true });
  }
});

/** Servers still listening on the app ports from a harness worktree are leftovers (the lock is ours). */
async function killOrphans(ctx: Ctx, appAbs: string) {
  const fb = existsSync(join(appAbs, "firebase.json")) ? JSON.parse(readFileSync(join(appAbs, "firebase.json"), "utf8")).emulators ?? {} : {};
  const ports = [new URL(ctx.config.browser.baseUrl).port, ...Object.values<any>(fb).map((e) => e?.port)].filter(Boolean);
  for (const port of ports) {
    const pids = (await execa("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"], { reject: false })).stdout.split("\n").filter(Boolean);
    for (const pid of pids) {
      const cwd = (await execa("lsof", ["-a", "-p", pid, "-d", "cwd", "-Fn"], { reject: false })).stdout.split("\n").find((l) => l.startsWith("n"))?.slice(1) ?? "";
      if (cwd.includes(`${sep}.worktrees${sep}`)) try { process.kill(Number(pid), "SIGKILL"); } catch { /* gone */ }
    }
  }
}

export function readRoutes(ctx: Ctx, appAbs: string): AppRoute[] {
  const f = join(appAbs, ctx.config.browser.routesFile);
  if (!existsSync(f)) throw new Error(`${ctx.config.browser.routesFile} não existe no app (o inicializador deve criá-lo)`);
  return JSON.parse(readFileSync(f, "utf8"));
}

/** Gate env: only public Firebase config; emulators never need secrets. */
export const gateEnv = (ctx: Ctx) => baseEnv(Object.fromEntries(
  [...["FIREBASE_PROJECT_ID", "FIREBASE_WEB_CONFIG_JSON"].flatMap((k) => (ctx.env[k] ? [[k, ctx.env[k]!]] : [])), ["HARNESS_PORT_LOCK_HELD", "1"]],
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
