import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { emulators } from '../../firebase.json';
import { firebaseApp } from './firebase';
import { emulatorsEnabled } from './env';

// Cloud Functions live in Brazil (DECISOES.md), so the callable client must target the same region.
// Kept apart from firebase.ts so the @firebase/functions code stays out of the startup bundle: only
// account flows call Cloud Functions, and they import this module on demand.
export const functions = getFunctions(firebaseApp, 'southamerica-east1');

if (emulatorsEnabled) {
  const host = window.location.hostname || '127.0.0.1';
  connectFunctionsEmulator(functions, host, emulators.functions.port);
}
