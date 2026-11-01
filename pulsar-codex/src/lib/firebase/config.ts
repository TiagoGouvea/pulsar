import { FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'

/**
 * Firebase configuration
 * Use environment variables for production, default values for development
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

// Initialize Firebase app (singleton pattern)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

const auth = getAuth(app)
const db = getFirestore(app)
const functions = getFunctions(app, 'southamerica-east1')

// Tests and local development must opt in; production never uses emulators.
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  const authPort = Number(import.meta.env.VITE_AUTH_EMULATOR_PORT || 9099)
  const firestorePort = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || 8080)
  const functionsPort = Number(import.meta.env.VITE_FUNCTIONS_EMULATOR_PORT || 5001)
  connectAuthEmulator(auth, `http://127.0.0.1:${authPort}`, { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', firestorePort)
  connectFunctionsEmulator(functions, '127.0.0.1', functionsPort)
}

export { app, auth, db, functions, firebaseConfig }
