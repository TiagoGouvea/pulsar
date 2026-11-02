import { expect, test as base, type BrowserContextOptions, type Page, type TestInfo } from '@playwright/test';

export { expect };

/** UID of the seeded user (see scripts/seed-data.ts). */
export const SEED_UID = 'seed-user-0001';

const AUTH_PROJECT = 'demo-pulsar';
const CUSTOM_TOKEN_AUDIENCE =
  'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

export interface E2EFixtures {
  /** App opened with the seeded user already signed in (custom token of the Auth Emulator). */
  seedPage: Page;
  /** App opened with a brand new anonymous user (one UID per test). */
  freshUserPage: Page;
}

function base64url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

/**
 * Custom token accepted by the Auth Emulator. The emulator does not validate the signature of a
 * custom token (it only checks the payload), so an unsigned JWT is enough for the e2e suite.
 */
export function createCustomToken(uid: string, projectId = AUTH_PROJECT): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      iss: `https://securetoken.google.com/${projectId}`,
      sub: uid,
      aud: CUSTOM_TOKEN_AUDIENCE,
      iat: issuedAt,
      exp: issuedAt + 3600,
      uid,
    }),
  );
  return `${header}.${payload}.`;
}

/** UID of the user signed in on the given page (null while there is no session). */
export async function currentUid(page: Page): Promise<string | null> {
  return page.evaluate(() => window.__pulsarTest?.currentUid() ?? null);
}

/** The test helper only exists in dev/emulator builds (never in a production bundle). */
async function waitForTestHelper(page: Page): Promise<void> {
  await page.waitForFunction(() => typeof window.__pulsarTest === 'object', undefined, {
    timeout: 30_000,
  });
}

/** Context options of the running project (viewport, locale, timezone...) for isolated contexts. */
function contextOptions(testInfo: TestInfo): BrowserContextOptions {
  const use = testInfo.project.use;
  const options: BrowserContextOptions = {};
  if (use.baseURL !== undefined) options.baseURL = use.baseURL;
  if (use.locale !== undefined) options.locale = use.locale;
  if (use.timezoneId !== undefined) options.timezoneId = use.timezoneId;
  if (use.viewport !== undefined) options.viewport = use.viewport;
  if (use.deviceScaleFactor !== undefined) options.deviceScaleFactor = use.deviceScaleFactor;
  if (use.isMobile !== undefined) options.isMobile = use.isMobile;
  if (use.hasTouch !== undefined) options.hasTouch = use.hasTouch;
  return options;
}

export const test = base.extend<E2EFixtures>({
  seedPage: async ({ browser }, use, testInfo) => {
    const context = await browser.newContext(contextOptions(testInfo));
    const page = await context.newPage();
    try {
      await page.goto('/');
      await waitForTestHelper(page);
      // The app signs in anonymously on the first visit: wait for that session to settle before
      // replacing it, so the custom token sign-in is always the last one.
      await expect.poll(() => currentUid(page), { timeout: 30_000 }).not.toBeNull();
      await page.evaluate(async (token) => {
        const helper = window.__pulsarTest;
        if (!helper) throw new Error('window.__pulsarTest is not available');
        await helper.signInWithCustomToken(token);
      }, createCustomToken(SEED_UID));
      await expect.poll(() => currentUid(page), { timeout: 30_000 }).toBe(SEED_UID);
      await use(page);
    } finally {
      await context.close();
    }
  },

  freshUserPage: async ({ browser }, use, testInfo) => {
    const context = await browser.newContext(contextOptions(testInfo));
    const page = await context.newPage();
    try {
      // Open the app once so the anonymous session of this test already exists.
      await page.goto('/');
      await waitForTestHelper(page);
      await expect.poll(() => currentUid(page), { timeout: 30_000 }).not.toBeNull();
      await use(page);
    } finally {
      await context.close();
    }
  },
});
