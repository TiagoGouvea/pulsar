import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  db: {},
  setDoc: vi.fn(),
  doc: vi.fn((_db: unknown, ...path: string[]) => ({ path })),
  serverTimestamp: vi.fn(() => ({ __serverTimestamp: true }))
}));

vi.mock('@lib/firebase/config', () => ({ db: sdk.db }));
vi.mock('firebase/firestore', () => ({
  doc: sdk.doc,
  setDoc: sdk.setDoc,
  serverTimestamp: sdk.serverTimestamp
}));

let completion: typeof import('./completion');

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  localStorage.clear();
  sdk.setDoc.mockResolvedValue(undefined);
  completion = await import('./completion');
});

describe('onboarding completion persistence', () => {
  it('writes the user document and a UID-scoped local marker', async () => {
    const result = await completion.markOnboardingCompleted('uid-one');

    expect(result).toEqual({ local: true, remote: true });
    expect(sdk.doc).toHaveBeenCalledWith(sdk.db, 'users', 'uid-one');
    expect(sdk.setDoc).toHaveBeenCalledWith(
      { path: ['users', 'uid-one'] },
      expect.objectContaining({ onboardingCompleted: true }),
      { merge: true }
    );
    expect(localStorage.getItem('pulsar.onboarding.completed')).toBe('true');
    expect(localStorage.getItem('pulsar_onboarding_completed')).toBe('true');
    expect(completion.hasCompletedOnboardingLocally('uid-one')).toBe(true);
    expect(completion.hasCompletedOnboardingLocally('uid-two')).toBe(false);
  });

  it('keeps the completion locally when Firestore is unavailable', async () => {
    sdk.setDoc.mockRejectedValue({ code: 'permission-denied' });

    await expect(completion.markOnboardingCompleted('uid-one')).resolves.toEqual({
      local: true,
      remote: false
    });
    expect(completion.hasCompletedOnboardingLocally('uid-one')).toBe(true);
  });

  it('does not write to Firestore without a session but still records local progress', async () => {
    await expect(completion.markOnboardingCompleted(null)).resolves.toEqual({
      local: true,
      remote: false
    });
    expect(sdk.setDoc).not.toHaveBeenCalled();
    expect(completion.hasCompletedOnboardingLocally()).toBe(true);
  });
});
