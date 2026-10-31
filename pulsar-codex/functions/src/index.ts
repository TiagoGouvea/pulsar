import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { deleteOwnAccount } from './account-deletion.js';

initializeApp();
const db = getFirestore();
const auth = getAuth();

export const deleteAccount = onCall(
  { region: 'southamerica-east1', timeoutSeconds: 540, memory: '256MiB', maxInstances: 2 },
  async (request) => {
    try {
      return await deleteOwnAccount(request, {
        now: Date.now,
        getUser: (uid) => auth.getUser(uid),
        markDeleting: (uid) => db.doc(`accountDeletions/${uid}`).set({ startedAt: FieldValue.serverTimestamp() }),
        // recursiveDelete includes unknown/nested subcollections even without a parent document.
        deleteUserTree: (uid) => db.recursiveDelete(db.doc(`users/${uid}`)),
        deleteAuthUser: (uid) => auth.deleteUser(uid),
        clearDeletionMarker: (uid) => db.doc(`accountDeletions/${uid}`).delete()
      });
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      // Do not report success or remove the identity when data cleanup failed.
      throw new HttpsError('internal', 'Não foi possível confirmar a exclusão integral. Tente novamente para concluir a limpeza.');
    }
  }
);
