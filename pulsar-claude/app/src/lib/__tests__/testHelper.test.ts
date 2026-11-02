import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  currentUser: null as { uid: string } | null,
  signInCalls: [] as string[],
}));

vi.mock('../firebase', () => ({
  auth: {
    get currentUser() {
      return h.currentUser;
    },
  },
}));

vi.mock('firebase/auth', () => ({
  signInWithCustomToken: async (_auth: unknown, token: string) => {
    h.signInCalls.push(token);
    h.currentUser = { uid: 'seed-user-0001' };
    return { user: h.currentUser };
  },
}));

import { installTestHelper } from '../testHelper';

beforeEach(() => {
  h.currentUser = null;
  h.signInCalls = [];
  delete window.__pulsarTest;
});

describe('test helper', () => {
  it('installs the helper on the window', () => {
    installTestHelper();
    expect(typeof window.__pulsarTest).toBe('object');
    expect(window.__pulsarTest?.currentUid()).toBeNull();
  });

  it('signs in with a custom token and reports the signed-in uid', async () => {
    installTestHelper();
    const uid = await window.__pulsarTest?.signInWithCustomToken('custom-token');
    expect(uid).toBe('seed-user-0001');
    expect(h.signInCalls).toEqual(['custom-token']);
    expect(window.__pulsarTest?.currentUid()).toBe('seed-user-0001');
  });
});
