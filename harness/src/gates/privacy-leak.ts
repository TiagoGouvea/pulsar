// G8: with private mode active, no sentinel indicator name/observation may appear anywhere outside an
// intentionally open editor (elements inside [data-privacy-allow] are skipped).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "../config.js";
import { type AppRoute, forEachPage, readRoutes, VIEWPORTS, withServer } from "./browser.js";

export interface Surface { where: string; text: string }

export const findLeaks = (sentinels: string[], surfaces: Surface[]) =>
  surfaces.flatMap((s) => sentinels.filter((x) => s.text.includes(x)).map((x) => `${x} em ${s.where}`));

/** Collected inside the page: visible text, a11y attributes, titles, storage. */
const COLLECT = () => {
  const skip = (el: Element) => !!el.closest("[data-privacy-allow]");
  const out: { where: string; text: string }[] = [{ where: "document.title", text: document.title }];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  for (let n = walker.currentNode as Element | null; n; n = walker.nextNode() as Element | null) {
    if (skip(n)) continue;
    for (const a of Array.from(n.attributes)) {
      if (a.name.startsWith("aria-") || ["title", "alt", "placeholder", "value"].includes(a.name)) out.push({ where: `${n.tagName.toLowerCase()}[${a.name}]`, text: a.value });
    }
    if (n.tagName === "text" || n.tagName === "title") out.push({ where: "svg", text: n.textContent ?? "" });
  }
  const clone = document.body.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[data-privacy-allow]").forEach((e) => e.remove());
  out.push({ where: "innerText", text: clone.innerText ?? clone.textContent ?? "" });
  for (const [name, st] of [["localStorage", localStorage], ["sessionStorage", sessionStorage]] as const) {
    for (let i = 0; i < st.length; i++) out.push({ where: name, text: `${st.key(i)}=${st.getItem(st.key(i)!)}` });
  }
  return out;
};

/** Dumps written by the app's own privacy e2e tests (interactive states) are scanned too. */
function appDumps(appAbs: string): Surface[] {
  const dir = join(appAbs, "test-results", "privacy-dump");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => ({ where: `dump:${f}`, text: readFileSync(join(dir, f), "utf8") }));
}

export async function privacyGate(ctx: Ctx, appAbs: string): Promise<{ ok: boolean; output: string }> {
  const { sentinels } = ctx.config.browser;
  const routes: AppRoute[] = readRoutes(ctx, appAbs);
  const surfaces: Surface[] = [...appDumps(appAbs)];
  await withServer(ctx, appAbs, (baseUrl) => forEachPage(appAbs, baseUrl, routes, VIEWPORTS, async (page, r, vp) => {
    const net: Surface[] = [];
    page.on("request", (req: any) => net.push({ where: `rede ${req.method()} ${req.url().slice(0, 80)}`, text: `${req.url()} ${req.postData() ?? ""}` }));
    page.on("console", (m: any) => net.push({ where: "console", text: m.text() }));
    await page.reload({ waitUntil: "networkidle" });
    const collect = async (tag: string) => surfaces.push(...(await page.evaluate(COLLECT)).map((s: Surface) => ({ ...s, where: `${r.name}/${vp}${tag} ${s.where}` })));
    await collect("");
    // hover states: chart marks and tooltip triggers
    const hoverables = await page.locator("svg [data-point], svg circle, svg rect, [data-tooltip], [aria-describedby]").all();
    for (const h of hoverables.slice(0, 15)) {
      await h.hover({ timeout: 1000 }).catch(() => {});
      await collect(" (hover)");
    }
    surfaces.push(...net.map((s) => ({ ...s, where: `${r.name}/${vp} ${s.where}` })));
  }));
  const leaks = findLeaks(sentinels, surfaces);
  return { ok: leaks.length === 0, output: leaks.length ? [...new Set(leaks)].slice(0, 50).join("\n") : `sem vazamento (${surfaces.length} superfícies)` };
}
