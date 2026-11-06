import type { Page } from '@playwright/test';
import firebaseJson from '../firebase.json' with { type: 'json' };
import { expect, test, currentUid } from './fixtures';
import { appRoutes, hasHorizontalOverflow } from './support';

// Contract of the Settings > Account UI (design/configura_es_e_conta):
//  - [data-testid="account-status"]: says "Conta anônima" while anonymous; shows the linked e-mail afterwards.
//  - Buttons "Vincular com Google" and "Enviar link mágico por e-mail" (the latter reveals an e-mail field;
//    pressing Enter in the field sends the link).
//  - The link in the e-mail opens /settings and the app completes the linking by itself.
//  - A conflict opens a role="dialog" saying the account already exists, with the buttons "Cancelar" and
//    "Entrar na conta existente"; the latter asks for a second confirmation ("Confirmar") before signing in.

const PROJECT = 'demo-pulsar';
const AUTH = `http://127.0.0.1:${firebaseJson.emulators.auth.port}`;
const FIRESTORE = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${PROJECT}/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner' };
const UI_FORBIDDEN = /senha|telefone/i;

const uniqueEmail = (tag: string) => `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

async function putRecord(uid: string, name: string, value: string) {
  const response = await fetch(`${FIRESTORE}/users/${uid}/indicators/${name}`, {
    method: 'PATCH',
    headers: { ...OWNER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { name: { stringValue: value } } }),
  });
  expect(response.ok).toBe(true);
}

async function docStatus(path: string): Promise<{ status: number; body: string }> {
  const response = await fetch(`${FIRESTORE}/${path}`, { headers: OWNER });
  return { status: response.status, body: await response.text() };
}

async function expectRecordIntact(uid: string, name: string, value: string) {
  const record = await docStatus(`users/${uid}/indicators/${name}`);
  expect(record.status).toBe(200);
  expect(record.body).toContain(value);
  expect((await docStatus(`users/${uid}`)).status).toBe(200);
}

/** Creates a permanent account (outside the app) that already owns the given e-mail. */
async function createExistingAccount(email: string): Promise<string> {
  const response = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'e2e-existing-pass-1', returnSecureToken: true }),
  });
  expect(response.ok).toBe(true);
  return ((await response.json()) as { localId: string }).localId;
}

/** The sign-in link the Auth Emulator recorded for the e-mail (what the user would receive). */
async function latestSignInLink(email: string): Promise<string> {
  let link = '';
  await expect
    .poll(
      async () => {
        const response = await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`);
        const { oobCodes } = (await response.json()) as {
          oobCodes: { email: string; requestType: string; oobLink: string }[];
        };
        const match = oobCodes
          .filter((code) => code.email === email && code.requestType === 'EMAIL_SIGNIN')
          .pop();
        link = match?.oobLink ?? '';
        return link;
      },
      { timeout: 15_000 },
    )
    .not.toBe('');
  return link;
}

async function requestMagicLink(page: Page, email: string) {
  await page.getByRole('button', { name: /enviar link mágico/i }).click();
  const field = page.getByLabel(/e-mail/i);
  await field.fill(email);
  await field.press('Enter');
}

async function openSettings(page: Page) {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
  await expect(page.getByTestId('account-status')).toBeVisible();
}

