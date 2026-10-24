import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import axe from "axe-core";
import type { HarnessConfig } from "../config/schema.js";
import { writeJson } from "../utils/core.js";

export interface VisualEvidence {
  viewport: number;
  screenshot: string;
  consoleErrors: string[];
  failedRequests: string[];
  horizontalOverflow: boolean;
  accessibilityViolations: Array<{ id: string; impact: string | null; help: string; nodes: number; targets: string[] }>;
}

export async function captureVisualEvidence(input: {
  config: HarnessConfig;
  url: string;
  outputDirectory: string;
}): Promise<VisualEvidence[]> {
  await mkdir(input.outputDirectory, { recursive: true });
  const browser = await chromium.launch();
  const evidence = [];
  try {
    for (const width of input.config.review.viewportWidths) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const consoleErrors: string[] = [];
      const failedRequests: string[] = [];
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
      page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()}`));
      await page.goto(input.url, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.addScriptTag({ content: axe.source });
      const accessibility = await page.evaluate(async () => {
        const runner = (window as typeof window & { axe: { run(): Promise<{ violations: Array<{ id: string; impact: string | null; help: string; nodes: Array<{ target: string[] }> }> }> } }).axe;
        return runner.run();
      });
      const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      const screenshot = path.join(input.outputDirectory, `viewport-${width}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      evidence.push({
        viewport: width, screenshot, consoleErrors, failedRequests, horizontalOverflow,
        accessibilityViolations: accessibility.violations.map((violation) => ({
          id: violation.id, impact: violation.impact, help: violation.help, nodes: violation.nodes.length,
          targets: violation.nodes.flatMap((node) => node.target),
        })),
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  await writeJson(path.join(input.outputDirectory, "visual-evidence.json"), evidence);
  return evidence;
}
