import type { Auth } from 'firebase-admin/auth'
import { FieldValue, type Firestore } from 'firebase-admin/firestore'
import type { DeletionDependencies } from './account-deletion.js'

/** All server-owned per-user state lives in internal/{namespace}/{uid}/{document}. */
export function createDeletionDependencies(db: Firestore, auth: Auth): DeletionDependencies {
  return {
    now: Date.now,
    getUser: uid => auth.getUser(uid),
    markDeleting: uid =>
      db
        .doc(`accountDeletions/${uid}`)
        .set({ startedAt: FieldValue.serverTimestamp() }, { merge: true }),
    // Both recursive operations include descendants with missing parent documents.
    deleteUserTree: uid => db.recursiveDelete(db.doc(`users/${uid}`)),
    deleteInternalData: async uid => {
      // listDocuments also returns missing namespace parents with live descendants.
      const namespaces = await db.collection('internal').listDocuments()
      for (const namespace of namespaces) {
        await db.recursiveDelete(namespace.collection(uid))
      }
    },
    deleteAuthUser: uid => auth.deleteUser(uid),
    // This intentional security tombstone contains no profile, token or business data.
    completeDeletion: uid =>
      db
        .doc(`accountDeletions/${uid}`)
        .set({ completedAt: FieldValue.serverTimestamp() }, { merge: true })
  }
}
