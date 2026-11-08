import assert from 'node:assert/strict'
import { after, beforeEach, test } from 'node:test'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { deleteOwnAccount } from '../../lib/account-deletion.js'
import { createDeletionDependencies } from '../../lib/account-deletion-store.js'

const projectId = 'demo-pulsar-codex'
// Fail closed: this suite must never use production credentials or data.
assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? '', /^(127\.0\.0\.1|localhost):\d+$/)
assert.match(process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '', /^(127\.0\.0\.1|localhost):\d+$/)
const app = initializeApp({ projectId })
const db = getFirestore(app)
const auth = getAuth(app)
const store = createDeletionDependencies(db, auth)
const owner = 'owner-deletion'
const other = 'other-preserved'
const request = (uid = owner) => ({
  auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } },
  data: {}
})
const firestoreUrl = `http://${process.env.FIRESTORE_EMULATOR_HOST}`
const authUrl = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`
const callableUrl = `http://${process.env.FUNCTIONS_EMULATOR_HOST ?? '127.0.0.1:5123'}/${projectId}/southamerica-east1/deleteAccount`

after(async () => {
  await deleteApp(app)
})
beforeEach(async () => {
  const responses = await Promise.all([
    fetch(`${firestoreUrl}/emulator/v1/projects/${projectId}/databases/(default)/documents`, {
      method: 'DELETE'
    }),
    fetch(`${authUrl}/emulator/v1/projects/${projectId}/accounts`, { method: 'DELETE' })
  ])
  for (const response of responses) assert.equal(response.ok, true)
})

async function seed(uid, includeProfile = true) {
  await auth.createUser({ uid, email: `${uid}@example.test`, password: 'synthetic-test-password' })
  const paths = [
    `users/${uid}/indicators/i1`,
    `users/${uid}/entries/e1`,
    `users/${uid}/insights/current`,
    `users/${uid}/savedInsights/liked`,
    `users/${uid}/insightFeedback/feedback`,
    `users/${uid}/pushSubscriptions/device`,
    `users/${uid}/dailySummaries/day`,
    `users/${uid}/unknown/missing/nested/leaf`,
    `users/${uid}/indicators/missing/entries/deep`,
    // These namespace parents intentionally have no document of their own.
    `internal/userQuotas/${uid}/day`,
    `internal/billing/${uid}/state`,
    `internal/push/${uid}/state`,
    `internal/idempotency/${uid}/request`,
    `internal/futureNamespace/${uid}/missing/nested/leaf`
  ]
  if (includeProfile) paths.push(`users/${uid}`)
  const batch = db.batch()
  for (const path of paths) batch.set(db.doc(path), { synthetic: true })
  await batch.commit()
  return paths
}

async function assertAbsent(paths) {
  for (const snapshot of await db.getAll(...paths.map(path => db.doc(path)))) {
    assert.equal(snapshot.exists, false, `Orphan: ${snapshot.ref.path}`)
  }
}

// Walk missing parents too, so the assertion cannot overlook orphan subcollections.
async function storedPaths() {
  const paths = []
  async function walk(collection) {
    for (const reference of await collection.listDocuments()) {
      if ((await reference.get()).exists) paths.push(reference.path)
      for (const child of await reference.listCollections()) await walk(child)
    }
  }
  for (const collection of await db.listCollections()) await walk(collection)
  return paths.sort()
}

async function assertDeleted(uid, paths) {
  await assertAbsent(paths)
  await assert.rejects(auth.getUser(uid), { code: 'auth/user-not-found' })
  const marker = await db.doc(`accountDeletions/${uid}`).get()
  assert.deepEqual(Object.keys(marker.data()).sort(), ['completedAt', 'startedAt'])
}

