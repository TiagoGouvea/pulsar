import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type DocumentReference, type Firestore } from 'firebase-admin/firestore';
import { beforeAll, describe, expect, it } from 'vitest';

// Emulator endpoints (ports from firebase.json); the Admin SDK reads these env vars lazily.
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8282';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9299';

const PROJECT = 'demo-pulsar';
const CALLABLE_URL = `http://127.0.0.1:5001/${PROJECT}/southamerica-east1/deleteAccount`;
const AUTH_URL = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`;

type Session = { uid: string; idToken: string };
type CallResult = {
  status: number;
  body: { result?: unknown; error?: { status?: string; message?: string } };
};

let db: Firestore;
const auth = () => getAuth();

beforeAll(() => {
  initializeApp({ projectId: PROJECT });
  db = getFirestore();
});

async function signUp(credentials?: { email: string; password: string }): Promise<Session> {
  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      credentials ? { ...credentials, returnSecureToken: true } : { returnSecureToken: true },
    ),
  });
  const json = (await response.json()) as { localId: string; idToken: string };
  return { uid: json.localId, idToken: json.idToken };
}

const uniqueEmail = () => `del-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

// The Auth emulator issues unsigned tokens, so auth_time can be moved into the past to simulate a stale login.
function withAuthTime(idToken: string, secondsAgo: number): string {
  const [header, payload, signature = ''] = idToken.split('.');
  const claims = JSON.parse(Buffer.from(payload ?? '', 'base64url').toString()) as Record<string, unknown>;
  const authTime = Math.floor(Date.now() / 1000) - secondsAgo;
  claims.auth_time = authTime;
  claims.iat = authTime;
  claims.exp = Math.floor(Date.now() / 1000) + 3600;
  return [header, Buffer.from(JSON.stringify(claims)).toString('base64url'), signature].join('.');
}

async function callDeleteAccount(idToken?: string, data: Record<string, unknown> = {}): Promise<CallResult> {
  const response = await fetch(CALLABLE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ data }),
  });
  return { status: response.status, body: (await response.json()) as CallResult['body'] };
}

// Counts every document reference below a path, including "phantom" parents that only hold subcollections.
async function countTree(ref: DocumentReference): Promise<number> {
  let total = 0;
  for (const collection of await ref.listCollections()) {
    for (const doc of await collection.listDocuments()) {
      total += 1 + (await countTree(doc));
    }
  }
  return total;
}

const userExists = (uid: string) =>
  auth()
    .getUser(uid)
    .then(() => true)
    .catch(() => false);

async function seedAccount(uid: string, bulkRecords = 0): Promise<void> {
  await db.doc(`users/${uid}`).set({ onboardingCompleted: true });
  await db.doc(`users/${uid}/indicators/i1`).set({ name: 'ZQX_ENERGIA_7F3' });
  await db.doc(`users/${uid}/indicators/i1/records/r1`).set({ value: 3 });
  await db.doc(`users/${uid}/feedback/f1`).set({ text: 'ZQX_OBS_NOTA_5T1' });
  await db.doc(`users/${uid}/completions/c1`).set({ localDate: '2026-01-01' });
  await db.doc(`users/${uid}/pushTokens/t1`).set({ token: 'abc' });
  await db.doc(`internal/userAdmin/users/${uid}`).set({ lastNotificationSentAt: new Date(0) });
  await db.doc(`internal/aiQuota/users/${uid}`).set({ count: 1 });
  await db.doc(`internal/aiQuota/users/${uid}/days/2026-01-01`).set({ count: 1 });
  const writer = db.bulkWriter();
  for (let i = 0; i < bulkRecords; i += 1) {
    void writer.set(db.doc(`users/${uid}/bulk/b${i}`), { i });
  }
  await writer.close();
}

const remaining = async (uid: string) =>
  (await countTree(db.doc(`users/${uid}`))) +
  Number((await db.doc(`users/${uid}`).get()).exists) +
  (await countTree(db.doc(`internal/userAdmin/users/${uid}`))) +
  (await countTree(db.doc(`internal/aiQuota/users/${uid}`))) +
  Number((await db.doc(`internal/userAdmin/users/${uid}`).get()).exists) +
  Number((await db.doc(`internal/aiQuota/users/${uid}`).get()).exists);

