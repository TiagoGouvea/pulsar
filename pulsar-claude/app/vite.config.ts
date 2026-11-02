import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  server: { port: 4791, strictPort: true },
  preview: { port: 4792, strictPort: true },
  define: {
    // Test-only bridge (src/lib/testHelper.ts): available in dev/emulator builds, never in production.
    // Being a build-time constant, Rollup drops the whole branch (and the helper) from a prod build.
    __PULSAR_TEST_HELPER__: JSON.stringify(
      mode !== 'production' || process.env.VITE_USE_EMULATORS === 'true',
    ),
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text-summary', 'html', 'json-summary'],
      include: ['src/**/*.{ts,tsx}', 'scripts/**/*.ts'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'scripts/seed.ts'],
    },
  },
}));
