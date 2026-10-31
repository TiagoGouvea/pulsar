import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deleteOwnAccount } from '../lib/account-deletion.js';

const now = 1_800_000_000_000;
const request = (age = 0) => ({ auth: { uid: 'owner', token: { auth_time: now / 1000 - age } } });
function setup(providers = [{}]) {
  const calls = [];
  const dependencies = {
    now: () => now,
    getUser: async () => ({ providerData: providers }),
    markDeleting: async (uid) => { calls.push(['mark', uid]); },
    deleteUserTree: async (uid) => { calls.push(['tree', uid]); },
    deleteAuthUser: async (uid) => { calls.push(['auth', uid]); },
    clearDeletionMarker: async (uid) => { calls.push(['clear', uid]); }
  };
  return { calls, dependencies };
}

test('rejects unauthenticated requests and caller-supplied target UIDs before mutation', async () => {
  const { calls, dependencies } = setup();
  await assert.rejects(deleteOwnAccount({}, dependencies), { code: 'unauthenticated' });
  await assert.rejects(deleteOwnAccount({ ...request(), data: { uid: 'other' } }, dependencies), { code: 'invalid-argument' });
  await assert.rejects(deleteOwnAccount({ ...request(), data: { nested: true } }, dependencies), { code: 'invalid-argument' });
  await assert.rejects(deleteOwnAccount({ ...request(), data: [] }, dependencies), { code: 'invalid-argument' });
  assert.deepEqual(calls, []);
});

for (const age of [299, 300, 301]) {
  test(`recent authentication boundary: ${age} seconds`, async () => {
    const { calls, dependencies } = setup();
    if (age > 300) {
      await assert.rejects(deleteOwnAccount(request(age), dependencies), { code: 'failed-precondition' });
      assert.deepEqual(calls, []);
    } else {
      assert.deepEqual(await deleteOwnAccount(request(age), dependencies), { deleted: true, uid: 'owner' });
      assert.deepEqual(calls.map(([operation]) => operation), ['mark', 'tree', 'auth', 'clear']);
    }
  });
}

test('accepts the empty callable payload without a target UID', async () => {
  const { calls, dependencies } = setup();
  assert.deepEqual(await deleteOwnAccount({ ...request(), data: {} }, dependencies), { deleted: true, uid: 'owner' });
  assert.deepEqual(calls.map(([operation]) => operation), ['mark', 'tree', 'auth', 'clear']);
});

test('anonymous accounts can delete without replacing their old anonymous identity', async () => {
  const { dependencies } = setup([]);
  await deleteOwnAccount(request(86400), dependencies);
});

test('missing and future auth_time never authorize permanent account deletion', async () => {
  const { dependencies } = setup();
  await assert.rejects(deleteOwnAccount({ auth: { uid: 'owner', token: {} } }, dependencies), { code: 'failed-precondition' });
  await assert.rejects(deleteOwnAccount(request(-1), dependencies), { code: 'failed-precondition' });
});

test('data failure keeps identity and marker; an explicit retry completes in order', async () => {
  const { calls, dependencies } = setup();
  const removeTree = dependencies.deleteUserTree;
  dependencies.deleteUserTree = async () => { throw new Error('unavailable'); };
  await assert.rejects(deleteOwnAccount(request(), dependencies), /unavailable/);
  assert.deepEqual(calls.map(([operation]) => operation), ['mark']);
  dependencies.deleteUserTree = removeTree;
  await deleteOwnAccount(request(), dependencies);
  assert.deepEqual(calls.map(([operation]) => operation), ['mark', 'mark', 'tree', 'auth', 'clear']);
});

test('Auth failure keeps the deletion marker; missing Auth user is safe to retry', async () => {
  const { calls, dependencies } = setup();
  dependencies.deleteAuthUser = async () => { throw new Error('unavailable'); };
  await assert.rejects(deleteOwnAccount(request(), dependencies), /unavailable/);
  assert.deepEqual(calls.map(([operation]) => operation), ['mark', 'tree']);
  dependencies.getUser = async () => { throw { code: 'auth/user-not-found' }; };
  dependencies.deleteAuthUser = async () => { throw { code: 'auth/user-not-found' }; };
  await deleteOwnAccount(request(), dependencies);
  assert.equal(calls.at(-1)[0], 'clear');
});
