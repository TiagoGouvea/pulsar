import { defineConfig } from 'vitest/config';

// Functions tests run against the Firebase emulators, so they use the Node environment
// (no jsdom/Coverage config inherited from the app workspace).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
