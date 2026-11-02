import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

const STEP_1 = /Observe sua rotina sem burocracia/;
const STEP_2 = /Acompanhe como seu corpo responde/;
const STEP_3 = /Descubra associações reais nos seus dados/;

const action = (page: Page, name: RegExp) => page.locator('button, a').filter({ hasText: name });
const heading = (page: Page) => page.getByRole('heading', { level: 1 });

async function openOnboarding(page: Page) {
  await page.goto('/onboarding');
  await expect(heading(page)).toHaveText(STEP_1);
}

test.describe('onboarding tutorial', () => {
  test('new account lands on the first of three steps', async ({ freshUserPage: page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(heading(page)).toHaveText(STEP_1);
    await expect(action(page, /Próximo/).first()).toBeVisible();
    await expect(action(page, /Pular/).first()).toBeVisible();
  });

  test('Next and Back move through the three steps', async ({ freshUserPage: page }) => {
    await openOnboarding(page);
    // First step has nothing to go back to.
    await expect(action(page, /^\s*Voltar\s*$/)).toHaveCount(0);

    await action(page, /Próximo/)
      .first()
      .click();
    await expect(heading(page)).toHaveText(STEP_2);
    await expect(action(page, /Pular/).first()).toBeVisible();

    await action(page, /Próximo/)
      .first()
      .click();
    await expect(heading(page)).toHaveText(STEP_3);

    await action(page, /^\s*Voltar\s*$/)
      .first()
      .click();
    await expect(heading(page)).toHaveText(STEP_2);
    await action(page, /^\s*Voltar\s*$/)
      .first()
      .click();
    await expect(heading(page)).toHaveText(STEP_1);
  });

  test('step 3 explains correlation is not causation, acronym mode and anonymous account', async ({
    freshUserPage: page,
  }) => {
    await openOnboarding(page);
    await action(page, /Próximo/)
      .first()
      .click();
    await action(page, /Próximo/)
      .first()
      .click();
    await expect(heading(page)).toHaveText(STEP_3);
    await expect(page.getByText(/causalidade/i).first()).toBeVisible();
    await expect(page.getByText(/siglas/i).first()).toBeVisible();
    await expect(page.getByText(/anônima/i).first()).toBeVisible();
  });

  test('finishing marks onboarding as completed and it does not come back', async ({
    freshUserPage: page,
  }) => {
    await openOnboarding(page);
    await action(page, /Próximo/)
      .first()
      .click();
    await action(page, /Próximo/)
      .first()
      .click();
    await expect(heading(page)).toHaveText(STEP_3);
    await action(page, /Começar|Concluir/)
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('skipping from the first step marks onboarding as completed', async ({ freshUserPage: page }) => {
    await openOnboarding(page);
    await action(page, /Pular/).first().click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('skipping from the second step marks onboarding as completed', async ({ freshUserPage: page }) => {
    await openOnboarding(page);
    await action(page, /Próximo/)
      .first()
      .click();
    await expect(heading(page)).toHaveText(STEP_2);
    await action(page, /Pular/).first().click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});
