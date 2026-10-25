import { FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

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
};

// Initialize Firebase app (singleton pattern)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize services
let auth: Auth;
let db: Firestore;

try {
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error('Failed to initialize Firebase services:', error);
  auth = {} as Auth;
  db = {} as Firestore;
}

export { app, auth, db, firebaseConfig };
