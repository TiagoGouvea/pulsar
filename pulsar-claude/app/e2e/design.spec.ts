import { expect, test } from '@playwright/test';
import { hasHorizontalOverflow } from './support';

// /_design catalog (dev/emulator builds only): eye toggle swaps names for abbreviations in the examples.
test('/_design shows abbreviations by default and names after opening the eye', async ({ page }) => {
  await page.goto('/_design');
  const labels = page.locator('[data-indicator-label]');
  await expect(labels.first()).toBeVisible();

  const body = page.locator('main');
  await expect(body).toContainText('EXE');
  await expect(body).toContainText('ENE');
  await expect(body).not.toContainText('Exercício Físico');
  await expect(body).not.toContainText('🏃');

  const eye = page.getByTestId('eye-toggle');
  await expect(eye).toHaveAttribute('aria-pressed', 'false');
  await eye.click();
  await expect(eye).toHaveAttribute('aria-pressed', 'true');
  await expect(body).toContainText('Exercício Físico');
  await expect(body).toContainText('Nível de Energia');
  await expect(body).toContainText('🏃');

  // Indicator without abbreviation/emoji keeps rendering in both states.
  await expect(body).toContainText('Concentração');

  await eye.click();
  await expect(body).not.toContainText('Exercício Físico');
  await expect(body).not.toContainText('🏃');
});

test('/_design has no horizontal overflow with the eye open', async ({ page }) => {
  await page.goto('/_design');
  await page.getByTestId('eye-toggle').click();
  expect(await hasHorizontalOverflow(page)).toBe(false);
});
