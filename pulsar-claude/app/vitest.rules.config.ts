import { defineConfig } from 'vitest/config';

// Firestore Security Rules tests. Run through `yarn test:rules`, which starts the emulator.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    testTimeout: 20000,
    fileParallelism: false,
  },
});
