import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
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

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
// Cloud Functions live in Brazil (DECISOES.md), so the callable client must target the same region.
export const functions = getFunctions(firebaseApp, 'southamerica-east1');

if (emulatorsEnabled) {
  const host = window.location.hostname || '127.0.0.1';
  connectAuthEmulator(auth, `http://${host}:${emulators.auth.port}`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, emulators.firestore.port);
  connectFunctionsEmulator(functions, host, emulators.functions.port);
}
