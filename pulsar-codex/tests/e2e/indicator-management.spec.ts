import { expect, test } from '@playwright/test';

/**
 * REQ-2-001 end-to-end: create indicators with the four response types is
 * covered per-field by unit and rules tests; this spec walks the real
 * management flow against the Firebase emulators — create, edit, reorder,
 * archive, restore — and checks the mobile reflow contract.
 */

async function overflow(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
}

test.describe('indicator management', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('creates, reorders, archives, restores and edits indicators', async ({ page }) => {
    await page.goto('/indicators');

    // Start in privacy mode, then reveal names for this management flow.
    expect(await page.locator('[data-desktop-only]').count()).toBe(0);
    await expect(page.getByRole('button', { name: /Alternar modo discrição e siglas/i })).toBeVisible();
    await page.getByRole('button', { name: /Alternar modo discrição e siglas/i }).click();

    // Empty account: no indicator is created automatically.
    await expect(page.getByRole('heading', { name: 'Nenhum indicador ainda' })).toBeVisible();

    // 1. Create a numeric factor with multiple records and suggested sum.
    await page.getByRole('link', { name: /Criar primeiro indicador/i }).click();
    await expect(page.getByRole('heading', { name: 'Novo Indicador' })).toBeVisible();

    await page.getByLabel(/Nome do Indicador/i).fill('Café');
    await page.getByRole('button', { name: /Número \+ Unidade/ }).click();
    await page.getByRole('button', { name: 'xícaras' }).click();
    await page.getByRole('button', { name: /Múltiplos/ }).click();
    await expect(page.getByRole('button', { name: /Soma/ })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Criar Indicador' }).click();

    await expect(page.getByRole('heading', { name: 'Café' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fatores' })).toBeVisible();
    await expect(page.getByText('Numérico (xícaras)')).toBeVisible();
    await expect(page.getByText('Soma diária')).toBeVisible();

    // 2. Create a boolean factor.
    await page.getByRole('link', { name: /Novo Indicador/i }).click();
    await page.getByLabel(/Nome do Indicador/i).fill('Meditação');
    await page.getByRole('button', { name: /Booleano/ }).click();
    await page.getByRole('button', { name: 'Criar Indicador' }).click();
    await expect(page.getByRole('heading', { name: 'Meditação' })).toBeVisible();

    // 3. Create a scale result with an ideal range.
    await page.getByRole('link', { name: /Novo Indicador/i }).click();
    await page.getByRole('button', { name: /Resultado/ }).click();
    await page.getByLabel(/Nome do Indicador/i).fill('Foco');
    await page.getByRole('button', { name: /Escala 0 a 10/ }).click();
    await page.getByRole('button', { name: /Faixa ideal/ }).click();
    await page.getByLabel('Mínimo ideal').fill('7');
    await page.getByLabel('Máximo ideal').fill('10');
    await page.getByRole('button', { name: 'Criar Indicador' }).click();

    await expect(page.getByRole('heading', { name: 'Resultados' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Foco' })).toBeVisible();
    await expect(page.getByText('Faixa ideal (7 a 10)')).toBeVisible();

    // 4. Reorder within Fatores: Meditação moves above Café.
    const cardNames = page.locator('section[aria-labelledby="factors-heading"] h3');
    await expect(cardNames).toHaveCount(2);
    await expect(cardNames.nth(0)).toHaveText('Café');
    await page.getByRole('button', { name: 'Mover Meditação para cima' }).click();
    await expect(cardNames.nth(0)).toHaveText('Meditação');
    await expect(cardNames.nth(1)).toHaveText('Café');

    // 5. Archive Café through the options sheet.
    await page.getByRole('button', { name: 'Opções para Café' }).click();
    await expect(page.getByRole('dialog', { name: 'Opções do Indicador' })).toBeVisible();
    await page.getByRole('button', { name: 'Arquivar indicador' }).click();

    await expect(page.getByRole('button', { name: /Arquivados\s*1/ })).toBeVisible();
    await expect(cardNames).toHaveCount(1);
    await expect(cardNames.nth(0)).toHaveText('Meditação');

    // The archived indicator keeps its history and can be restored.
    await page.getByRole('button', { name: 'Seção de arquivados' }).click();
    await expect(page.getByRole('heading', { name: 'Café' })).toBeVisible();
    await expect(page.getByText(/histórico preservado nas análises/i)).toBeVisible();
    await page.getByRole('button', { name: 'Restaurar Café' }).click();
    await expect(page.getByRole('button', { name: /Arquivados\s*0/ })).toBeVisible();
    await expect(cardNames).toHaveCount(2);

    // 6. Edit the result: the name stays editable.
    await page.getByRole('button', { name: 'Opções para Foco' }).click();
    await page.getByRole('button', { name: 'Editar parâmetros' }).click();
    await expect(page.getByRole('heading', { name: 'Foco' })).toBeVisible();
    await page.getByLabel(/Nome do Indicador/i).fill('Foco Profundo');
    await page.getByRole('button', { name: 'Salvar alterações' }).click();

    await expect(page.getByRole('heading', { name: 'Foco Profundo' })).toBeVisible();
    await expect(page.getByText(/Foco Profundo atualizado/i)).toBeVisible();

    // No horizontal scrolling at any stage of the flow.
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});

for (const viewport of [
  { name: '390px (mobile)', width: 390, height: 844 },
  { name: '430px (mobile-lg)', width: 430, height: 932 }
]) {
  test(`indicator screens reflow at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await page.goto('/indicators');
    await expect(page.getByRole('heading', { name: 'Meus Indicadores' })).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);

    await page.goto('/indicators/new');
    await expect(page.getByRole('heading', { name: 'Novo Indicador' })).toBeVisible();
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    expect(await page.locator('[data-desktop-only]').count()).toBe(0);
  });
}
