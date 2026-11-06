import { beforeEach, describe, expect, it, vi } from 'vitest';

// Contract under test (src/auth/linkAccount.ts):
//   linkWithGoogle(): Promise<LinkResult>
//   sendEmailLink(email: string): Promise<void>            (remembers the typed e-mail in localStorage)
//   completeEmailLink(href: string, typedEmail?: string): Promise<EmailLinkResult>
//   signInToExistingAccount(conflict: LinkConflict): Promise<ExistingAccountOutcome>
//   LinkResult = { status: 'linked'; uid: string } | LinkConflict
//   EmailLinkResult = LinkResult | { status: 'signed-in-existing'; uid: string }
//                    | { status: 'not-a-link' } | { status: 'needs-email' }
//   ExistingAccountOutcome = { status: 'signed-in'; uid: string } | { status: 'link-resent'; email: string }
//   LinkConflict = { status: 'conflict'; reason: 'credential-already-in-use' | 'email-already-in-use';
//                   credential: AuthCredential; email?: string }

const mocks = vi.hoisted(() => ({
  currentUser: { uid: 'anon-uid-1' } as { uid: string } | null,
  linkWithPopup: vi.fn(),
  linkWithCredential: vi.fn(),
  sendSignInLinkToEmail: vi.fn(),
  isSignInWithEmailLink: vi.fn(),
  signInWithCredential: vi.fn(),
  signOut: vi.fn(),
  unlink: vi.fn(),
  deleteUser: vi.fn(),
  credentialFromError: vi.fn(),
  credentialWithLink: vi.fn(),
  fetchSignInMethodsForEmail: vi.fn(),
  signInWithEmailLink: vi.fn(),
}));

vi.mock('../../lib/firebase', () => ({
  auth: {
    get currentUser() {
      return mocks.currentUser;
    },
  },
  db: {},
}));

vi.mock('firebase/auth', async (importOriginal) => {
  const original = await importOriginal<typeof import('firebase/auth')>();
  class GoogleAuthProvider {
    static credentialFromError = mocks.credentialFromError;
  }
  return {
    ...original,
    GoogleAuthProvider,
    EmailAuthProvider: { credentialWithLink: mocks.credentialWithLink },
    linkWithPopup: mocks.linkWithPopup,
    linkWithCredential: mocks.linkWithCredential,
    sendSignInLinkToEmail: mocks.sendSignInLinkToEmail,
    isSignInWithEmailLink: mocks.isSignInWithEmailLink,
    fetchSignInMethodsForEmail: mocks.fetchSignInMethodsForEmail,
    signInWithCredential: mocks.signInWithCredential,
    signInWithEmailLink: mocks.signInWithEmailLink,
    signOut: mocks.signOut,
    unlink: mocks.unlink,
    deleteUser: mocks.deleteUser,
  };
});

import { completeEmailLink, linkWithGoogle, sendEmailLink, signInToExistingAccount } from '../linkAccount';

const LINK_HREF = 'http://localhost/settings?apiKey=k&oobCode=abc&mode=signIn';
const EMAIL_CREDENTIAL = { providerId: 'password', signInMethod: 'emailLink' };
const GOOGLE_CREDENTIAL = { providerId: 'google.com' };

function expectNothingDestructive() {
  expect(mocks.signOut).not.toHaveBeenCalled();
  expect(mocks.unlink).not.toHaveBeenCalled();
  expect(mocks.deleteUser).not.toHaveBeenCalled();
  expect(mocks.signInWithCredential).not.toHaveBeenCalled();
  expect(mocks.signInWithEmailLink).not.toHaveBeenCalled();
}

beforeEach(() => {
  Object.values(mocks).forEach((value) => {
    if (typeof value === 'function' && 'mockReset' in value) value.mockReset();
  });
  mocks.currentUser = { uid: 'anon-uid-1' };
  mocks.credentialWithLink.mockReturnValue(EMAIL_CREDENTIAL);
  mocks.isSignInWithEmailLink.mockReturnValue(true);
  // Default: e-mail enumeration protection hides whether the address is registered (empty list).
  mocks.fetchSignInMethodsForEmail.mockResolvedValue([]);
  window.localStorage.clear();
});

