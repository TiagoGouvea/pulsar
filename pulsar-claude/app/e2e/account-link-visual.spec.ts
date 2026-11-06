import firebaseJson from '../firebase.json' with { type: 'json' };
import { expect, test } from './fixtures';

const authUrl = `http://127.0.0.1:${firebaseJson.emulators.auth.port}`;

test('account linking states @visual', async ({ freshUserPage: page }, testInfo) => {
  const email = `visual-${Date.now()}-${testInfo.project.name}@example.com`;
  const capture = async (state: string) => {
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `test-results/visual/account-${state}-${testInfo.project.name}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  };

  await page.goto('/settings');
  await expect(page.getByTestId('account-status')).toBeVisible();
  await capture('anonymous-private');
  await page.getByTestId('eye-toggle').click();
  await capture('anonymous-names');

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: /vincular com google/i }).click();
  const popup = await popupPromise;
  await expect(page.getByRole('status')).toContainText('Processando');
  await capture('google-loading');
  await popup.close();
  await expect(page.getByRole('alert')).toContainText('cancelada');
  await capture('google-error');

  await page.getByRole('button', { name: /enviar link mágico/i }).click();
  await page.getByLabel('E-mail').fill(email);
  let releaseRequest: () => void = () => {};
  const requestReleased = new Promise<void>((resolve) => (releaseRequest = resolve));
  await page.route('**/accounts:sendOobCode*', async (route) => {
    await requestReleased;
    await route.continue();
  });
  await page.getByLabel('E-mail').press('Enter');
  await expect(page.getByRole('status')).toContainText('Processando');
  await capture('email-loading');
  releaseRequest();
  await expect(page.getByRole('status')).toContainText('Link enviado');
  await capture('email-sent');

  let link = '';
  await expect
    .poll(
      async () => {
        const response = await fetch(`${authUrl}/emulator/v1/projects/demo-pulsar/oobCodes`);
        const body = (await response.json()) as { oobCodes: { email: string; oobLink: string }[] };
        link = body.oobCodes.filter((code) => code.email === email).at(-1)?.oobLink ?? '';
        return link;
      },
      { timeout: 15_000 },
    )
    .not.toBe('');
  await page.goto(link);
  await expect(page.getByTestId('account-status')).toContainText(email, { timeout: 15_000 });
  await expect(page.getByRole('status')).toContainText('Conta vinculada');
  await capture('linked');
});
