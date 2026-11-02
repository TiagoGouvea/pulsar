import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { currentUid, expect, test } from './fixtures';

const SEED_UID = 'seed-user-0001';
const HELPER_NAME = '__pulsarTest';

// Contract under test (implemented by F-1.05):
// - `seedPage`: a Page already signed in as the seed user through an Auth Emulator custom token.
// - `freshUserPage`: a Page with a brand-new anonymous user for each test.
// - `currentUid(page)`: resolves the UID of the signed-in user of that page.
// - `window.__pulsarTest` exists only in emulator builds.

test.describe('e2e fixtures', () => {
  test('seedPage opens the app authenticated as the seed user', async ({ seedPage }) => {
    await seedPage.goto('/');
    await expect.poll(() => currentUid(seedPage)).toBe(SEED_UID);
    // The helper is exposed in emulator builds so fixtures can sign in.
    expect(await seedPage.evaluate((name) => typeof (window as never)[name], HELPER_NAME)).toBe('object');
  });

  test('seedPage stays the same user after a reload', async ({ seedPage }) => {
    await seedPage.goto('/');
    await expect.poll(() => currentUid(seedPage)).toBe(SEED_UID);
    await seedPage.reload();
    await expect.poll(() => currentUid(seedPage)).toBe(SEED_UID);
  });

  test('freshUserPage creates a new anonymous UID', async ({ freshUserPage }) => {
    await freshUserPage.goto('/');
    await expect.poll(() => currentUid(freshUserPage)).toBeTruthy();
    expect(await currentUid(freshUserPage)).not.toBe(SEED_UID);
  });

  test('a second fresh user never shares the UID of the first', async ({ browser, freshUserPage }) => {
    await freshUserPage.goto('/');
    await expect.poll(() => currentUid(freshUserPage)).toBeTruthy();
    const first = await currentUid(freshUserPage);
    const otherContext = await browser.newContext();
    const other = await otherContext.newPage();
    await other.goto('/');
    await expect.poll(() => currentUid(other)).toBeTruthy();
    expect(await currentUid(other)).not.toBe(first);
    await otherContext.close();
  });
});

test.describe('production build', () => {
  test('dist contains no test helper', async () => {
    test.setTimeout(240_000);
    const outDir = mkdtempSync(join(tmpdir(), 'pulsar-prod-'));
    try {
      execFileSync('yarn', ['build', '--outDir', outDir, '--emptyOutDir'], {
        cwd: process.cwd(),
        env: { ...process.env, VITE_USE_EMULATORS: '' },
        stdio: 'pipe',
      });
      expect(existsSync(join(outDir, 'index.html'))).toBe(true);
      const hits: string[] = [];
      const walk = (dir: string) => {
        for (const entry of readdirSync(dir)) {
          const path = join(dir, entry);
          if (statSync(path).isDirectory()) walk(path);
          else if (/\.(js|mjs|html|map)$/.test(entry) && readFileSync(path, 'utf8').includes(HELPER_NAME))
            hits.push(path);
        }
      };
      walk(outDir);
      expect(hits).toEqual([]);
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
