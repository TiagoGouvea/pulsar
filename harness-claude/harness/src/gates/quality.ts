// G9 (axe), G10 (overflow + touch targets) and G12 (Lighthouse) run by the harness against the served app.
import { execa } from "execa";
import type { Ctx } from "../config.js";
import { appRequire, forEachPage, gateEnv, readRoutes, VIEWPORTS, withServer } from "./browser.js";

type Res = { ok: boolean; output: string };
const result = (problems: string[], okMsg: string): Res => ({ ok: !problems.length, output: problems.slice(0, 60).join("\n") || okMsg });

export async function a11yGate(ctx: Ctx, appAbs: string): Promise<Res> {
  const { default: AxeBuilder } = appRequire(appAbs)("@axe-core/playwright");
  const problems: string[] = [];
  await withServer(ctx, appAbs, (url) => forEachPage(appAbs, url, readRoutes(ctx, appAbs), VIEWPORTS, async (page, r, vp) => {
    const { violations } = await new AxeBuilder({ page }).analyze();
    for (const v of violations.filter((x: any) => ["serious", "critical"].includes(x.impact))) problems.push(`${r.name}/${vp}: [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} nós)`);
  }));
  return result(problems, "zero violações serious/critical");
}

const WIDTHS = { w320: { width: 320, height: 700 }, w375: { width: 375, height: 812 }, w414: { width: 414, height: 896 } };

export async function layoutGate(ctx: Ctx, appAbs: string): Promise<Res> {
  const problems: string[] = [];
  await withServer(ctx, appAbs, (url) => forEachPage(appAbs, url, readRoutes(ctx, appAbs), WIDTHS, async (page, r, vp) => {
    const found: string[] = await page.evaluate(() => {
      const out: string[] = [];
      if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`overflow horizontal (${document.documentElement.scrollWidth}px > ${window.innerWidth}px)`);
      for (const el of Array.from(document.querySelectorAll("button, a[href], input, select, textarea, [role=button], [role=switch], [role=tab]"))) {
        if (el.closest("[data-touch-exempt]")) continue;
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0 || getComputedStyle(el).visibility === "hidden") continue;
        if (b.width < 44 || b.height < 44) out.push(`alvo de toque ${Math.round(b.width)}x${Math.round(b.height)} < 44px: ${el.outerHTML.slice(0, 80)}`);
      }
      return out;
    });
    problems.push(...found.map((f) => `${r.name}/${vp}: ${f}`));
  }));
  return result(problems, "sem overflow e alvos ≥ 44px em 320/375/414");
}

export async function lighthouseGate(ctx: Ctx, appAbs: string): Promise<Res> {
  const min = ctx.config.browser.lighthouse;
  const problems: string[] = [];
  await withServer(ctx, appAbs, async (url) => {
    for (const r of readRoutes(ctx, appAbs)) {
      const target = new URL(r.path, url).href;
      const lh = await execa("npx", ["--yes", "lighthouse", target, "--output=json", "--quiet", "--form-factor=mobile", "--only-categories=performance,accessibility,best-practices", "--chrome-flags=--headless=new"], { cwd: appAbs, env: gateEnv(ctx), extendEnv: false, reject: false, timeout: 300_000 });
      if (lh.exitCode !== 0) { problems.push(`${r.name}: lighthouse falhou: ${String(lh.stderr).slice(-300)}`); continue; }
      const cats = JSON.parse(String(lh.stdout)).categories;
      const perf = Math.round(cats.performance.score * 100), a11y = Math.round(cats.accessibility.score * 100);
      if (perf < min.performance) problems.push(`${r.name}: performance ${perf} < ${min.performance}`);
      if (a11y < min.accessibility) problems.push(`${r.name}: acessibilidade ${a11y} < ${min.accessibility}`);
    }
  });
  return result(problems, `performance ≥ ${min.performance}, a11y ≥ ${min.accessibility}`);
}
