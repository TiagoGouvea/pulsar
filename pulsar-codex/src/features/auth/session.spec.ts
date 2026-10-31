import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  auth: { currentUser: null as any, authStateReady: vi.fn() },
  setPersistence: vi.fn(), signInAnonymously: vi.fn(), linkWithPopup: vi.fn(),
  linkWithCredential: vi.fn(), signInWithPopup: vi.fn(), signInWithEmailLink: vi.fn(),
  sendSignInLinkToEmail: vi.fn(), reauthenticateWithPopup: vi.fn(),
  reauthenticateWithCredential: vi.fn(), signOut: vi.fn(), remove: vi.fn(),
  isSignInWithEmailLink: vi.fn(), credentialWithLink: vi.fn()
}));
vi.mock('@lib/firebase/config', () => ({ auth: sdk.auth, functions: {} }));
vi.mock('firebase/auth', () => ({
  ...sdk,
  browserLocalPersistence: 'local',
  GoogleAuthProvider: class { setCustomParameters() {} },
  EmailAuthProvider: { credentialWithLink: sdk.credentialWithLink }
}));
vi.mock('firebase/functions', () => ({ httpsCallable: () => sdk.remove }));

const originalUser = () => ({ uid: 'original-uid', isAnonymous: true, email: 'me@example.com', getIdToken: vi.fn() });
let session: typeof import('./session');

beforeEach(async () => {
  vi.resetModules();
  vi.resetAllMocks();
  localStorage.clear();
  window.history.replaceState(null, '', '/account');
  sdk.auth.currentUser = originalUser();
  sdk.signOut.mockImplementation(async () => { sdk.auth.currentUser = null; });
  sdk.credentialWithLink.mockReturnValue({ providerId: 'password' });
  session = await import('./session');
});

async function prepareLink(intent: 'link' | 'login' | 'reauthenticate' = 'link') {
  await session.sendEmailLink('me@example.com', intent);
  const settings = sdk.sendSignInLinkToEmail.mock.calls.at(-1)![2];
  window.history.replaceState(null, '', `${new URL(settings.url).pathname}${new URL(settings.url).search}&mode=signIn&oobCode=secret`);
  sdk.isSignInWithEmailLink.mockReturnValue(true);
}

