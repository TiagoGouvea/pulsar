import {
  browserPopupRedirectResolver,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  linkWithCredential,
  linkWithPopup,
  reauthenticateWithCredential,
  sendSignInLinkToEmail,
  signInWithCredential,
  signInWithEmailLink,
  type AuthCredential,
  type AuthError,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const EMAIL_FOR_LINK_KEY = 'pulsar.emailForSignInLink';

export type LinkConflictReason = 'credential-already-in-use' | 'email-already-in-use';

export interface LinkConflict {
  status: 'conflict';
  reason: LinkConflictReason;
  credential: AuthCredential;
  /** Present for e-mail link conflicts; used to re-send an access link when the code was consumed. */
  email?: string;
}

export type LinkResult = { status: 'linked'; uid: string } | LinkConflict;
export type EmailLinkResult =
  | LinkResult
  | { status: 'signed-in-existing'; uid: string }
  | { status: 'not-a-link' }
  | { status: 'needs-email' };

/** Outcome of the explicit "enter the existing account" confirmation. */
export type ExistingAccountOutcome =
  { status: 'signed-in'; uid: string } | { status: 'link-resent'; email: string };

function requireCurrentUser(): User {
  const user = auth.currentUser;
  if (!user) throw new Error('An authenticated user is required before linking a credential.');
  return user;
}

function assertSameUid(before: string, after: string): void {
  if (before !== after || auth.currentUser?.uid !== before) {
    throw new Error('The user UID changed while linking the account.');
  }
}

function conflictFromError(
  error: unknown,
  credential: AuthCredential | null,
  email?: string,
): LinkConflict | null {
  const code = (error as { code?: string } | null)?.code;
  if (code !== 'auth/credential-already-in-use' && code !== 'auth/email-already-in-use') return null;
  if (!credential) throw error;
  return {
    status: 'conflict',
    reason: code === 'auth/email-already-in-use' ? 'email-already-in-use' : 'credential-already-in-use',
    credential,
    email,
  };
}

/** Reads the continueUrl params that survive the e-mail action redirect onto /settings. */
function continueUrlParams(actionUrl: URL): URLSearchParams {
  const continueUrl = actionUrl.searchParams.get('continueUrl');
  return continueUrl ? new URL(continueUrl, actionUrl.origin).searchParams : new URLSearchParams();
}

/** True for the access link re-sent after the person confirmed entering the existing account. */
function enterExistingRequested(actionUrl: URL): boolean {
  return (
    actionUrl.searchParams.get('enterExisting') === '1' ||
    continueUrlParams(actionUrl).get('enterExisting') === '1'
  );
}

/** Links Google to the current anonymous user; it never starts a separate sign-in. */
export async function linkWithGoogle(): Promise<LinkResult> {
  const user = requireCurrentUser();
  const uidBefore = user.uid;
  try {
    const result = await linkWithPopup(user, new GoogleAuthProvider(), browserPopupRedirectResolver);
    assertSameUid(uidBefore, result.user.uid);
    return { status: 'linked', uid: result.user.uid };
  } catch (error) {
    const conflict = conflictFromError(error, GoogleAuthProvider.credentialFromError(error as AuthError));
    if (conflict) return conflict;
    throw error;
  }
}

/** Sends an in-app link and durably associates the typed address with the pending request. */
export async function sendEmailLink(email: string, extraParams: Record<string, string> = {}): Promise<void> {
  const normalizedEmail = email.trim();
  const uid = requireCurrentUser().uid;
  const returnUrl = new URL('/settings', window.location.origin);
  returnUrl.searchParams.set('linkUid', uid);
  for (const [key, value] of Object.entries(extraParams)) returnUrl.searchParams.set(key, value);
  const previousEmail = window.localStorage.getItem(EMAIL_FOR_LINK_KEY);
  // Keep the address before awaiting the request: the browser may open the emailed URL as soon as
  // the emulator/mail provider receives it. Roll back the optimistic write if sending fails.
  window.localStorage.setItem(EMAIL_FOR_LINK_KEY, normalizedEmail);
  try {
    await sendSignInLinkToEmail(auth, normalizedEmail, {
      url: returnUrl.toString(),
      handleCodeInApp: true,
    });
  } catch (error) {
    if (previousEmail === null) window.localStorage.removeItem(EMAIL_FOR_LINK_KEY);
    else window.localStorage.setItem(EMAIL_FOR_LINK_KEY, previousEmail);
    throw error;
  }
}

/** Completes the link against the current user, including when the address must be typed again. */
async function completeEmailLinkOnce(href: string, typedEmail?: string): Promise<EmailLinkResult> {
  if (!isSignInWithEmailLink(auth, href)) return { status: 'not-a-link' };

  const email = typedEmail?.trim() || window.localStorage.getItem(EMAIL_FOR_LINK_KEY);
  if (!email) return { status: 'needs-email' };

  const actionUrl = new URL(href);

  // Access link explicitly requested after the person confirmed entering the existing account: this is
  // the only flow that may switch UIDs, and it must work even where no anonymous session is signed in.
  if (enterExistingRequested(actionUrl)) {
    const result = await signInWithEmailLink(auth, email, href);
    window.localStorage.removeItem(EMAIL_FOR_LINK_KEY);
    return { status: 'signed-in-existing', uid: result.user.uid };
  }

  const user = requireCurrentUser();
  const uidBefore = user.uid;
  const continueUrl = actionUrl.searchParams.get('continueUrl');
  const requestedUid =
    actionUrl.searchParams.get('linkUid') ??
    (continueUrl ? new URL(continueUrl, actionUrl.origin).searchParams.get('linkUid') : null);
  if (requestedUid && requestedUid !== uidBefore) {
    throw Object.assign(new Error('The link belongs to a different session.'), {
      code: 'auth/link-session-mismatch',
    });
  }
  const credential = EmailAuthProvider.credentialWithLink(email, href);
  try {
    // The e-mail action code is single-use and a failed linkWithCredential already consumes it, which
    // would leave nothing for the later explicit sign-in. fetchSignInMethodsForEmail (createAuthUri) is
    // non-consuming, so when the provider does report the address as registered we raise the conflict
    // without spending the code — the person still holds a valid link to enter the existing account.
    // Under e-mail enumeration protection (new projects) this lookup returns an empty list and the
    // authoritative detection is the linkWithCredential error below; in that case the code is consumed
    // and signInToExistingAccount re-sends an access link instead of failing.
    const methods = await fetchSignInMethodsForEmail(auth, email).catch(() => []);
    if (methods.length > 0) {
      window.localStorage.removeItem(EMAIL_FOR_LINK_KEY);
      return { status: 'conflict', reason: 'email-already-in-use', credential, email };
    }
    const result = await linkWithCredential(user, credential);
    assertSameUid(uidBefore, result.user.uid);
    window.localStorage.removeItem(EMAIL_FOR_LINK_KEY);
    return { status: 'linked', uid: result.user.uid };
  } catch (error) {
    const conflict = conflictFromError(error, credential, email);
    if (conflict) {
      window.localStorage.removeItem(EMAIL_FOR_LINK_KEY);
      return conflict;
    }
    throw error;
  }
}

const pendingEmailLinks = new Map<string, Promise<EmailLinkResult>>();

// Email action codes are single-use. StrictMode and repeated renders must share one attempt rather
// than consuming the same code twice (the second attempt would also lose the remembered address).
export function completeEmailLink(href: string, typedEmail?: string): Promise<EmailLinkResult> {
  const email = typedEmail?.trim() || window.localStorage.getItem(EMAIL_FOR_LINK_KEY) || '';
  const key = `${href}\n${email}`;
  const pending = pendingEmailLinks.get(key);
  if (pending) return pending;
  const attempt = completeEmailLinkOnce(href, typedEmail).finally(() => pendingEmailLinks.delete(key));
  pendingEmailLinks.set(key, attempt);
  return attempt;
}

/** True for the e-mail link sent by `reauthenticate` (account deletion) when it is opened on /settings. */
export function isReauthLink(href: string): boolean {
  const actionUrl = new URL(href);
  return actionUrl.searchParams.get('reauth') === '1' || continueUrlParams(actionUrl).get('reauth') === '1';
}

/** Confirms the current user's identity with the e-mail link; it never changes the UID. */
export async function completeEmailReauth(href: string): Promise<void> {
  const user = requireCurrentUser();
  const email = window.localStorage.getItem(EMAIL_FOR_LINK_KEY);
  if (!email) throw new Error('The e-mail for the reauthentication link is missing.');
  await reauthenticateWithCredential(user, EmailAuthProvider.credentialWithLink(email, href));
  window.localStorage.removeItem(EMAIL_FOR_LINK_KEY);
}

/** Re-sends an access link (plain sign-in) for the existing account after the code was consumed. */
async function resendExistingAccountLink(email: string): Promise<void> {
  const normalizedEmail = email.trim();
  const returnUrl = new URL('/settings', window.location.origin);
  returnUrl.searchParams.set('linkUid', requireCurrentUser().uid);
  returnUrl.searchParams.set('enterExisting', '1');
  // Keep the address before awaiting the request, mirroring sendEmailLink, and roll back on failure.
  const previousEmail = window.localStorage.getItem(EMAIL_FOR_LINK_KEY);
  window.localStorage.setItem(EMAIL_FOR_LINK_KEY, normalizedEmail);
  try {
    await sendSignInLinkToEmail(auth, normalizedEmail, {
      url: returnUrl.toString(),
      handleCodeInApp: true,
    });
  } catch (error) {
    if (previousEmail === null) window.localStorage.removeItem(EMAIL_FOR_LINK_KEY);
    else window.localStorage.setItem(EMAIL_FOR_LINK_KEY, previousEmail);
    throw error;
  }
}

/**
 * The only function that may switch UIDs, called after the explicit conflict confirmation. When the
 * single-use code was already consumed (conflict detected through the link error), it re-sends an
 * access link so the person can still enter the existing account by opening the new e-mail.
 */
export async function signInToExistingAccount(conflict: LinkConflict): Promise<ExistingAccountOutcome> {
  try {
    const result = await signInWithCredential(auth, conflict.credential);
    return { status: 'signed-in', uid: result.user.uid };
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === 'auth/invalid-action-code' && conflict.email) {
      await resendExistingAccountLink(conflict.email);
      return { status: 'link-resent', email: conflict.email };
    }
    throw error;
  }
}
