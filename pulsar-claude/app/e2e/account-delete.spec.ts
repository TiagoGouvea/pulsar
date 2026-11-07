import type { Page } from '@playwright/test';
import firebaseJson from '../firebase.json' with { type: 'json' };
import { currentUid, expect, test } from './fixtures';
import { hasHorizontalOverflow, SENTINELS } from './support';

const PROJECT = 'demo-pulsar';
const AUTH = `http://127.0.0.1:${firebaseJson.emulators.auth.port}`;
const FIRESTORE = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${PROJECT}/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner' };
const FIXED_TIME = new Date('2026-01-01T12:00:00.000Z');

interface FirestoreDocument {
  name: string;
  fields: Record<string, unknown>;
}

async function documents(path: string): Promise<FirestoreDocument[]> {
  const response = await fetch(`${FIRESTORE}/${path}?pageSize=1000`, { headers: OWNER });
  expect(response.ok).toBe(true);
  return ((await response.json()) as { documents?: FirestoreDocument[] }).documents ?? [];
}

async function documentStatus(path: string): Promise<number> {
  return (await fetch(`${FIRESTORE}/${path}`, { headers: OWNER })).status;
}

async function authUserIds(): Promise<string[]> {
  // the emulator has no GET /emulator/v1/.../accounts (405); batchGet is the Admin SDK listUsers call
  const response = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:batchGet?maxResults=1000`,
    {
      headers: OWNER,
    },
  );
  expect(response.ok).toBe(true);
  const body = (await response.json()) as {
    users?: { localId: string }[];
    userInfo?: { localId: string }[];
  };
  const accounts = body.users ?? body.userInfo;
  expect(accounts).toBeDefined();
  return accounts!.map((account) => account.localId);
}

// Copy real seed-shaped records into this test's own account; never delete the shared seed user.
async function copySentinelRecords(uid: string): Promise<string[]> {
  const indicators = await documents('users/seed-user-0001/indicators');
  const entries = await documents('users/seed-user-0001/entries');
  const selectedIndicators = indicators.filter((doc) =>
    SENTINELS.slice(0, 3).some((sentinel) => JSON.stringify(doc.fields).includes(sentinel)),
  );
  const note = entries.find((doc) => JSON.stringify(doc.fields).includes(SENTINELS[3]!));
  expect(selectedIndicators).toHaveLength(3);
  expect(note).toBeDefined();

  const paths: string[] = [];
  for (const [collection, records] of [
    ['indicators', selectedIndicators],
    ['entries', [note!]],
  ] as const) {
    for (const record of records) {
      const id = record.name.split('/').at(-1)!;
      const path = `users/${uid}/${collection}/${id}`;
      const response = await fetch(`${FIRESTORE}/${path}`, {
        method: 'PATCH',
        headers: { ...OWNER, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: record.fields }),
      });
      expect(response.ok).toBe(true);
      paths.push(path);
    }
  }
  return paths;
}

async function openSettings(page: Page) {
  await page.clock.setFixedTime(FIXED_TIME);
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
}

async function openDeletion(page: Page) {
  await page.getByRole('button', { name: /excluir conta/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(/EXCLUIR/);
  return dialog;
}

async function latestEmailLink(email: string): Promise<string> {
  let link = '';
  await expect
    .poll(
      async () => {
        const response = await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`);
        expect(response.ok).toBe(true);
        const { oobCodes } = (await response.json()) as {
          oobCodes: { email: string; requestType: string; oobLink: string }[];
        };
        link =
          oobCodes.filter((code) => code.email === email && code.requestType === 'EMAIL_SIGNIN').at(-1)
            ?.oobLink ?? '';
        return link;
      },
      { timeout: 15_000 },
    )
    .not.toBe('');
  return link;
}

async function linkEmail(page: Page, uid: string) {
  // Auth stores e-mails in lower case; a mixed-case UID would never match the stored address
  const email = `delete-${uid.toLowerCase()}@example.com`;
  await openSettings(page);
  await page.getByRole('button', { name: /enviar link mágico/i }).click();
  const field = page.getByLabel(/e-mail/i);
  await field.fill(email);
  await field.press('Enter');
  await page.goto(await latestEmailLink(email));
  await expect(page.getByTestId('account-status')).toContainText(email, { timeout: 15_000 });
  expect(await currentUid(page)).toBe(uid);
}

async function expectNoPreviousData(page: Page) {
  for (const path of [
    '/onboarding',
    '/dashboard',
    '/register',
    '/indicators',
    '/saved-insights',
    '/settings',
  ]) {
    await page.goto(path);
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).not.toHaveText('Pulsar');
    await page.waitForLoadState('networkidle');
    const exposed = await page.evaluate(() => {
      const attributes = Array.from(document.querySelectorAll('*')).flatMap((element) =>
        Array.from(element.attributes)
          .filter((attribute) => attribute.name === 'title' || attribute.name.startsWith('aria-'))
          .map((attribute) => attribute.value),
      );
      const tooltips = Array.from(document.querySelectorAll('[role="tooltip"]')).map(
        (element) => element.textContent ?? '',
      );
      return [document.body.innerText, ...attributes, ...tooltips].join('\n');
    });
    for (const sentinel of SENTINELS) expect(exposed).not.toContain(sentinel);
  }
}