test.describe('account link', () => {
  test('settings opens and fits the screen (smoke)', async ({ freshUserPage: page }) => {
    await openSettings(page);
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test('anonymous account warns that losing the browser can mean losing the data', async ({
    freshUserPage: page,
  }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;
    await openSettings(page);

    const status = page.getByTestId('account-status');
    await expect(status).toContainText(/conta anônima/i);
    await expect(status).toContainText(/perder/i);
    await expect(status).toContainText(/navegador/i);
    await expect(page.getByRole('button', { name: /vincular com google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /enviar link mágico/i })).toBeVisible();
  });

  test('no password or phone field or wording anywhere in the UI', async ({
    freshUserPage: page,
  }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;
    const paths = appRoutes.map((route) => route.path).filter((path) => path !== '/_design');
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      if (path === '/settings') await page.getByRole('button', { name: /enviar link mágico/i }).click();
      await expect(page.locator('input[type="password"], input[type="tel"]')).toHaveCount(0);
      await expect(page.locator('input[autocomplete*="password"], input[autocomplete^="tel"]')).toHaveCount(
        0,
      );
      expect(await page.evaluate(() => document.body.innerText)).not.toMatch(UI_FORBIDDEN);
    }
  });

  test('magic link keeps the UID and the records', async ({ freshUserPage: page }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;
    const email = uniqueEmail('magic');
    const uidBefore = await currentUid(page);
    expect(uidBefore).not.toBeNull();
    await putRecord(uidBefore!, 'e2e-link-keep', 'E2E_LINK_KEEP');

    await openSettings(page);
    await requestMagicLink(page, email);
    await page.goto(await latestSignInLink(email));

    const status = page.getByTestId('account-status');
    await expect(status).toContainText(email, { timeout: 15_000 });
    await expect(status).not.toContainText(/conta anônima/i);
    expect(await currentUid(page)).toBe(uidBefore);
    await expectRecordIntact(uidBefore!, 'e2e-link-keep', 'E2E_LINK_KEEP');
    expect(await page.evaluate(() => document.body.innerText)).not.toMatch(UI_FORBIDDEN);
  });

  test('Google keeps the UID and the records', async ({ freshUserPage: page }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;
    const uidBefore = await currentUid(page);
    await putRecord(uidBefore!, 'e2e-link-keep', 'E2E_LINK_KEEP');
    await openSettings(page);

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /vincular com google/i }).click();
    const popup = await popupPromise;
    await popup.getByRole('button', { name: /add new account/i }).click();
    await popup.getByRole('button', { name: /auto-generate user information/i }).click();
    await popup.getByRole('button', { name: /sign in with google\.com/i }).click();

    await expect(page.getByTestId('account-status')).not.toContainText(/conta anônima/i, { timeout: 15_000 });
    expect(await currentUid(page)).toBe(uidBefore);
    await expectRecordIntact(uidBefore!, 'e2e-link-keep', 'E2E_LINK_KEEP');
  });

  test('e-mail already in use opens an explicit resolution; cancel changes and deletes nothing', async ({
    freshUserPage: page,
  }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;
    const email = uniqueEmail('taken');
    const existingUid = await createExistingAccount(email);
    await putRecord(existingUid, 'e2e-existing', 'E2E_EXISTING_KEEP');
    const anonUid = (await currentUid(page))!;
    await putRecord(anonUid, 'e2e-anon', 'E2E_ANON_KEEP');

    await openSettings(page);
    await requestMagicLink(page, email);
    await page.goto(await latestSignInLink(email));

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog).toContainText(/já existe|já está em uso|já pertence/i);
    await expect(dialog.getByRole('button', { name: /^cancelar$/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /entrar na conta existente/i })).toBeVisible();
    expect(await currentUid(page)).toBe(anonUid);

    await dialog.getByRole('button', { name: /^cancelar$/i }).click();
    await expect(dialog).toBeHidden();
    expect(await currentUid(page)).toBe(anonUid);
    await expect(page.getByTestId('account-status')).toContainText(/conta anônima/i);
    await expectRecordIntact(anonUid, 'e2e-anon', 'E2E_ANON_KEEP');
    await expectRecordIntact(existingUid, 'e2e-existing', 'E2E_EXISTING_KEEP');
  });

  test('entering the existing account needs a second confirmation and never merges or deletes', async ({
    freshUserPage: page,
  }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;
    const email = uniqueEmail('taken');
    const existingUid = await createExistingAccount(email);
    await putRecord(existingUid, 'e2e-existing', 'E2E_EXISTING_KEEP');
    const anonUid = (await currentUid(page))!;
    await putRecord(anonUid, 'e2e-anon', 'E2E_ANON_KEEP');

    await openSettings(page);
    await requestMagicLink(page, email);
    await page.goto(await latestSignInLink(email));

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.getByRole('button', { name: /entrar na conta existente/i }).click();

    // Still the anonymous user until the person explicitly confirms.
    await expect(dialog.getByRole('button', { name: /^confirmar/i })).toBeVisible();
    expect(await currentUid(page)).toBe(anonUid);

    await dialog.getByRole('button', { name: /^confirmar/i }).click();
    await expect.poll(() => currentUid(page), { timeout: 15_000 }).toBe(existingUid);

    // Nothing was merged into, replaced or deleted from either account.
    await expectRecordIntact(existingUid, 'e2e-existing', 'E2E_EXISTING_KEEP');
    await expectRecordIntact(anonUid, 'e2e-anon', 'E2E_ANON_KEEP');
    expect((await docStatus(`users/${existingUid}/indicators/e2e-anon`)).status).toBe(404);
  });
});
