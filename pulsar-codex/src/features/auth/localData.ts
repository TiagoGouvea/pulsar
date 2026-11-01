import { clearCachedIndicators } from '@features/indicators/repository';
import { clearOnboardingCompletion } from '@features/onboarding/completion';
import { clearAccountSaveInvite } from '@features/account/useAccountSaveInvite';

const NAME_REVEAL_KEY = 'isNameRevealed';

/**
 * Removes browser caches tied to the deleted UID after the Cloud Function
 * confirms that the remote tree and the Auth identity are gone. Storage is
 * best effort: every step tolerates an unavailable localStorage.
 */
export function clearLocalAccountData(uid: string): void {
  clearCachedIndicators(uid);
  clearOnboardingCompletion(uid);
  clearAccountSaveInvite();
  try {
    localStorage.removeItem(NAME_REVEAL_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
