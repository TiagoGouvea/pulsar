import firebaseJson from '../firebase.json' with { type: 'json' };
import { currentUid, expect, test } from './fixtures';

// Companion of account-delete.spec.ts (which is protected): the linked-account flow there stops at
// the reauthentication request. This spec opens the reauthentication link, finishes the deletion and
// checks that the app restarts with a fresh anonymous session, as the account deletion review asked.

const PROJECT = 'demo-pulsar';
const AUTH = `http://127.0.0.1:${firebaseJson.emulators.auth.port}`;
const FIRESTORE = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${PROJECT}/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner' };

async function documentStatus(path: string): Promise<number> {
  return (await fetch(`${FIRESTORE}/${path}`, { headers: OWNER })).status;
}

async function authUserIds(): Promise<string[]> {
  // the emulator has no GET /emulator/v1/.../accounts (405); batchGet is the Admin SDK listUsers call
  const response = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:batchGet?maxResults=1000`,
    { headers: OWNER },
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

/** The most recent sign-in link the Auth Emulator recorded for the e-mail (what the user receives). */
async function latestSignInLink(email: string): Promise<string> {
  let link = '';
  await expect
    .poll(
      async () => {
        const response = await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`);
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

async function openDeletion(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: /excluir conta/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('account deletion after e-mail reauthentication', () => {
  test('a linked account finishes deletion after opening the reauthentication link', async ({
    freshUserPage: page,
  }, testInfo) => {
    if (testInfo.project.name !== 'mobile') return;
    const uid = (await currentUid(page))!;

    // Link the anonymous account to an e-mail (Auth stores addresses in lower case).
    const email = `reauth-${uid.toLowerCase()}@example.com`;
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
    await page.getByRole('button', { name: /enviar link mágico/i }).click();
    const field = page.getByLabel(/e-mail/i);
    await field.fill(email);
    await field.press('Enter');
    await page.goto(await latestSignInLink(email));
    await expect(page.getByTestId('account-status')).toContainText(email, { timeout: 15_000 });
    expect(await currentUid(page)).toBe(uid);

    // The first deletion attempt requires reauthentication and sends a link instead of deleting.
    let dialog = await openDeletion(page);
    await dialog.getByRole('textbox').fill('EXCLUIR');
    await dialog.getByRole('button', { name: /excluir/i }).click();
    await expect(dialog.getByText(/reautenticar/i)).toBeVisible();
    expect(await documentStatus(`users/${uid}`)).toBe(200);

    // Opening the link confirms the identity; the account is still intact afterwards.
    await page.goto(await latestSignInLink(email));
    await expect(page.getByText(/identidade confirmada/i)).toBeVisible({ timeout: 15_000 });
    expect(await currentUid(page)).toBe(uid);
    expect(await documentStatus(`users/${uid}`)).toBe(200);

    // The second attempt goes through: deletion completes and a fresh anonymous session starts.
    dialog = await openDeletion(page);
    await dialog.getByRole('textbox').fill('EXCLUIR');
    await dialog.getByRole('button', { name: /excluir/i }).click();
    await expect(page).toHaveURL(/\/onboarding(?:[?#].*)?$/, { timeout: 30_000 });
    await expect.poll(async () => (await currentUid(page)) !== uid, { timeout: 30_000 }).toBe(true);
    const newUid = (await currentUid(page))!;
    expect(newUid).toBeTruthy();
    await expect.poll(() => documentStatus(`users/${uid}`)).toBe(404);
    expect(await documentStatus(`users/${newUid}`)).toBe(200);
    const remainingAccounts = await authUserIds();
    expect(remainingAccounts).toContain(newUid);
    expect(remainingAccounts).not.toContain(uid);

    await page.goto('/settings');
    await expect(page.getByTestId('account-status')).toContainText(/conta anônima/i);
  });
});
