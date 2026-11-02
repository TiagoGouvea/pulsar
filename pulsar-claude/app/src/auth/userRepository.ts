import { doc, onSnapshot, runTransaction, serverTimestamp, type Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface UserProfile {
  onboardingCompleted: boolean;
}

// Idempotent: creates users/{uid} with the defaults only when it does not exist yet, so a reload or another
// device never overwrites existing data (createdAt is written once).
export function ensureUserProfile(uid: string): Promise<UserProfile> {
  const ref = doc(db, 'users', uid);
  return runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    if (snapshot.exists()) {
      return { onboardingCompleted: snapshot.data()?.onboardingCompleted === true };
    }
    tx.set(ref, {
      createdAt: serverTimestamp(),
      onboardingCompleted: false,
      aiConsent: false,
      reminderEnabled: false,
    });
    return { onboardingCompleted: false };
  });
}

// Live view of users/{uid}, so changes made during the session (e.g. onboarding completed) are never stale.
export function watchUserProfile(
  uid: string,
  onProfile: (profile: UserProfile) => void,
  onError: (err: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      // Cache hits are not proof that the profile is current; startup uses the server transaction above.
      if (snap.metadata.fromCache) return;
      onProfile({ onboardingCompleted: snap.data()?.onboardingCompleted === true });
    },
    onError,
  );
}
