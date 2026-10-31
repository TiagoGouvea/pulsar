import { expect, test } from '@playwright/test';

// Mobile-only reflow contract: flows must be complete, readable and
// touch-operable at 390px and 430px with no horizontal scrolling, and
// at 1440px the content must reflow without overflow or lost content.
const viewports = [
  { name: '390px (mobile)', width: 390, height: 844 },
  { name: '430px (mobile-lg)', width: 430, height: 932 },
  { name: '1440px (desktop reflow)', width: 1440, height: 900 }
];

for (const viewport of viewports) {
  test(`no horizontal overflow and visible content at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');

    await expect(page.locator('#root')).not.toBeEmpty();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow, `horizontal overflow of ${overflow}px`).toBeLessThanOrEqual(0);

    await expect(page.getByRole('banner')).toBeVisible();
  });
}

test.describe('mobile-first shell', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('renders the Pulsar header within touch reach', async ({ page }) => {
    await page.goto('/');
    const header = page.getByRole('banner');
    await expect(header).toBeVisible();

    const box = await header.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(430);
  });
});

test.describe('onboarding and initial dashboard', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('completes the three-screen tutorial and lands on the empty dashboard', async ({ page }) => {
    await page.goto('/onboarding/1');
    await expect(page.getByRole('heading', { name: /observe sua rotina/i })).toBeVisible();

    await page.getByRole('button', { name: 'Próximo' }).click();
    await expect(page.getByRole('heading', { name: /acompanhe como você se sente/i })).toBeVisible();

    await page.getByRole('button', { name: 'Próximo' }).click();
    await expect(page.getByRole('heading', { name: /descubra associações reais/i })).toBeVisible();

    await page.getByRole('button', { name: 'Pular' }).click();
    await expect(page.getByRole('heading', { name: 'Bem-vindo ao Pulsar' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Exercício Físico' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Concentração / Foco' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Criar meu próprio indicador/i })).toBeVisible();
    await expect(page.getByText(/nenhum auto-criado/i)).toBeVisible();
  });
});

for (const viewport of viewports) {
  test(`empty dashboard reflows at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: 'Bem-vindo ao Pulsar' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Exercício Físico' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Café Expresso' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nível de Energia' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Concentração / Foco' })).toBeVisible();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow, `horizontal overflow of ${overflow}px`).toBeLessThanOrEqual(0);
  });
}

test.describe('wide screens reuse the mobile layout', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('keeps the same mobile navigation without desktop-only chrome', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner')).toBeVisible();
    expect(await page.locator('[data-desktop-only]').count()).toBe(0);
  });
});

// The account entry is reachable before any permanent registration; even the
// signed-out state must reflow without horizontal overflow.
for (const viewport of viewports) {
  test(`account entry reflows at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/account');

    await expect(page.getByRole('heading', { name: 'Configurações e Conta' })).toBeVisible();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow, `horizontal overflow of ${overflow}px`).toBeLessThanOrEqual(0);
  });
}
