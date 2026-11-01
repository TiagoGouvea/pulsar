import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@lib/firebase/config';

export const ONBOARDING_LOCAL_KEY = 'pulsar.onboarding.completed';
const SCOPED_KEY_PREFIX = `${ONBOARDING_LOCAL_KEY}.`;
// The exported design writes this key when the tutorial is finished. Keep it
// for design parity, but scope the authoritative marker by UID.
const LEGACY_DESIGN_KEY = 'pulsar_onboarding_completed';

export interface OnboardingCompletionResult {
  local: boolean;
  remote: boolean;
}

function scopedKey(uid: string): string {
  return `${SCOPED_KEY_PREFIX}${uid}`;
}

function safeRead(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads the local completion marker for the current UID. The generic marker is
 * only used when no UID is available, so a different account on the same
 * browser never inherits another account's onboarding state.
 */
export function hasCompletedOnboardingLocally(uid?: string | null): boolean {
  if (uid) return safeRead(scopedKey(uid)) === 'true';
  return safeRead(ONBOARDING_LOCAL_KEY) === 'true';
}

/**
 * Removes the local tutorial markers after an account deletion. The scoped
 * marker is the authoritative one; the generic/design keys are legacy caches
 * that must not make a brand-new account look already onboarded.
 */
export function clearOnboardingCompletion(uid?: string | null): void {
  try {
    localStorage.removeItem(ONBOARDING_LOCAL_KEY);
    localStorage.removeItem(LEGACY_DESIGN_KEY);
    if (uid) localStorage.removeItem(scopedKey(uid));
  } catch {
    // Storage may be unavailable; remote deletion remains authoritative.
  }
}

/**
 * Persists the tutorial completion. The local marker is written first so the
 * state survives an unavailable backend; Firestore remains the canonical
 * per-UID record when the write is permitted.
 */
export async function markOnboardingCompleted(
  uid: string | null
): Promise<OnboardingCompletionResult> {
  const local =
    safeWrite(ONBOARDING_LOCAL_KEY, 'true') &&
    safeWrite(LEGACY_DESIGN_KEY, 'true') &&
    (uid ? safeWrite(scopedKey(uid), 'true') : true);

  let remote = false;
  if (uid) {
    try {
      await setDoc(
        doc(db, 'users', uid),
        {
          onboardingCompleted: true,
          onboardingCompletedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      remote = true;
    } catch {
      // A denied/unavailable Firestore write must not make onboarding unusable.
      // The local marker keeps the completion available for this UID.
    }
  }

  if (!local && !remote) {
    throw new Error('onboarding/persistence-failed');
  }

  return { local, remote };
}
