import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { emulators } from '../../firebase.json';
import { emulatorsEnabled } from './env';

const env = import.meta.env;

// Without a real config we fall back to the `demo-` project, which the emulators accept and which
// can never reach production resources.
export const firebaseApp = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-pulsar.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-pulsar',
  appId: env.VITE_FIREBASE_APP_ID || 'demo-app-id',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || undefined,
});

// Same persistence hierarchy as getAuth(), but without a global popupRedirectResolver: its proactive
// Google iframe (apis.google.com) is awaited by auth initialization and used to sit on the startup
// critical path of every route, delaying the first render (Lighthouse performance). Popup flows pass
// `browserPopupRedirectResolver` per call instead (see src/auth/linkAccount.ts and accountSession.ts).
export const auth = initializeAuth(firebaseApp, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
});
export const db = getFirestore(firebaseApp);

if (emulatorsEnabled) {
  const host = window.location.hostname || '127.0.0.1';
  connectAuthEmulator(auth, `http://${host}:${emulators.auth.port}`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, emulators.firestore.port);
}
