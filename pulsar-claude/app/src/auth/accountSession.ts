import { GoogleAuthProvider, reauthenticateWithPopup, type User } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { sendEmailLink } from './linkAccount';

const GOOGLE_PROVIDER_ID = 'google.com';
// Mirrors RECENT_LOGIN_SECONDS in functions/src/index.ts (deleteAccount rejects older logins).
const RECENT_REAUTH_MS = 5 * 60 * 1000;
const REAUTH_AT_KEY = 'pulsar.reauthenticatedAt';

/** Records a completed reauthentication, bound to the UID it confirms (see recentReauthenticationFor). */
export function markReauthenticated(user: User): void {
  window.sessionStorage.setItem(REAUTH_AT_KEY, `${user.uid}:${Date.now()}`);
}

/** True when this exact user confirmed their identity within the reauthentication window. */
function recentReauthenticationFor(user: User): boolean {
  const stored = window.sessionStorage.getItem(REAUTH_AT_KEY);
  const separator = stored?.indexOf(':');
  if (!stored || separator === undefined || separator < 0) return false;
  const uid = stored.slice(0, separator);
  const at = Number(stored.slice(separator + 1));
  // The confirmation belongs to one account only: signing out or switching users invalidates it.
  return uid === user.uid && Date.now() - at <= RECENT_REAUTH_MS;
}

/**
 * Makes sure a non-anonymous user confirmed their identity just before a destructive action. Google
 * reauthenticates in a popup ('ready'); e-mail sends a link that /settings consumes (see
 * completeEmailReauth) and returns 'link-sent'.
 */
export async function ensureRecentLogin(user: User): Promise<'ready' | 'link-sent'> {
  if (recentReauthenticationFor(user)) return 'ready';
  if (user.providerData.some((provider) => provider.providerId === GOOGLE_PROVIDER_ID)) {
    await reauthenticateWithPopup(user, new GoogleAuthProvider());
    markReauthenticated(user);
    return 'ready';
  }
  if (!user.email) throw new Error('A non-anonymous account must have an e-mail to reauthenticate.');
  await sendEmailLink(user.email, { reauth: '1' });
  return 'link-sent';
}

/** Deletes the caller's account and all its data on the server; the caller then signs out locally. */
export async function deleteCurrentAccount(): Promise<void> {
  await httpsCallable<void, { deleted: boolean }>(functions, 'deleteAccount')();
}
