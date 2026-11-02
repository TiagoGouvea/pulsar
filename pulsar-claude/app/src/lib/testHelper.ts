import { signInWithCustomToken } from 'firebase/auth';
import { auth } from './firebase';

export interface PulsarTestHelper {
  /** Signs the browser session in with a custom token (Auth Emulator) and returns the UID. */
  signInWithCustomToken: (customToken: string) => Promise<string>;
  /** UID of the user signed in on this browser, or null when there is no session. */
  currentUid: () => string | null;
}

declare global {
  interface Window {
    __pulsarTest?: PulsarTestHelper;
  }
}

// Test-only bridge used by the e2e suite. This module is loaded by dev/emulator builds only
// (the __PULSAR_TEST_HELPER__ build flag in vite.config.ts), so it never ships in a production bundle.
export function installTestHelper(): void {
  window.__pulsarTest = {
    async signInWithCustomToken(customToken: string) {
      const credential = await signInWithCustomToken(auth, customToken);
      return credential.user.uid;
    },
    currentUid: () => auth.currentUser?.uid ?? null,
  };
}
