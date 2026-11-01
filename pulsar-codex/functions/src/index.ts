import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { deleteOwnAccount } from './account-deletion.js'
import { createDeletionDependencies } from './account-deletion-store.js'

initializeApp()
const db = getFirestore()
const auth = getAuth()

export const deleteAccount = onCall(
  { region: 'southamerica-east1', timeoutSeconds: 540, memory: '256MiB', maxInstances: 2 },
  async request => {
    try {
      return await deleteOwnAccount(request, createDeletionDependencies(db, auth))
    } catch (error) {
      if (error instanceof HttpsError) throw error
      // Do not report success or remove the identity when data cleanup failed.
      throw new HttpsError(
        'internal',
        'Não foi possível confirmar a exclusão integral. Tente novamente para concluir a limpeza.'
      )
    }
  }
)
