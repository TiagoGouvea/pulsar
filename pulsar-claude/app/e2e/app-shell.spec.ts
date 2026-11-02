import { expect, test, type Page } from '@playwright/test';
import { hasHorizontalOverflow } from './support';

const TABS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Registrar', path: '/register' },
  { label: 'Indicadores', path: '/indicators' },
  { label: 'Conclusões', path: '/saved-insights' },
];
const SHELL_PATHS = [...TABS.map((t) => t.path), '/settings'];

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByTestId('eye-toggle')).toBeVisible();
}

const nav = (page: Page) => page.getByRole('navigation');

test.describe('AppShell', () => {
  for (const path of SHELL_PATHS) {
    test(`eye toggle, header and bottom nav are present on ${path}`, async ({ page }) => {
      await open(page, path);
      await expect(page.getByTestId('eye-toggle')).toHaveCount(1);
      await expect(page.getByRole('banner')).toContainText('Pulsar');
      for (const tab of TABS) await expect(nav(page).getByRole('link', { name: tab.label })).toBeVisible();
    });
  }

  test('profile shortcut in the header goes to /settings', async ({ page }) => {
    await open(page, '/dashboard');
    await page.getByRole('banner').locator('a[href="/settings"]').click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByTestId('eye-toggle')).toBeVisible();
  });

  test('bottom nav items have an icon and the active one has aria-current=page', async ({ page }) => {
    for (const active of TABS) {
      await open(page, active.path);
      for (const tab of TABS) {
        const link = nav(page).getByRole('link', { name: tab.label });
        await expect(link.locator('svg')).toHaveCount(1);
        if (tab.path === active.path) await expect(link).toHaveAttribute('aria-current', 'page');
        else await expect(link).not.toHaveAttribute('aria-current', 'page');
      }
    }
  });

  test('tapping a nav item navigates and moves the active state', async ({ page }) => {
    await open(page, '/dashboard');
    for (const tab of TABS.slice(1)) {
      await nav(page).getByRole('link', { name: tab.label }).click();
      await expect(page).toHaveURL(new RegExp(`${tab.path}$`));
      await expect(nav(page).getByRole('link', { name: tab.label })).toHaveAttribute('aria-current', 'page');
    }
  });

  test('eye state is global: toggling persists while navigating between tabs', async ({ page }) => {
    await open(page, '/dashboard');
    const eye = page.getByTestId('eye-toggle');
    const before = await eye.getAttribute('aria-pressed');
    await eye.click();
    const after = await eye.getAttribute('aria-pressed');
    expect(after).not.toBe(before);
    await nav(page).getByRole('link', { name: 'Indicadores' }).click();
    await expect(page.getByTestId('eye-toggle')).toHaveAttribute('aria-pressed', after ?? '');
  });

  test('touch targets are at least 44px', async ({ page }) => {
    await open(page, '/dashboard');
    const targets = [
      page.getByTestId('eye-toggle'),
      page.getByRole('banner').locator('a[href="/settings"]'),
      ...TABS.map((t) => nav(page).getByRole('link', { name: t.label })),
    ];
    for (const target of targets) {
      const box = await target.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test('no horizontal overflow and the column respects the max width', async ({ page }) => {
    for (const path of SHELL_PATHS) {
      await open(page, path);
      expect(await hasHorizontalOverflow(page)).toBe(false);
      const width = await page.getByRole('main').evaluate((el) => el.getBoundingClientRect().width);
      const viewport = page.viewportSize()?.width ?? 0;
      expect(width).toBeLessThanOrEqual(Math.min(viewport, 960) + 1);
      expect(width).toBeGreaterThan(0);
    }
  });

  test('bottom nav stays inside the viewport', async ({ page }) => {
    await open(page, '/dashboard');
    const box = await nav(page).boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect((box?.x ?? -1) + (box?.width ?? 0)).toBeLessThanOrEqual((viewport?.width ?? 0) + 1);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual((viewport?.height ?? 0) + 1);
  });
});
