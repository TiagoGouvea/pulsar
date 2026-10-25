// Screenshots of every route x viewport x privacy mode (for the UI evaluator and checkpoints).
// Pixel regression (G11) is the app's own Playwright toHaveScreenshot suite (command gate); its
// baseline is only updated after a stage is approved (updateCmd).
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "../config.js";
import { type AppRoute, forEachPage, readRoutes, VIEWPORTS, withServer } from "./browser.js";

/** The app exposes the privacy toggle as [data-testid=eye-toggle]; private mode is the default. */
export async function captureScreens(ctx: Ctx, appAbs: string, outDir: string, filter?: (r: AppRoute) => boolean): Promise<string[]> {
  mkdirSync(outDir, { recursive: true });
  const shots: string[] = [];
  const routes = readRoutes(ctx, appAbs).filter(filter ?? (() => true));
  await withServer(ctx, appAbs, (url) => forEachPage(appAbs, url, routes, VIEWPORTS, async (page, r, vp) => {
    for (const mode of ["privado", "nomes"]) {
      if (mode === "nomes") await page.locator("[data-testid=eye-toggle]").first().click({ timeout: 2000 }).catch(() => {});
      const file = join(outDir, `${r.name}-${vp}-${mode}.png`);
      await page.screenshot({ path: file, fullPage: true });
      shots.push(file);
    }
  }));
  return shots;
}