test.describe('account deletion and sign-out', () => {
  test('settings opens without horizontal overflow (desktop smoke)', async ({ freshUserPage: page }) => {
    await openSettings(page);
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test('deletion requires the exact confirmation and can be cancelled', async ({
    freshUserPage: page,
  }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;
    const uid = (await currentUid(page))!;
    const paths = await copySentinelRecords(uid);
    await openSettings(page);
    const dialog = await openDeletion(page);
    const field = dialog.getByRole('textbox');
    const confirm = dialog.getByRole('button', { name: /excluir/i });
    await expect(confirm).toBeDisabled();
    for (const value of ['excluir', 'EXCLUI', 'EXCLUIR!', ' EXCLUIR']) {
      await field.fill(value);
      await expect(confirm).toBeDisabled();
    }
    await field.fill('EXCLUIR');
    await expect(confirm).toBeEnabled();
    await field.fill('');
    await expect(confirm).toBeDisabled();
    await dialog.getByRole('button', { name: /cancelar/i }).click();
    await expect(dialog).toBeHidden();
    expect(await currentUid(page)).toBe(uid);
    for (const path of paths) expect(await documentStatus(path)).toBe(200);
  });

  test('a linked account must reauthenticate before it can be deleted', async ({
    freshUserPage: page,
  }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;
    const uid = (await currentUid(page))!;
    const paths = await copySentinelRecords(uid);
    await linkEmail(page, uid);
    const dialog = await openDeletion(page);
    await dialog.getByRole('textbox').fill('EXCLUIR');
    await dialog.getByRole('button', { name: /excluir/i }).click();

    await expect(
      page
        .getByText(
          /reautentica|autentique novamente|entrar novamente|confirmar (sua )?identidade|verificar (sua )?identidade/i,
        )
        .first(),
    ).toBeVisible();
    expect(await currentUid(page)).toBe(uid);
    expect(await documentStatus(`users/${uid}`)).toBe(200);
    for (const path of paths) expect(await documentStatus(path)).toBe(200);
  });

  test('deletion removes the old account and starts a clean anonymous session', async ({
    freshUserPage: page,
  }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;
    const oldUid = (await currentUid(page))!;
    const paths = await copySentinelRecords(oldUid);
    for (const path of paths) expect(await documentStatus(path)).toBe(200);
    expect(await authUserIds()).toContain(oldUid);
    await openSettings(page);
    const dialog = await openDeletion(page);
    await dialog.getByRole('textbox').fill('EXCLUIR');
    await dialog.getByRole('button', { name: /excluir/i }).click();

    await expect(page).toHaveURL(/\/onboarding(?:[?#].*)?$/, { timeout: 30_000 });
    await expect
      .poll(
        async () => {
          const uid = await currentUid(page);
          return uid !== null && uid !== oldUid;
        },
        { timeout: 30_000 },
      )
      .toBe(true);
    const newUid = (await currentUid(page))!;
    expect(newUid).toBeTruthy();
    await expect.poll(() => documentStatus(`users/${oldUid}`)).toBe(404);
    for (const path of paths) expect(await documentStatus(path)).toBe(404);
    expect(await documentStatus(`users/${newUid}`)).toBe(200);
    const remainingAccounts = await authUserIds();
    expect(remainingAccounts).toContain(newUid);
    expect(remainingAccounts).not.toContain(oldUid);
    await expectNoPreviousData(page);
    await expect(page.getByTestId('account-status')).toContainText(/conta anônima/i);
    await page.reload();
    await expect.poll(() => currentUid(page)).toBe(newUid);
  });

  test('anonymous sign-out requires an explicit confirmation and warns about lost access', async ({
    freshUserPage: page,
  }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;
    const oldUid = (await currentUid(page))!;
    const paths = await copySentinelRecords(oldUid);
    await openSettings(page);
    await page.getByRole('button', { name: /sair/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/perder|inacessível/i);
    await expect(dialog).toContainText(/acesso|dados|registros/i);
    expect(await currentUid(page)).toBe(oldUid);
    await dialog.getByRole('button', { name: /cancelar/i }).click();
    await expect(dialog).toBeHidden();
    expect(await currentUid(page)).toBe(oldUid);
    for (const path of paths) expect(await documentStatus(path)).toBe(200);

    await page.getByRole('button', { name: /sair/i }).click();
    await dialog.getByRole('button', { name: /sair|confirmar/i }).click();
    await expect
      .poll(
        async () => {
          const uid = await currentUid(page);
          return uid !== null && uid !== oldUid;
        },
        { timeout: 30_000 },
      )
      .toBe(true);
    expect(await currentUid(page)).toBeTruthy();
    await expect(page).toHaveURL(/\/onboarding(?:[?#].*)?$/, { timeout: 30_000 });
    for (const path of paths) expect(await documentStatus(path)).toBe(200);
    await expectNoPreviousData(page);
    await expect(page.getByTestId('account-status')).toContainText(/conta anônima/i);
  });
});
