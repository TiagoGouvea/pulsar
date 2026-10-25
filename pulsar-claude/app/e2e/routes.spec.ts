import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { appRoutes, hasHorizontalOverflow, SENTINELS, visibleTextOutsideAllowList } from './support';

// Browser gates applied to every route in routes.json: renders, no runtime errors, no horizontal overflow,
// no serious a11y violations and no sentinel names leaked while the eye is closed.
for (const route of appRoutes) {
  test(`route ${route.name} (${route.path}) passes browser gates`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(route.path);
    await page.waitForLoadState('networkidle');

    expect(errors).toEqual([]);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    expect(await hasHorizontalOverflow(page)).toBe(false);

    const text = await visibleTextOutsideAllowList(page);
    for (const sentinel of SENTINELS) expect(text).not.toContain(sentinel);

    const axe = await new AxeBuilder({ page }).analyze();
    const blocking = axe.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(
      blocking.map((v) => `${v.id}: ${v.help} @ ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([]);
  });
}
