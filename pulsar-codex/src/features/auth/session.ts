import {
  browserLocalPersistence,
  EmailAuthProvider,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  linkWithCredential,
  linkWithPopup,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendSignInLinkToEmail,
  setPersistence,
  signInAnonymously,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  type User,
  type UserCredential
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '@lib/firebase/config';
import { clearLocalAccountData } from './localData';
import { usePrivacyStore } from '@features/privacy/store';

const pendingKey = 'pulsar.auth.emailLink';
const signedOutKey = 'pulsar.auth.signedOut';
type EmailIntent = 'link' | 'login' | 'reauthenticate';
interface PendingEmailLink {
  email: string;
  uid: string | null;
  intent: EmailIntent;
  nonce: string;
}

export class AccountError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export function getPendingEmailLink(): PendingEmailLink | null {
  try {
    const value = JSON.parse(localStorage.getItem(pendingKey) || 'null');
    if (
      value && typeof value.email === 'string' && typeof value.nonce === 'string' &&
      ['link', 'login', 'reauthenticate'].includes(value.intent) &&
      (value.uid === null || typeof value.uid === 'string')
    ) return value;
  } catch {
    // A missing or malformed context must never authorize linking another session.
  }
  return null;
}

export function hasEmailLink(): boolean {
  return isSignInWithEmailLink(auth, window.location.href);
}

let initialization: Promise<void> | undefined;
export function initializeSession(): Promise<void> {
  initialization ??= (async () => {
    await setPersistence(auth, browserLocalPersistence);
    await auth.authStateReady();
    // Never create a new UID while resolving a link or after an explicit logout.
    if (!auth.currentUser && !hasEmailLink() && !localStorage.getItem(signedOutKey)) {
      await signInAnonymously(auth);
    }
  })().catch((error: unknown) => {
    initialization = undefined;
    throw error;
  });
  return initialization;
}

let anonymousStart: Promise<void> | undefined;
export function startAnonymousSession(): Promise<void> {
  // A double tap must not create two anonymous UIDs; share the in-flight start.
  anonymousStart ??= (async () => {
    await initializeSession();
    if (hasEmailLink()) throw new AccountError('account/pending-link');
    if (!auth.currentUser) await signInAnonymously(auth);
    localStorage.removeItem(signedOutKey);
  })().finally(() => {
    anonymousStart = undefined;
  });
  return anonymousStart;
}

function requireUser(): User {
  if (!auth.currentUser) throw new AccountError('account/no-session');
  return auth.currentUser;
}

function assertSameUser(expectedUid: string, result: UserCredential): void {
  if (result.user.uid !== expectedUid || auth.currentUser?.uid !== expectedUid) {
    throw new AccountError('account/uid-mismatch');
  }
}

export async function linkGoogle(): Promise<void> {
  const user = requireUser();
  const uid = user.uid;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await linkWithPopup(user, provider);
  assertSameUser(uid, result);
  // Refresh the token so the linked provider is visible to Firestore rules.
  await user.getIdToken(true);
}

export async function loginGoogle(): Promise<void> {
  if (auth.currentUser) throw new AccountError('account/session-exists');
  await signInWithPopup(auth, new GoogleAuthProvider());
  localStorage.removeItem(signedOutKey);
}

export async function sendEmailLink(email: string, intent: EmailIntent): Promise<void> {
  const user = auth.currentUser;
  if (intent === 'login' && user) throw new AccountError('account/session-exists');
  if (intent !== 'login' && !user) throw new AccountError('account/no-session');
  if (intent === 'reauthenticate' && email.trim().toLowerCase() !== user?.email?.toLowerCase()) {
    throw new AccountError('account/wrong-email');
  }
  const pending: PendingEmailLink = {
    email: email.trim(),
    uid: user?.uid ?? null,
    intent,
    nonce: crypto.randomUUID()
  };
  const url = new URL('/account', window.location.origin);
  url.searchParams.set('session', pending.nonce);
  // Store before sending so storage failures cannot produce an unusable link.
  const previous = localStorage.getItem(pendingKey);
  localStorage.setItem(pendingKey, JSON.stringify(pending));
  try {
    await sendSignInLinkToEmail(auth, pending.email, {
      url: url.href,
      handleCodeInApp: true
    });
  } catch (error) {
    if (previous) localStorage.setItem(pendingKey, previous);
    else localStorage.removeItem(pendingKey);
    throw error;
  }
}

export async function completeEmailLink(): Promise<EmailIntent> {
  const pending = getPendingEmailLink();
  if (!hasEmailLink() || !pending ||
      new URL(window.location.href).searchParams.get('session') !== pending.nonce) {
    throw new AccountError('account/link-session-missing');
  }
  if (pending.intent === 'login') {
    if (auth.currentUser) throw new AccountError('account/session-exists');
    await signInWithEmailLink(auth, pending.email, window.location.href);
    localStorage.removeItem(signedOutKey);
  } else {
    const user = requireUser();
    const uid = user.uid;
    if (uid !== pending.uid) throw new AccountError('account/link-session-missing');
    const credential = EmailAuthProvider.credentialWithLink(pending.email, window.location.href);
    const result = pending.intent === 'link'
      ? await linkWithCredential(user, credential)
      : await reauthenticateWithCredential(user, credential);
    assertSameUser(uid, result);
    await user.getIdToken(true);
  }
  dismissEmailLink();
  return pending.intent;
}

export function dismissEmailLink(): void {
  localStorage.removeItem(pendingKey);
  // Remove the one-time credential from browser history after use/cancellation.
  if (hasEmailLink()) window.history.replaceState(null, '', '/account');
}

export async function reauthenticateGoogle(): Promise<void> {
  const user = requireUser();
  const uid = user.uid;
  const result = await reauthenticateWithPopup(user, new GoogleAuthProvider());
  assertSameUser(uid, result);
  await user.getIdToken(true);
}

export async function logout(): Promise<void> {
  // Write first: a reload must not silently create an anonymous replacement.
  localStorage.setItem(signedOutKey, 'true');
  try {
    await signOut(auth);
  } catch (error) {
    localStorage.removeItem(signedOutKey);
    throw error;
  }
  try {
    dismissEmailLink();
  } catch {
    // The session is already signed out; pending-link cleanup is best effort.
  }
  usePrivacyStore.getState().resetPrivacy();
}

export async function deleteAccount(): Promise<void> {
  const user = requireUser();
  const uid = user.uid;
  // The callable protocol requires a data field; {} carries no target UID.
  const remove = httpsCallable<Record<string, never>, { deleted: boolean; uid: string }>(
    functions,
    'deleteAccount'
  );
  const result = await remove({});
  if (result.data.deleted !== true || result.data.uid !== uid) {
    throw new AccountError('account/deletion-unconfirmed');
  }
  // The server has already removed the tree. Clear local caches before the
  // logout write, so a failed sign-out cannot leave deleted data on screen.
  clearLocalAccountData(uid);

  // Do not delete Auth client-side: the server removes the entire tree first.
  // If another session replaced this one during the call, never sign it out.
  if (auth.currentUser?.uid === uid) {
    await logout();
  } else if (!auth.currentUser) {
    // The session expired during deletion; never auto-create a replacement.
    localStorage.setItem(signedOutKey, 'true');
    try {
      dismissEmailLink();
    } catch {
      // The server deletion is already confirmed; local link cleanup is best effort.
    }
  }
  localStorage.removeItem('isNameRevealed');
}
