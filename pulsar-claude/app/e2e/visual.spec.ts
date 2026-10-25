import { test } from '@playwright/test';
import { appRoutes } from './support';

// Captures every `ui` route for the visual review (human/agent) against design/<screen>/screen.png.
// Output: test-results/visual/<route>-<project>.png
for (const route of appRoutes.filter((r) => r.tags.includes('ui'))) {
  test(`visual ${route.name} @visual`, async ({ page }, testInfo) => {
    await page.goto(route.path);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `test-results/visual/${route.name}-${testInfo.project.name}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  });
}
