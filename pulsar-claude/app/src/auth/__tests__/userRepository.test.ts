import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const writes: { path: string; data: Record<string, unknown>; options: unknown }[] = [];
  return { writes };
});

vi.mock('../../lib/firebase', () => ({ auth: { __fake: 'auth' }, db: { __fake: 'db' } }));

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  // The merge option matters: completing onboarding must never recreate the document.
  setDoc: async (ref: { path: string }, data: Record<string, unknown>, options: unknown) => {
    h.writes.push({ path: ref.path, data, options });
  },
  onSnapshot: () => () => {},
  runTransaction: () => Promise.resolve({ onboardingCompleted: false }),
  serverTimestamp: () => null,
}));

import { completeOnboarding } from '../userRepository';

describe('completeOnboarding', () => {
  beforeEach(() => {
    h.writes.length = 0;
  });

  it('records onboardingCompleted=true on users/{uid} with a merge-set', async () => {
    await completeOnboarding('uid-1');
    expect(h.writes).toEqual([
      { path: 'users/uid-1', data: { onboardingCompleted: true }, options: { merge: true } },
    ]);
  });
});
