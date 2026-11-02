/// <reference types="vite/client" />

// Public Firebase web config (safe for the bundle). Empty values fall back to the `demo-pulsar` emulator project.
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  /** "true" connects Auth/Firestore to the local emulators (set by `build:emulator`). */
  readonly VITE_USE_EMULATORS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Build-time flag (see `define` in vite.config.ts): true only in dev/emulator builds.
 * The e2e test helper is loaded exclusively when it is true, so a production bundle never has it.
 */
declare const __PULSAR_TEST_HELPER__: boolean;
