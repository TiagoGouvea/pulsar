import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { appRoutes, SENTINELS } from './support';

const FIXED_NOW = '2026-11-08T18:00:00Z';
const NOTE = 'ZQX_OBS_NOTA_5T1';
const INDICATORS = [
  { name: 'ZQX_SONO_9K2', abbreviation: 'SON', emoji: '💤', id: 'ind_sleep' },
  { name: 'ZQX_ENERGIA_7F3', abbreviation: 'ENE', emoji: '⚡', id: 'ind_energy' },
  { name: 'ZQX_FOCO_4M8', abbreviation: 'FOC', emoji: '🎯', id: 'ind_focus' },
] as const;

// Include text exposed by assistive technology, native titles, form values and visible tooltips.
async function exposedContent(page: Page, outsideAllowList = true): Promise<string> {
  return page.evaluate((outside) => {
    const content: string[] = [];
    for (const element of document.querySelectorAll('*')) {
      if (outside && element.closest('[data-privacy-allow]')) continue;
      if (!element.getClientRects().length) continue;
      const style = getComputedStyle(element);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      for (const child of element.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) content.push(child.textContent ?? '');
      }
      for (const attribute of element.attributes) {
        if (attribute.name === 'title' || attribute.name.startsWith('aria-')) {
          content.push(attribute.value);
          if (attribute.name === 'aria-labelledby' || attribute.name === 'aria-describedby') {
            for (const id of attribute.value.split(/\s+/)) {
              const target = document.getElementById(id);
              if (target) content.push(target.textContent ?? '');
            }
          }
        }
      }
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        content.push(element.value, element.placeholder);
      }
    }
    return content.join('\n');
  }, outsideAllowList);
}

async function expectNoLeaks(page: Page) {
  const exposed = await exposedContent(page);
  for (const sentinel of SENTINELS)
    expect(exposed, `Private content leaked: ${sentinel}`).not.toContain(sentinel);
}

async function inspectTooltips(page: Page) {
  const targets = page.locator('[title], [aria-describedby], [data-tooltip]');
  const count = await targets.count();
  for (let index = 0; index < count; index++) {
    const target = targets.nth(index);
    if (!(await target.isVisible())) continue;
    await target.hover();
    await expectNoLeaks(page);
  }
}

async function waitForRoute(page: Page, path: string) {
  if (path === '/indicators') {
    await expect(page.getByTestId('result-list').getByText('ENE', { exact: true })).toBeVisible();
  } else if (path === '/register') {
    await expect(page.getByTestId('quick-entry-card-ind_energy')).toBeVisible();
  } else if (path === '/indicators/:id/edit') {
    await expect(page.getByRole('textbox', { name: /nome do indicador/i })).toHaveValue('ZQX_ENERGIA_7F3');
  } else if (path === '/indicators/new') {
    await expect(page.getByRole('dialog', { name: 'Novo Indicador' })).toBeVisible();
  } else if (path === '/onboarding') {
    await expect(page.locator('h1')).toBeVisible();
  } else if (path === '/_design') {
    await expect(page.getByRole('heading', { name: 'Design system' })).toBeVisible();
  } else if (path === '/saved-insights') {
    await expect(page.getByRole('heading', { name: 'Conclusões salvas' })).toBeVisible();
  } else if (path === '/settings') {
    await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
  } else {
    await expect(page.getByRole('link', { name: 'Registrar agora' })).toBeVisible();
  }
}

for (const route of appRoutes) {
  test(`closed eye protects seed content on ${route.path}`, async ({ seedPage: page }) => {
    await page.clock.setFixedTime(new Date(FIXED_NOW));
    await page.goto(route.path.replace(':id', 'ind_energy'));
    await waitForRoute(page, route.path);
    const eye = page.getByTestId('eye-toggle');
    if (await eye.count()) await expect(eye).toHaveAttribute('aria-pressed', 'false');
    await expectNoLeaks(page);
    expect(await exposedContent(page, false)).not.toContain(NOTE);
    await inspectTooltips(page);
  });
}

test('the eye reveals seed names and emoji across navigation, and reload returns to abbreviations', async ({
  seedPage: page,
}) => {
  await page.clock.setFixedTime(new Date(FIXED_NOW));
  await page.goto('/indicators');
  await expect(page.getByTestId('result-list').getByText('ENE', { exact: true })).toBeVisible();
  const eye = page.getByTestId('eye-toggle');
  await expect(eye).toHaveAttribute('aria-pressed', 'false');
  for (const indicator of INDICATORS) {
    const label = page.getByTestId('indicator-card').filter({ hasText: indicator.abbreviation });
    await expect(label).toContainText(indicator.abbreviation);
    await expect(label).not.toContainText(indicator.name);
    await expect(label).not.toContainText(indicator.emoji);
  }
  await expectNoLeaks(page);

  await eye.click();
  await expect(eye).toHaveAttribute('aria-pressed', 'true');
  for (const indicator of INDICATORS) {
    const card = page.getByTestId('indicator-card').filter({ hasText: indicator.name });
    await expect(card).toBeVisible();
    await expect(card).toContainText(indicator.emoji);
  }

  await page
    .getByRole('navigation', { name: 'Navegação principal' })
    .getByRole('link', { name: 'Registrar' })
    .click();
  await expect(eye).toHaveAttribute('aria-pressed', 'true');
  for (const indicator of INDICATORS) {
    const card = page.getByTestId(`quick-entry-card-${indicator.id}`);
    await expect(card).toContainText(indicator.name);
    await expect(card).toContainText(indicator.emoji);
  }

  await page.reload();
  await expect(eye).toHaveAttribute('aria-pressed', 'false');
  for (const indicator of INDICATORS) {
    const card = page.getByTestId(`quick-entry-card-${indicator.id}`);
    await expect(card).toContainText(indicator.abbreviation);
    await expect(card).not.toContainText(indicator.name);
    await expect(card).not.toContainText(indicator.emoji);
  }
  await expectNoLeaks(page);
});

test('seed observations are visible only after explicitly opening a note', async ({ seedPage: page }) => {
  await page.clock.setFixedTime(new Date(FIXED_NOW));
  await page.goto('/indicators');
  const card = page.getByTestId('indicator-card').filter({ hasText: 'ENE' });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: /opções do indicador/i }).click();
  await page
    .getByRole('dialog', { name: /opções do indicador/i })
    .getByRole('button', { name: /histórico/i })
    .click();
  const history = page.getByRole('dialog', { name: /histórico de registros/i });
  await expect(history).toBeVisible();
  const noteButton = history.getByRole('button', { name: /ver observação/i }).first();
  await expect(noteButton).toBeVisible();
  expect(await exposedContent(page, false)).not.toContain(NOTE);
  await expectNoLeaks(page);
  await inspectTooltips(page);

  await noteButton.click();
  const note = history.locator('[data-privacy-allow]').getByText(NOTE, { exact: false });
  await expect(note).toBeVisible();
  await expectNoLeaks(page);
  await inspectTooltips(page);
  await history.getByRole('button', { name: /ocultar observação/i }).click();
  await expect(note).not.toBeVisible();
  expect(await exposedContent(page, false)).not.toContain(NOTE);
});