describe('linkWithGoogle', () => {
  it('links Google to the current anonymous user and keeps the same UID', async () => {
    mocks.linkWithPopup.mockResolvedValue({ user: { uid: 'anon-uid-1' } });

    const result = await linkWithGoogle();

    expect(result).toEqual({ status: 'linked', uid: 'anon-uid-1' });
    expect(mocks.linkWithPopup).toHaveBeenCalledTimes(1);
    expect(mocks.linkWithPopup.mock.calls[0]?.[0]).toBe(mocks.currentUser);
    expectNothingDestructive();
  });

  it('fails loudly if the UID changed after linking', async () => {
    mocks.linkWithPopup.mockResolvedValue({ user: { uid: 'another-uid' } });

    await expect(linkWithGoogle()).rejects.toThrow();
  });

  it('reports credential-already-in-use as a conflict without signing in, merging or deleting', async () => {
    mocks.linkWithPopup.mockRejectedValue({ code: 'auth/credential-already-in-use' });
    mocks.credentialFromError.mockReturnValue(GOOGLE_CREDENTIAL);

    const result = await linkWithGoogle();

    expect(result).toEqual({
      status: 'conflict',
      reason: 'credential-already-in-use',
      credential: GOOGLE_CREDENTIAL,
    });
    expectNothingDestructive();
  });

  it('rethrows unrelated errors', async () => {
    mocks.linkWithPopup.mockRejectedValue({ code: 'auth/network-request-failed' });

    await expect(linkWithGoogle()).rejects.toMatchObject({ code: 'auth/network-request-failed' });
  });

  it('throws when there is no current user instead of creating a new one', async () => {
    mocks.currentUser = null;

    await expect(linkWithGoogle()).rejects.toThrow();
    expect(mocks.linkWithPopup).not.toHaveBeenCalled();
  });
});

