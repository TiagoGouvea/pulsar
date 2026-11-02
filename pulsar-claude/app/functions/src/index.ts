import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';

// Every function runs in Brazil to keep data residency and latency aligned with the users (DECISOES.md).
setGlobalOptions({ region: 'southamerica-east1' });
initializeApp();

const RECENT_LOGIN_SECONDS = 5 * 60;

// Internal probe: 'private' removes public invoker IAM on deploy (only authorized principals can call it).
export const healthcheck = onRequest({ invoker: 'private' }, (_request, response) => {
  response.status(200).send('ok');
});

// Deletes the caller's account (DECISOES.md#Exclusão de conta). The UID comes only from the verified token,
// never from the payload. Firestore is cleaned first; the Auth user goes last. Safe to call again.
export const deleteAccount = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'unauthenticated');
  const { uid, token } = request.auth;
  const isAnonymous = token.firebase.sign_in_provider === 'anonymous';
  if (!isAnonymous && Date.now() / 1000 - token.auth_time > RECENT_LOGIN_SECONDS) {
    throw new HttpsError('failed-precondition', 'requires-recent-login');
  }

  const db = getFirestore();
  await db.recursiveDelete(db.doc(`users/${uid}`));
  // Server-only data lives either at internal/{area}/users/{uid} or at internal/{area}/{uid}/...
  for (const area of await db.collection('internal').listDocuments()) {
    for (const collection of await area.listCollections()) {
      await db.recursiveDelete(collection.id === uid ? collection : collection.doc(uid));
    }
  }

  await getAuth()
    .deleteUser(uid)
    .catch((error: { code?: string }) => {
      if (error.code !== 'auth/user-not-found') throw error;
    });
  return { deleted: true };
});