describe('deleteAccount callable', () => {
  it('rejects unauthenticated calls', async () => {
    const result = await callDeleteAccount();
    expect(result.status).toBe(401);
    expect(result.body.error?.status).toBe('UNAUTHENTICATED');
  });

  it('removes every document under users/{uid} and internal/ for an anonymous user, then the Auth user', async () => {
    const session = await signUp();
    await seedAccount(session.uid);
    expect(await remaining(session.uid)).toBeGreaterThan(0);

    const result = await callDeleteAccount(session.idToken);

    expect(result.status).toBe(200);
    expect(await remaining(session.uid)).toBe(0);
    expect(await userExists(session.uid)).toBe(false);
  });

  it('removes the Auth user only after the Firestore cleanup is complete', async () => {
    const session = await signUp();
    await seedAccount(session.uid, 400);

    let violation = false;
    let done = false;
    const watcher = (async () => {
      while (!done) {
        const authGone = !(await userExists(session.uid));
        // Reading Auth first, then Firestore: if Auth was already gone, data must already be gone too.
        if (authGone && (await remaining(session.uid)) > 0) violation = true;
      }
    })();

    const result = await callDeleteAccount(session.idToken);
    done = true;
    await watcher;

    expect(result.status).toBe(200);
    expect(violation).toBe(false);
    expect(await remaining(session.uid)).toBe(0);
    expect(await userExists(session.uid)).toBe(false);
  });

  it('is idempotent: a second call after deletion succeeds', async () => {
    const session = await signUp();
    await seedAccount(session.uid);

    expect((await callDeleteAccount(session.idToken)).status).toBe(200);
    expect((await callDeleteAccount(session.idToken)).status).toBe(200);
    expect(await remaining(session.uid)).toBe(0);
    expect(await userExists(session.uid)).toBe(false);
  });

  it('deletes a non-anonymous account with a recent login', async () => {
    const session = await signUp({ email: uniqueEmail(), password: 'Senha-123456' });
    await seedAccount(session.uid);

    const result = await callDeleteAccount(withAuthTime(session.idToken, 60));

    expect(result.status).toBe(200);
    expect(await remaining(session.uid)).toBe(0);
    expect(await userExists(session.uid)).toBe(false);
  });

  it('answers requires-recent-login for a non-anonymous account whose login is older than 5 minutes, deleting nothing', async () => {
    const session = await signUp({ email: uniqueEmail(), password: 'Senha-123456' });
    await seedAccount(session.uid);
    const before = await remaining(session.uid);

    const result = await callDeleteAccount(withAuthTime(session.idToken, 6 * 60));

    expect(result.status).toBeGreaterThanOrEqual(400);
    expect(result.body.error?.message).toBe('requires-recent-login');
    expect(await remaining(session.uid)).toBe(before);
    expect(await userExists(session.uid)).toBe(true);
  });

  it('does not require a recent login for anonymous accounts', async () => {
    const session = await signUp();
    await seedAccount(session.uid);

    const result = await callDeleteAccount(withAuthTime(session.idToken, 60 * 60));

    expect(result.status).toBe(200);
    expect(await remaining(session.uid)).toBe(0);
    expect(await userExists(session.uid)).toBe(false);
  });

  it('only ever deletes the caller: a UID passed in the payload cannot target another user', async () => {
    const caller = await signUp();
    const victim = await signUp();
    await seedAccount(caller.uid);
    await seedAccount(victim.uid);
    const victimBefore = await remaining(victim.uid);

    const result = await callDeleteAccount(caller.idToken, { uid: victim.uid, userId: victim.uid });

    expect(result.status).toBe(200);
    expect(await remaining(caller.uid)).toBe(0);
    expect(await userExists(caller.uid)).toBe(false);
    expect(await remaining(victim.uid)).toBe(victimBefore);
    expect(await userExists(victim.uid)).toBe(true);
  });
});
