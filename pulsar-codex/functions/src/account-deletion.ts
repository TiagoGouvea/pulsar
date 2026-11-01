import { HttpsError } from 'firebase-functions/v2/https'

interface DeletionRequest {
  auth?: { uid: string; token: { auth_time?: number } }
  data?: unknown
}

export interface DeletionDependencies {
  now: () => number
  getUser: (uid: string) => Promise<{ providerData: unknown[] }>
  markDeleting: (uid: string) => Promise<unknown>
  deleteUserTree: (uid: string) => Promise<unknown>
  deleteInternalData: (uid: string) => Promise<unknown>
  deleteAuthUser: (uid: string) => Promise<unknown>
  completeDeletion: (uid: string) => Promise<unknown>
}

function isMissingUser(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'auth/user-not-found'
  )
}

export async function deleteOwnAccount(
  request: DeletionRequest,
  dependencies: DeletionDependencies
) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Entre na sua conta antes de excluir.')
  if (request.data !== undefined && request.data !== null) {
    const hasParameters =
      typeof request.data !== 'object' ||
      Array.isArray(request.data) ||
      Object.keys(request.data as Record<string, unknown>).length > 0
    if (hasParameters) {
      throw new HttpsError('invalid-argument', 'A exclusão não aceita um UID ou outros parâmetros.')
    }
  }
  const { uid, token } = request.auth
  let anonymous = false
  try {
    // Check the actual providers: a linked account can still carry an anonymous sign-in claim.
    const user = await dependencies.getUser(uid)
    anonymous = user.providerData.length === 0
  } catch (error) {
    if (!isMissingUser(error)) throw error
    // Retrying after Auth deletion is safe only with a still-valid, recent token.
  }
  const age = dependencies.now() / 1000 - (token.auth_time ?? 0)
  if (!anonymous && (!token.auth_time || age < 0 || age > 300)) {
    throw new HttpsError(
      'failed-precondition',
      'Confirme sua identidade novamente antes de excluir.'
    )
  }
  // Keep the lock after completion: deleted Auth users can still hold unexpired ID tokens.
  await dependencies.markDeleting(uid)
  await dependencies.deleteUserTree(uid)
  await dependencies.deleteInternalData(uid)
  try {
    await dependencies.deleteAuthUser(uid)
  } catch (error) {
    if (!isMissingUser(error)) throw error
  }
  await dependencies.completeDeletion(uid)
  return { deleted: true, uid }
}
