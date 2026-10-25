import { afterEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({ connectAuthEmulator: vi.fn(), connectFirestoreEmulator: vi.fn() }));

vi.mock('firebase/auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('firebase/auth')>()),
  connectAuthEmulator: sdk.connectAuthEmulator,
}));
vi.mock('firebase/firestore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('firebase/firestore')>()),
  connectFirestoreEmulator: sdk.connectFirestoreEmulator,
}));

async function loadFirebase(env: { DEV: boolean; VITE_USE_EMULATORS: string }) {
  vi.resetModules();
  vi.stubEnv('DEV', env.DEV);
  vi.stubEnv('VITE_USE_EMULATORS', env.VITE_USE_EMULATORS);
  return import('../firebase');
}

describe('firebase init', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('never connects to emulators in a production build', async () => {
    await loadFirebase({ DEV: false, VITE_USE_EMULATORS: '' });
    expect(sdk.connectAuthEmulator).not.toHaveBeenCalled();
    expect(sdk.connectFirestoreEmulator).not.toHaveBeenCalled();
  });

  it('connects to the ports from firebase.json in emulator builds', async () => {
    await loadFirebase({ DEV: false, VITE_USE_EMULATORS: 'true' });
    expect(sdk.connectAuthEmulator).toHaveBeenCalledWith(expect.anything(), 'http://localhost:9299', {
      disableWarnings: true,
    });
    expect(sdk.connectFirestoreEmulator).toHaveBeenCalledWith(expect.anything(), 'localhost', 8282);
  });
});
