import { expect, test } from '@playwright/test';

test('initial session stays blank until onboarding is ready', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-01-15T12:00:00Z'));

  if (testInfo.project.name === 'desktop') {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Observe sua rotina sem burocracia' })).toBeVisible();
    return;
  }

  let releaseSignIn = () => {};
  const signInGate = new Promise<void>((resolve) => {
    releaseSignIn = resolve;
  });
  let signInStarted = false;
  await page.route('**/accounts:signUp*', async (route) => {
    signInStarted = true;
    await signInGate;
    await route.continue();
  });

  await page.addInitScript(() => {
    const recordVisibleMessage = () => {
      if (document.body?.innerText.includes('Preparando seu espaço')) {
        sessionStorage.setItem('initialSessionMessageSeen', 'true');
      }
    };
    new MutationObserver(recordVisibleMessage).observe(document, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });
    recordVisibleMessage();
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  try {
    await expect.poll(() => signInStarted).toBe(true);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
    );

    const visibleText = await page.locator('body').innerText();
    const screenshot = await page.screenshot();
    const nonBackgroundPixels = await page.evaluate(async (base64) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable');
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let different = 0;
      for (let index = 4; index < pixels.length; index += 4) {
        if (
          pixels[index] !== pixels[0] ||
          pixels[index + 1] !== pixels[1] ||
          pixels[index + 2] !== pixels[2] ||
          pixels[index + 3] !== pixels[3]
        ) {
          different++;
        }
      }
      return different;
    }, screenshot.toString('base64'));

    expect.soft(visibleText.trim(), 'the loading screen has no visible text').toBe('');
    expect.soft(nonBackgroundPixels, 'the loading screen contains only its background').toBe(0);
  } finally {
    releaseSignIn();
  }

  await expect(page.getByRole('heading', { name: 'Observe sua rotina sem burocracia' })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('initialSessionMessageSeen'))).toBeNull();
});
