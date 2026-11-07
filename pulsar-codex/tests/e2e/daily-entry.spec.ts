import { expect, test, type Page } from '@playwright/test';

/**
 * REQ-2-002 end-to-end: the daily log accepts any subset of indicators, a
 * single-frequency answer replaces only the current day, a multiple-frequency
 * indicator accumulates events and the chosen aggregation is applied. The
 * global privacy mode starts in abbreviations, hides emojis/names and keeps
 * values visible; any record can be deleted. Only a server-confirmed write is
 * shown as saved.
 */

async function createIndicator(
  page: Page,
  name: string,
  abbreviation: string,
  configure?: () => Promise<void>
) {
  await page.goto('/indicators/new');
  await expect(page.getByRole('heading', { name: 'Novo Indicador' })).toBeVisible();
  await page.getByLabel(/Nome do Indicador/i).fill(name);
  await page.getByLabel(/^Sigla$/i).fill(abbreviation);
  if (configure) await configure();
  await page.getByRole('button', { name: 'Criar Indicador' }).click();
  await expect(page.getByRole('heading', { name: 'Meus Indicadores' })).toBeVisible();
}

async function overflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
}

test.describe('daily registration and visual privacy', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('records subsets, aggregates multiple events, deletes records and resets privacy on reload', async ({
    page
  }) => {
    await createIndicator(page, 'Exercício Físico', 'EXE');
    await createIndicator(page, 'Café', 'CAF', async () => {
      await page.getByRole('button', { name: /Número \+ Unidade/ }).click();
      await page.getByRole('button', { name: 'xícaras' }).click();
      await page.getByRole('button', { name: /Múltiplos/ }).click();
      await expect(page.getByRole('button', { name: /Soma/ })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });
    await createIndicator(page, 'Energia', 'ENE', async () => {
      await page.getByRole('button', { name: /^Resultado/ }).click();
      await page.getByRole('button', { name: /^Escala/ }).click();
    });

    // The dashboard offers the quick registration entry.
    await page.goto('/dashboard');
    await page.getByRole('link', { name: /Registrar agora/i }).click();
    await expect(page).toHaveURL(/\/registrar$/);
    await expect(page.getByRole('heading', { name: 'Registro de Hoje' })).toBeVisible();

    // Starts in abbreviations and hides the full names.
    await expect(page.getByRole('heading', { name: 'EXE' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Exercício Físico' })).toHaveCount(0);
    await expect(page.locator('input[type="date"]')).toHaveCount(0);

    // Save only two indicators, with an optional observation.
    await page
      .getByRole('group', { name: 'Resposta de EXE' })
      .getByRole('button', { name: 'Não' })
      .click();
    await page.getByLabel('Resposta de CAF (valor numérico)').fill('0');
    await page.getByLabel(/Observação do dia/i).fill('noite fria');
    await page.getByRole('button', { name: 'Salvar registro' }).click();
    await expect(page.getByText(/2 registros salvos e confirmados/i)).toBeVisible();

    // Values are visible in privacy mode; an unanswered indicator is absent,
    // distinct from zero and from "Não".
    await expect(page.getByLabel('Valor de hoje de EXE')).toHaveText('Não');
    await expect(page.getByLabel('Valor de hoje de CAF')).toHaveText('0 xícaras');
    await expect(page.getByLabel('Valor de hoje de ENE')).toHaveText('Sem registro');
    await expect(page.getByText('noite fria').first()).toBeVisible();

    // A multiple-frequency indicator creates a second event and applies sum.
    await page.getByLabel('Resposta de CAF (valor numérico)').fill('2');
    await page.getByRole('button', { name: 'Salvar registro' }).click();
    await expect(page.getByText(/registro salvo e confirmado/i)).toBeVisible();
    await expect(page.getByLabel('Valor de hoje de CAF')).toHaveText('2 xícaras');
    await expect(page.getByText('2 eventos · Soma')).toBeVisible();

    // A single-frequency indicator replaces the value of the current day only.
    await page
      .getByRole('group', { name: 'Resposta de ENE' })
      .getByRole('button', { name: '7', exact: true })
      .click();
    await page.getByRole('button', { name: 'Salvar registro' }).click();
    await expect(page.getByLabel('Valor de hoje de ENE')).toHaveText('7/10');

    await page
      .getByRole('group', { name: 'Resposta de ENE' })
      .getByRole('button', { name: '8', exact: true })
      .click();
    await page.getByRole('button', { name: 'Salvar registro' }).click();
    await expect(page.getByLabel('Valor de hoje de ENE')).toHaveText('8/10');
    await expect(page.getByRole('button', { name: /Excluir registro de ENE de Hoje/i })).toHaveCount(1);

    // Any record can be deleted, including a record already saved today.
    await page.getByRole('button', { name: /Excluir registro de EXE de Hoje/i }).click();
    await expect(page.getByText(/excluído e confirmado/i)).toBeVisible();
    await expect(page.getByLabel('Valor de hoje de EXE')).toHaveText('Sem registro');

    // Revealing names keeps values and chart numbers untouched.
    await page.getByRole('button', { name: /Alternar modo discrição e siglas/i }).click();
    await expect(page.getByRole('heading', { name: 'Exercício Físico' })).toBeVisible();
    await expect(page.getByText('2 xícaras').first()).toBeVisible();

    // Reopening the app starts in abbreviations again.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'EXE' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Exercício Físico' })).toHaveCount(0);

    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});

for (const viewport of [
  { name: '390px (mobile)', width: 390, height: 844 },
  { name: '430px (mobile-lg)', width: 430, height: 932 },
  { name: '1440px (desktop reflow)', width: 1440, height: 900 }
]) {
  test(`daily register reflows at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/registrar');
    await expect(page.getByRole('heading', { name: 'Registro de Hoje' })).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
}