test('production store removes all trees and internal namespaces before Auth; preserves the other UID', async () => {
  const paths = await seed(owner)
  const otherPaths = await seed(other)
  // Exercise deletion beyond a single Firestore batch.
  for (let start = 0; start < 503; start += 400) {
    const batch = db.batch()
    for (let index = start; index < Math.min(start + 400, 503); index++) {
      const path = `users/${owner}/entries/event-${index}`
      paths.push(path)
      batch.set(db.doc(path), { value: index })
    }
    await batch.commit()
  }
  let authDeletionReached = false
  const result = await deleteOwnAccount(request(), {
    ...store,
    deleteAuthUser: async uid => {
      await assertAbsent(paths)
      assert.equal((await auth.getUser(uid)).uid, uid)
      assert.equal((await db.doc(`accountDeletions/${uid}`).get()).exists, true)
      authDeletionReached = true
      await store.deleteAuthUser(uid)
    }
  })
  assert.equal(authDeletionReached, true)
  assert.deepEqual(result, { deleted: true, uid: owner })
  await assertDeleted(owner, paths)
  assert.equal((await auth.getUser(other)).uid, other)
  assert.deepEqual(await storedPaths(), [...otherPaths, `accountDeletions/${owner}`].sort())
})

test('deletes nested data even when the user and internal namespace parents are missing', async () => {
  const paths = await seed(owner, false)
  await deleteOwnAccount(request(), store)
  await assertDeleted(owner, paths)
  assert.deepEqual(await storedPaths(), [`accountDeletions/${owner}`])
})

for (const stage of [
  'deleteUserTree',
  'deleteInternalData',
  'deleteAuthUser',
  'completeDeletion'
]) {
  test(`partial failure in ${stage} retains the lock and can be retried idempotently`, async () => {
    const paths = await seed(owner)
    await assert.rejects(
      deleteOwnAccount(request(), {
        ...store,
        [stage]: async () => {
          if (stage === 'deleteUserTree') await db.doc(paths[0]).delete()
          throw new Error('synthetic outage')
        }
      }),
      /synthetic outage/
    )
    const marker = await db.doc(`accountDeletions/${owner}`).get()
    assert.equal(marker.exists, true)
    assert.equal(marker.data().completedAt, undefined)
    if (stage !== 'completeDeletion') assert.equal((await auth.getUser(owner)).uid, owner)
    await deleteOwnAccount(request(), store)
    await assertDeleted(owner, paths)
    await deleteOwnAccount(request(), store)
    assert.deepEqual(await storedPaths(), [`accountDeletions/${owner}`])
  })
}

async function callable(token, data) {
  const response = await fetch(callableUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ data })
  })
  return { status: response.status, body: await response.json() }
}

async function signInAnonymously() {
  const response = await fetch(
    `${authUrl}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true })
    }
  )
  assert.equal(response.ok, true)
  return response.json()
}

test('real callable rejects unauthorized/targeted deletion and deletes only the authenticated UID', async () => {
  const otherPaths = await seed(other)
  const { idToken, localId } = await signInAnonymously()
  const paths = [
    `users/${localId}`,
    `users/${localId}/pushSubscriptions/device`,
    `internal/userQuotas/${localId}/day`
  ]
  for (const path of paths) await db.doc(path).set({ synthetic: true })

  assert.equal((await callable(null, {})).body.error.status, 'UNAUTHENTICATED')
  assert.equal((await callable(idToken, { uid: other })).body.error.status, 'INVALID_ARGUMENT')
  assert.equal((await db.doc(paths[0]).get()).exists, true)
  assert.equal((await auth.getUser(other)).uid, other)

  const response = await callable(idToken, {})
  assert.equal(response.status, 200)
  assert.deepEqual(response.body.result, { deleted: true, uid: localId })
  await assertDeleted(localId, paths)

  // The same unexpired bearer token must not recreate documents after Auth deletion.
  const staleWrite = await fetch(
    `${firestoreUrl}/v1/projects/${projectId}/databases/(default)/documents/users/${localId}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { onboardingCompleted: { booleanValue: true } } })
    }
  )
  assert.equal(staleWrite.status, 403)
  assert.deepEqual(await storedPaths(), [...otherPaths, `accountDeletions/${localId}`].sort())
})
