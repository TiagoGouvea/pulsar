import type { APIRequestContext, Page } from '@playwright/test';
import firebaseJson from '../firebase.json' with { type: 'json' };
import { currentUid, expect, test } from './fixtures';

const PROJECT = 'demo-pulsar';
const FIRESTORE_DOCUMENTS = `http://127.0.0.1:${firebaseJson.emulators.firestore.port}/v1/projects/${PROJECT}/databases/(default)/documents`;
const OWNER = { Authorization: 'Bearer owner' };

/** UID of the signed-in user, waiting for the anonymous session to settle. */
async function signedInUid(page: Page): Promise<string> {
  await expect.poll(() => currentUid(page), { timeout: 30_000 }).not.toBeNull();
  return (await currentUid(page)) ?? '';
}

/** Day key (YYYY-MM-DD) of the day that ended `daysAgo` days ago, in UTC. */
function dayKey(daysAgo: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

/** Writes an entry straight into the Firestore emulator (rules bypassed as owner). */
async function createEntry(
  request: APIRequestContext,
  uid: string,
  day: string,
  index: number,
): Promise<void> {
  const response = await request.patch(`${FIRESTORE_DOCUMENTS}/users/${uid}/entries/e2e-${day}-${index}`, {
    headers: OWNER,
    data: {
      fields: {
        indicatorId: { stringValue: 'e2e-indicator' },
        localDate: { stringValue: day },
        recordedAt: { timestampValue: new Date().toISOString() },
        valueType: { stringValue: 'numeric' },
        value: { mapValue: { fields: { number: { doubleValue: 7 } } } },
      },
    },
  });
  expect(response.ok()).toBeTruthy();
}

/** Reads users/{uid} straight from the Firestore emulator (rules bypassed as owner). */
async function userDoc(request: APIRequestContext, uid: string) {
  const response = await request.get(`${FIRESTORE_DOCUMENTS}/users/${uid}`, { headers: OWNER });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as {
    fields: Record<string, Record<string, unknown>>;
  };
}

test.describe('save account invite banner', () => {
  test('stays hidden with fewer than three distinct days with entries', async ({
    freshUserPage: page,
    request,
  }) => {
    await page.goto('/');
    const uid = await signedInUid(page);

    await createEntry(request, uid, dayKey(2), 1);
    await createEntry(request, uid, dayKey(1), 1);

    await page.goto('/dashboard');
    await expect(page.getByTestId('save-account-invite-slot')).toHaveAttribute('data-invite-state', 'hidden');
    await expect(page.getByTestId('save-account-invite')).toHaveCount(0);
  });

  test('shows on the third day, can be dismissed and comes back after seven more days', async ({
    freshUserPage: page,
    request,
  }) => {
    await page.goto('/');
    const uid = await signedInUid(page);

    await createEntry(request, uid, dayKey(3), 1);
    await createEntry(request, uid, dayKey(2), 2);
    await createEntry(request, uid, dayKey(1), 3);

    await page.goto('/dashboard');
    const banner = page.getByTestId('save-account-invite');
    await expect(banner).toBeVisible();
    // The invite leads to the account conversion and never blocks the rest of the dashboard.
    await expect(banner.getByRole('link', { name: /Salvar minha conta/ })).toHaveAttribute(
      'href',
      '/settings',
    );
    await expect(page.getByRole('link', { name: 'Registrar agora' })).toBeVisible();

    await banner.getByRole('button', { name: 'Agora não' }).click();
    await expect(banner).toHaveCount(0);

    const stored = await userDoc(request, uid);
    expect(stored.fields.saveAccountInviteDismissedDayCount).toEqual({ integerValue: '3' });
    expect(stored.fields.saveAccountInviteDismissedAt).toHaveProperty('timestampValue');

    // The dismissal survives a reload.
    await page.reload();
    await expect(page.getByTestId('save-account-invite')).toHaveCount(0);

    // Seven more distinct days with entries bring the invite back.
    for (const [index, daysAgo] of [9, 8, 7, 6, 5, 4, 0].entries()) {
      await createEntry(request, uid, dayKey(daysAgo), index);
    }
    await page.reload();
    await expect(page.getByTestId('save-account-invite')).toBeVisible();
  });

  test('never shows for an account that was already converted', async ({ seedPage: page }) => {
    await page.goto('/dashboard');
    await expect(page.getByTestId('save-account-invite-slot')).toHaveAttribute('data-invite-state', 'hidden');
    await expect(page.getByTestId('save-account-invite')).toHaveCount(0);
  });
});
