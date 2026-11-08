import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT) || 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || './test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 15'] }
    }
  ],

  webServer: {
    command: `yarn dev --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    env: {
      VITE_USE_FIREBASE_EMULATORS: 'true',
      VITE_FIREBASE_PROJECT_ID: 'demo-pulsar-codex',
      VITE_FIREBASE_API_KEY: 'demo-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'demo-pulsar-codex.firebaseapp.com',
      VITE_FIREBASE_APP_ID: 'demo-app'
    }
  }
});