describe('session initialization and logout', () => {
  it('creates one anonymous user with local persistence, including concurrent bootstrap calls', async () => {
    sdk.auth.currentUser = null;
    sdk.signInAnonymously.mockImplementation(async () => { sdk.auth.currentUser = originalUser(); });
    await Promise.all([session.initializeSession(), session.initializeSession()]);
    expect(sdk.setPersistence).toHaveBeenCalledWith(sdk.auth, 'local');
    expect(sdk.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('restores an existing UID without creating an anonymous replacement', async () => {
    await session.initializeSession();
    expect(sdk.signInAnonymously).not.toHaveBeenCalled();
    expect(sdk.auth.currentUser.uid).toBe('original-uid');
  });

  it('does not auto-create after logout, but allows an explicit anonymous restart', async () => {
    await session.logout();
    await session.initializeSession();
    expect(sdk.signInAnonymously).not.toHaveBeenCalled();
    await session.startAnonymousSession();
    expect(sdk.signInAnonymously).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('pulsar.auth.signedOut')).toBeNull();
  });

  it('shares concurrent explicit anonymous starts', async () => {
    sdk.auth.currentUser = null;
    sdk.signInAnonymously.mockImplementation(async () => {
      await Promise.resolve();
      sdk.auth.currentUser = originalUser();
    });
    await Promise.all([session.startAnonymousSession(), session.startAnonymousSession()]);
    expect(sdk.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('does not create a user while a magic link is unresolved', async () => {
    sdk.auth.currentUser = null;
    sdk.isSignInWithEmailLink.mockReturnValue(true);
    await session.initializeSession();
    expect(sdk.signInAnonymously).not.toHaveBeenCalled();
    await expect(session.startAnonymousSession()).rejects.toMatchObject({ code: 'account/pending-link' });
  });

  it('propagates anonymous initialization failures and permits an explicit retry', async () => {
    sdk.auth.currentUser = null;
    sdk.signInAnonymously.mockRejectedValueOnce({ code: 'auth/network-request-failed' });
    await expect(session.initializeSession()).rejects.toMatchObject({ code: 'auth/network-request-failed' });
    await session.initializeSession();
    expect(sdk.signInAnonymously).toHaveBeenCalledTimes(2);
  });
});

describe('linking preserves identity', () => {
  it('links Google to the current user, never signs in over it', async () => {
    sdk.linkWithPopup.mockResolvedValue({ user: sdk.auth.currentUser });
    await session.linkGoogle();
    expect(sdk.linkWithPopup).toHaveBeenCalledWith(sdk.auth.currentUser, expect.anything());
    expect(sdk.signInWithPopup).not.toHaveBeenCalled();
    expect(sdk.auth.currentUser.uid).toBe('original-uid');
  });

  it.each(['auth/credential-already-in-use', 'auth/account-exists-with-different-credential', 'auth/popup-closed-by-user'])('does not replace, delete or merge on %s', async (code) => {
    sdk.linkWithPopup.mockRejectedValue({ code });
    await expect(session.linkGoogle()).rejects.toMatchObject({ code });
    expect(sdk.auth.currentUser.uid).toBe('original-uid');
    expect(sdk.signInWithPopup).not.toHaveBeenCalled();
    expect(sdk.signOut).not.toHaveBeenCalled();
    expect(sdk.remove).not.toHaveBeenCalled();
  });

  it('rejects an unexpected UID in a link result', async () => {
    sdk.linkWithPopup.mockResolvedValue({ user: { uid: 'other' } });
    await expect(session.linkGoogle()).rejects.toMatchObject({ code: 'account/uid-mismatch' });
  });

  it('completes email linking with the saved address and original UID', async () => {
    await prepareLink();
    sdk.linkWithCredential.mockResolvedValue({ user: sdk.auth.currentUser });
    await expect(session.completeEmailLink()).resolves.toBe('link');
    expect(sdk.credentialWithLink).toHaveBeenCalledWith('me@example.com', expect.stringContaining('oobCode=secret'));
    expect(sdk.linkWithCredential).toHaveBeenCalledWith(sdk.auth.currentUser, { providerId: 'password' });
    expect(sdk.signInWithEmailLink).not.toHaveBeenCalled();
    expect(session.getPendingEmailLink()).toBeNull();
    expect(window.location.search).toBe('');
  });

  it.each(['missing', 'different-uid', 'different-request'])('blocks cross-device/session email links: %s', async (condition) => {
    await prepareLink();
    if (condition === 'missing') localStorage.clear();
    if (condition === 'different-uid') sdk.auth.currentUser = { uid: 'other' };
    if (condition === 'different-request') window.history.replaceState(null, '', '/account?session=wrong');
    await expect(session.completeEmailLink()).rejects.toBeDefined();
    expect(sdk.linkWithCredential).not.toHaveBeenCalled();
    expect(sdk.signInWithEmailLink).not.toHaveBeenCalled();
    expect(sdk.signInAnonymously).not.toHaveBeenCalled();
  });

  it.each(['auth/email-already-in-use', 'auth/expired-action-code'])('keeps data and identity after email failure: %s', async (code) => {
    await prepareLink();
    sdk.linkWithCredential.mockRejectedValue({ code });
    await expect(session.completeEmailLink()).rejects.toMatchObject({ code });
    expect(sdk.auth.currentUser.uid).toBe('original-uid');
    expect(sdk.signInWithEmailLink).not.toHaveBeenCalled();
    expect(sdk.remove).not.toHaveBeenCalled();
  });

  it('restores the previous pending request if sending fails', async () => {
    await session.sendEmailLink('first@example.com', 'link');
    sdk.sendSignInLinkToEmail.mockRejectedValue({ code: 'auth/network-request-failed' });
    await expect(session.sendEmailLink('second@example.com', 'link')).rejects.toBeDefined();
    expect(session.getPendingEmailLink()?.email).toBe('first@example.com');
  });
});

describe('reauthentication and deletion', () => {
  it('reauthenticates Google without changing the active user', async () => {
    sdk.reauthenticateWithPopup.mockResolvedValue({ user: sdk.auth.currentUser });
    await session.reauthenticateGoogle();
    expect(sdk.auth.currentUser.getIdToken).toHaveBeenCalledWith(true);
    expect(sdk.signInWithPopup).not.toHaveBeenCalled();
  });

  it('reauthenticates email links without automatically deleting afterwards', async () => {
    await prepareLink('reauthenticate');
    sdk.reauthenticateWithCredential.mockResolvedValue({ user: sdk.auth.currentUser });
    await expect(session.completeEmailLink()).resolves.toBe('reauthenticate');
    expect(sdk.reauthenticateWithCredential).toHaveBeenCalled();
    expect(sdk.remove).not.toHaveBeenCalled();
  });

  it('signs out only after server-confirmed complete deletion of the original UID', async () => {
    sdk.remove.mockResolvedValue({ data: { uid: 'original-uid', deleted: true } });
    await session.deleteAccount();
    expect(sdk.remove).toHaveBeenCalledWith({});
    expect(sdk.signOut).toHaveBeenCalledTimes(1);
  });

  it.each(['functions/failed-precondition', 'functions/internal'])('preserves the session when deletion fails: %s', async (code) => {
    sdk.remove.mockRejectedValue({ code });
    await expect(session.deleteAccount()).rejects.toMatchObject({ code });
    expect(sdk.signOut).not.toHaveBeenCalled();
  });

  it('does not sign out a different session that appeared during deletion', async () => {
    sdk.remove.mockImplementation(async () => {
      sdk.auth.currentUser = { uid: 'replacement', getIdToken: vi.fn() };
      return { data: { uid: 'original-uid', deleted: true } };
    });
    await session.deleteAccount();
    expect(sdk.signOut).not.toHaveBeenCalled();
    expect(sdk.auth.currentUser.uid).toBe('replacement');
    expect(localStorage.getItem('pulsar.auth.signedOut')).toBeNull();
  });

  it('suppresses automatic anonymous recreation if the session ends during deletion', async () => {
    sdk.remove.mockImplementation(async () => {
      sdk.auth.currentUser = null;
      return { data: { uid: 'original-uid', deleted: true } };
    });
    await session.deleteAccount();
    expect(sdk.signOut).not.toHaveBeenCalled();
    expect(localStorage.getItem('pulsar.auth.signedOut')).toBe('true');
  });

  it('does not report success for a different UID or unconfirmed deletion', async () => {
    sdk.remove.mockResolvedValue({ data: { uid: 'other', deleted: true } });
    await expect(session.deleteAccount()).rejects.toMatchObject({ code: 'account/deletion-unconfirmed' });
    expect(sdk.signOut).not.toHaveBeenCalled();
  });

  it('only allows explicit login when there is no active session', async () => {
    await expect(session.loginGoogle()).rejects.toMatchObject({ code: 'account/session-exists' });
    sdk.auth.currentUser = null;
    await prepareLink('login');
    await session.completeEmailLink();
    expect(sdk.signInWithEmailLink).toHaveBeenCalled();
  });
});