describe('e-mail link', () => {
  it('sends the sign-in link for the typed address, to be opened inside the app', async () => {
    mocks.sendSignInLinkToEmail.mockResolvedValue(undefined);

    await sendEmailLink('pessoa@example.com');

    expect(mocks.sendSignInLinkToEmail).toHaveBeenCalledTimes(1);
    const [, email, settings] = mocks.sendSignInLinkToEmail.mock.calls[0] ?? [];
    expect(email).toBe('pessoa@example.com');
    expect(settings).toMatchObject({ handleCodeInApp: true });
    expect(String(settings.url)).toContain('/settings');
    expect(new URL(String(settings.url)).searchParams.get('linkUid')).toBe('anon-uid-1');
  });

  it('does not store anything if sending fails', async () => {
    mocks.sendSignInLinkToEmail.mockRejectedValue({ code: 'auth/network-request-failed' });

    await expect(sendEmailLink('pessoa@example.com')).rejects.toBeTruthy();
    const result = await completeEmailLink(LINK_HREF);
    expect(result).toEqual({ status: 'needs-email' });
  });

  it('completes the link with the e-mail remembered at send time and keeps the UID', async () => {
    mocks.sendSignInLinkToEmail.mockResolvedValue(undefined);
    mocks.linkWithCredential.mockResolvedValue({ user: { uid: 'anon-uid-1' } });

    await sendEmailLink('pessoa@example.com');
    const result = await completeEmailLink(LINK_HREF);

    expect(result).toEqual({ status: 'linked', uid: 'anon-uid-1' });
    expect(mocks.credentialWithLink).toHaveBeenCalledWith('pessoa@example.com', LINK_HREF);
    expect(mocks.linkWithCredential).toHaveBeenCalledWith(mocks.currentUser, EMAIL_CREDENTIAL);
    expectNothingDestructive();
  });

  it('asks for the e-mail when the link is opened where it was not requested', async () => {
    const result = await completeEmailLink(LINK_HREF);

    expect(result).toEqual({ status: 'needs-email' });
    expect(mocks.linkWithCredential).not.toHaveBeenCalled();
  });

  it('uses the e-mail typed again on another device', async () => {
    mocks.linkWithCredential.mockResolvedValue({ user: { uid: 'anon-uid-1' } });

    const result = await completeEmailLink(LINK_HREF, 'outro@example.com');

    expect(result).toEqual({ status: 'linked', uid: 'anon-uid-1' });
    expect(mocks.credentialWithLink).toHaveBeenCalledWith('outro@example.com', LINK_HREF);
  });

  it('does not consume a link intended for a different anonymous session', async () => {
    const href = `${LINK_HREF}&continueUrl=${encodeURIComponent('http://localhost/settings?linkUid=original-uid')}`;

    await expect(completeEmailLink(href, 'pessoa@example.com')).rejects.toMatchObject({
      code: 'auth/link-session-mismatch',
    });
    expect(mocks.linkWithCredential).not.toHaveBeenCalled();
    expectNothingDestructive();
  });

  it('ignores URLs that are not sign-in links', async () => {
    mocks.isSignInWithEmailLink.mockReturnValue(false);

    const result = await completeEmailLink('http://localhost/settings');

    expect(result).toEqual({ status: 'not-a-link' });
    expect(mocks.linkWithCredential).not.toHaveBeenCalled();
  });

  it.each(['auth/email-already-in-use', 'auth/credential-already-in-use'] as const)(
    'reports %s from the link error as a conflict carrying the credential, without side effects',
    async (code) => {
      mocks.linkWithCredential.mockRejectedValue({ code });

      const result = await completeEmailLink(LINK_HREF, 'existente@example.com');

      expect(result).toEqual({
        status: 'conflict',
        reason: code.replace('auth/', ''),
        credential: EMAIL_CREDENTIAL,
        email: 'existente@example.com',
      });
      expectNothingDestructive();
    },
  );

  it('detects the conflict without consuming the single-use code when the lookup reports the address', async () => {
    mocks.fetchSignInMethodsForEmail.mockResolvedValue(['password']);

    const result = await completeEmailLink(LINK_HREF, 'existente@example.com');

    expect(result).toEqual({
      status: 'conflict',
      reason: 'email-already-in-use',
      credential: EMAIL_CREDENTIAL,
      email: 'existente@example.com',
    });
    expect(mocks.linkWithCredential).not.toHaveBeenCalled();
    expectNothingDestructive();
  });

  it('signs into the existing account with a re-sent access link instead of linking', async () => {
    mocks.signInWithEmailLink.mockResolvedValue({ user: { uid: 'existing-uid' } });
    const href = `${LINK_HREF}&continueUrl=${encodeURIComponent('http://localhost/settings?linkUid=anon-uid-1&enterExisting=1')}`;

    const result = await completeEmailLink(href, 'existente@example.com');

    expect(result).toEqual({ status: 'signed-in-existing', uid: 'existing-uid' });
    expect(mocks.signInWithEmailLink).toHaveBeenCalledWith(expect.anything(), 'existente@example.com', href);
    expect(mocks.linkWithCredential).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it('signs into the existing account from an access link even without a current anonymous session', async () => {
    mocks.currentUser = null;
    mocks.signInWithEmailLink.mockResolvedValue({ user: { uid: 'existing-uid' } });
    const href = `${LINK_HREF}&enterExisting=1`;

    const result = await completeEmailLink(href, 'existente@example.com');

    expect(result).toEqual({ status: 'signed-in-existing', uid: 'existing-uid' });
  });
});

describe('signInToExistingAccount', () => {
  it('signs in with the conflicting credential only when called explicitly, returning the existing UID', async () => {
    mocks.signInWithCredential.mockResolvedValue({ user: { uid: 'existing-uid' } });

    const outcome = await signInToExistingAccount({
      status: 'conflict',
      reason: 'credential-already-in-use',
      credential: GOOGLE_CREDENTIAL as never,
    });

    expect(outcome).toEqual({ status: 'signed-in', uid: 'existing-uid' });
    expect(mocks.signInWithCredential).toHaveBeenCalledTimes(1);
    expect(mocks.signInWithCredential.mock.calls[0]?.[1]).toBe(GOOGLE_CREDENTIAL);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
    expect(mocks.unlink).not.toHaveBeenCalled();
  });

  it('re-sends an access link when the single-use code was consumed while detecting the conflict', async () => {
    mocks.signInWithCredential.mockRejectedValue({ code: 'auth/invalid-action-code' });
    mocks.sendSignInLinkToEmail.mockResolvedValue(undefined);

    const outcome = await signInToExistingAccount({
      status: 'conflict',
      reason: 'email-already-in-use',
      credential: EMAIL_CREDENTIAL as never,
      email: 'existente@example.com',
    });

    expect(outcome).toEqual({ status: 'link-resent', email: 'existente@example.com' });
    const [, email, settings] = mocks.sendSignInLinkToEmail.mock.calls[0] ?? [];
    expect(email).toBe('existente@example.com');
    expect(new URL(String(settings.url)).searchParams.get('enterExisting')).toBe('1');
    // The remembered address lets the new link complete without typing it again.
    expect(window.localStorage.getItem('pulsar.emailForSignInLink')).toBe('existente@example.com');
    expect(mocks.deleteUser).not.toHaveBeenCalled();
    expect(mocks.unlink).not.toHaveBeenCalled();
  });

  it('rolls the remembered address back when re-sending the access link fails', async () => {
    mocks.signInWithCredential.mockRejectedValue({ code: 'auth/invalid-action-code' });
    mocks.sendSignInLinkToEmail.mockRejectedValue({ code: 'auth/network-request-failed' });

    await expect(
      signInToExistingAccount({
        status: 'conflict',
        reason: 'email-already-in-use',
        credential: EMAIL_CREDENTIAL as never,
        email: 'existente@example.com',
      }),
    ).rejects.toBeTruthy();
    expect(window.localStorage.getItem('pulsar.emailForSignInLink')).toBeNull();
  });

  it('rethrows sign-in failures when no e-mail is known to re-send a link', async () => {
    mocks.signInWithCredential.mockRejectedValue({ code: 'auth/invalid-action-code' });

    await expect(
      signInToExistingAccount({
        status: 'conflict',
        reason: 'credential-already-in-use',
        credential: GOOGLE_CREDENTIAL as never,
      }),
    ).rejects.toMatchObject({ code: 'auth/invalid-action-code' });
  });
});
