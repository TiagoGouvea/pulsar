import { expect, test, type Page } from '@playwright/test';

const AUTH = 'http://127.0.0.1:9299';
const FIRESTORE = 'http://127.0.0.1:8282';
const PROJECT = 'demo-pulsar';
const OWNER = { Authorization: 'Bearer owner' };

// Reads the UID of the signed-in user from the Firebase SDK persistence (IndexedDB).
async function readUid(page: Page): Promise<string> {
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            new Promise<string | null>((resolve) => {
              const open = indexedDB.open('firebaseLocalStorageDb');
              open.onerror = () => resolve(null);
              open.onsuccess = () => {
                const db = open.result;
                if (!db.objectStoreNames.contains('firebaseLocalStorage')) return resolve(null);
                const req = db
                  .transaction('firebaseLocalStorage')
                  .objectStore('firebaseLocalStorage')
                  .getAll();
                req.onerror = () => resolve(null);
                req.onsuccess = () => {
                  const row = (req.result as { value?: { uid?: string } }[]).find((r) => r.value?.uid);
                  resolve(row?.value?.uid ?? null);
                };
              };
            }),
        ),
      { timeout: 15_000 },
    )
    .not.toBeNull();
  return page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const open = indexedDB.open('firebaseLocalStorageDb');
        open.onsuccess = () => {
          const req = open.result
            .transaction('firebaseLocalStorage')
            .objectStore('firebaseLocalStorage')
            .getAll();
          req.onsuccess = () =>
            resolve(
              (req.result as { value?: { uid?: string } }[]).find((r) => r.value?.uid)?.value?.uid ?? '',
            );
        };
      }),
  );
}

async function userDoc(request: import('@playwright/test').APIRequestContext, uid: string) {
  const res = await request.get(
    `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`,
    {
      headers: OWNER,
    },
  );
  return res.ok() ? ((await res.json()) as { fields: Record<string, Record<string, unknown>> }) : null;
}

async function accountCount(request: import('@playwright/test').APIRequestContext) {
  const res = await request.get(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { headers: OWNER });
  return ((await res.json()) as { userInfo?: unknown[] }).userInfo?.length ?? 0;
}

test.describe('anonymous start', () => {
  test('first visit enters without signup, email or login screen', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.locator('input[type="email"], input[type="password"], input[type="tel"]')).toHaveCount(
      0,
    );
    const text = (await page.locator('body').innerText()).toLowerCase();
    expect(text).not.toMatch(/entrar|login|criar conta|senha/);
    await readUid(page);
  });

  test('reload keeps the same uid and creates no new account', async ({ page, request }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding$/);
    const uid = await readUid(page);
    const before = await accountCount(request);
    await page.reload();
    await expect(page).toHaveURL(/\/onboarding$/);
    expect(await readUid(page)).toBe(uid);
    expect(await accountCount(request)).toBe(before);
  });

  test('users/{uid} is created once with defaults', async ({ page, request }) => {
    await page.goto('/');
    const uid = await readUid(page);
    await expect.poll(() => userDoc(request, uid)).not.toBeNull();
    const first = (await userDoc(request, uid))!;
    expect(first.fields.onboardingCompleted).toEqual({ booleanValue: false });
    expect(first.fields.aiConsent).toEqual({ booleanValue: false });
    expect(first.fields.reminderEnabled).toEqual({ booleanValue: false });
    expect(first.fields.createdAt).toHaveProperty('timestampValue');

    await page.reload();
    await expect(page).toHaveURL(/\/onboarding$/);
    const second = (await userDoc(request, uid))!;
    expect(second.fields.createdAt).toEqual(first.fields.createdAt);
  });

  test('completed onboarding redirects / to /dashboard', async ({ page, request }) => {
    await page.goto('/');
    const uid = await readUid(page);
    await expect.poll(() => userDoc(request, uid)).not.toBeNull();
    const res = await request.patch(
      `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=onboardingCompleted`,
      { headers: OWNER, data: { fields: { onboardingCompleted: { booleanValue: true } } } },
    );
    expect(res.ok()).toBe(true);
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(await readUid(page)).toBe(uid);
  });

  test('network error shows a pt-BR message and no success state', async ({ page }) => {
    await page.route('**/accounts:signUp*', (route) => route.abort('connectionfailed'));
    await page.goto('/');
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await expect(alert).toContainText(/conex|rede|internet/i);
    await expect(page).not.toHaveURL(/\/(onboarding|dashboard)$/);
  });

  test('desktop-size smoke: app opens', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding$/);
  });
});
