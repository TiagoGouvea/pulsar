import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deleteOwnAccount } from '../lib/account-deletion.js'

const now = 1_800_000_000_000
const request = (age = 0) => ({ auth: { uid: 'owner', token: { auth_time: now / 1000 - age } } })
const order = ['mark', 'tree', 'internal', 'auth', 'complete']
function setup(providers = [{}]) {
  const calls = []
  const dependencies = {
    now: () => now,
    getUser: async () => ({ providerData: providers }),
    markDeleting: async uid => {
      calls.push(['mark', uid])
    },
    deleteUserTree: async uid => {
      calls.push(['tree', uid])
    },
    deleteInternalData: async uid => {
      calls.push(['internal', uid])
    },
    deleteAuthUser: async uid => {
      calls.push(['auth', uid])
    },
    completeDeletion: async uid => {
      calls.push(['complete', uid])
    }
  }
  return { calls, dependencies }
}

test('rejects unauthenticated requests and caller-supplied parameters before mutation', async () => {
  const { calls, dependencies } = setup()
  await assert.rejects(deleteOwnAccount({}, dependencies), { code: 'unauthenticated' })
  for (const data of [{ uid: 'other' }, { nested: true }, [], 'owner', 1, false]) {
    await assert.rejects(deleteOwnAccount({ ...request(), data }, dependencies), {
      code: 'invalid-argument'
    })
  }
  assert.deepEqual(calls, [])
})

for (const age of [299, 300, 301]) {
  test(`recent authentication boundary: ${age} seconds`, async () => {
    const { calls, dependencies } = setup()
    if (age > 300) {
      await assert.rejects(deleteOwnAccount(request(age), dependencies), {
        code: 'failed-precondition'
      })
      assert.deepEqual(calls, [])
    } else {
      assert.deepEqual(await deleteOwnAccount(request(age), dependencies), {
        deleted: true,
        uid: 'owner'
      })
      assert.deepEqual(
        calls,
        order.map(operation => [operation, 'owner'])
      )
    }
  })
}

test('accepts the empty callable payload without a target UID', async () => {
  const { calls, dependencies } = setup()
  assert.deepEqual(await deleteOwnAccount({ ...request(), data: {} }, dependencies), {
    deleted: true,
    uid: 'owner'
  })
  assert.deepEqual(
    calls,
    order.map(operation => [operation, 'owner'])
  )
})

test('anonymous accounts can delete without replacing their old anonymous identity', async () => {
  const { dependencies } = setup([])
  await deleteOwnAccount(request(86400), dependencies)
})

test('linked accounts require recent login even with an old anonymous sign-in claim', async () => {
  const { dependencies } = setup([{ providerId: 'google.com' }])
  const linked = request(301)
  linked.auth.token.firebase = { sign_in_provider: 'anonymous' }
  await assert.rejects(deleteOwnAccount(linked, dependencies), { code: 'failed-precondition' })
})

test('missing and future auth_time never authorize permanent account deletion', async () => {
  const { dependencies } = setup()
  await assert.rejects(deleteOwnAccount({ auth: { uid: 'owner', token: {} } }, dependencies), {
    code: 'failed-precondition'
  })
  await assert.rejects(deleteOwnAccount(request(-1), dependencies), { code: 'failed-precondition' })
})

for (const [dependency, completed] of [
  ['markDeleting', []],
  ['deleteUserTree', ['mark']],
  ['deleteInternalData', ['mark', 'tree']],
  ['deleteAuthUser', ['mark', 'tree', 'internal']],
  ['completeDeletion', ['mark', 'tree', 'internal', 'auth']]
]) {
  test(`${dependency} failure never reports success; an explicit retry completes`, async () => {
    const { calls, dependencies } = setup()
    const original = dependencies[dependency]
    dependencies[dependency] = async () => {
      throw new Error('unavailable')
    }
    await assert.rejects(deleteOwnAccount(request(), dependencies), /unavailable/)
    assert.deepEqual(
      calls.map(([operation]) => operation),
      completed
    )
    dependencies[dependency] = original
    await deleteOwnAccount(request(), dependencies)
    assert.deepEqual(
      calls.map(([operation]) => operation),
      [...completed, ...order]
    )
  })
}

test('missing Auth user is safe to retry only with a recent token', async () => {
  const { calls, dependencies } = setup()
  dependencies.getUser = async () => {
    throw { code: 'auth/user-not-found' }
  }
  dependencies.deleteAuthUser = async () => {
    throw { code: 'auth/user-not-found' }
  }
  await assert.rejects(deleteOwnAccount(request(301), dependencies), {
    code: 'failed-precondition'
  })
  assert.deepEqual(calls, [])
  await deleteOwnAccount(request(), dependencies)
  assert.deepEqual(
    calls.map(([operation]) => operation),
    ['mark', 'tree', 'internal', 'complete']
  )
})

test('provider lookup failures do not mutate data', async () => {
  const { calls, dependencies } = setup()
  dependencies.getUser = async () => {
    throw new Error('unavailable')
  }
  await assert.rejects(deleteOwnAccount(request(), dependencies), /unavailable/)
  assert.deepEqual(calls, [])
})
