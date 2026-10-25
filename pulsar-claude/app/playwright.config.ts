import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:4173';

// `mobile` is the real target. `desktop` is only a smoke check: the mobile layout must stretch without breaking.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: 'yarn e2e:serve',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 240_000,
    // SIGINT lets `firebase emulators:exec` stop the Java emulators; the default SIGKILL leaves them orphaned on their ports.
    gracefulShutdown: { signal: 'SIGINT', timeout: 15_000 },
  },
});
