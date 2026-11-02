import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-pulsar-rules-users',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
beforeEach(() => env.clearFirestore());
afterAll(() => env.cleanup());

// Token options are cast: the SDK types restrict sign_in_provider to a fixed union.
const anonymous = (uid: string) =>
  env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } } as never).firestore();
const permanent = (uid: string) =>
  env.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com' } } as never).firestore();

const seedAdmin = (path: string, data: Record<string, unknown>) =>
  env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), path), data));

describe('users/{uid} isolation', () => {
  it.each([
    ['anonymous', anonymous],
    ['permanent', permanent],
  ])('%s UID A cannot read or write anything under users/B', async (_name, ctxFor) => {
    await seedAdmin('users/bob', { aiConsent: true });
    await seedAdmin('users/bob/entries/e1', { x: 1 });
    const alice = ctxFor('alice');
    await assertFails(getDoc(doc(alice, 'users/bob')));
    await assertFails(setDoc(doc(alice, 'users/bob'), { aiConsent: false }));
    await assertFails(updateDoc(doc(alice, 'users/bob'), { aiConsent: false }));
    await assertFails(getDoc(doc(alice, 'users/bob/entries/e1')));
    await assertFails(setDoc(doc(alice, 'users/bob/entries/e2'), { x: 1 }));
  });

  it('blocks unauthenticated access', async () => {
    await seedAdmin('users/bob', { aiConsent: true });
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/bob')));
  });

  it('lets owners write valid documents (anonymous and permanent)', async () => {
    await assertSucceeds(setDoc(doc(anonymous('anon'), 'users/anon'), { onboardingCompleted: true }));
    await assertSucceeds(
      setDoc(doc(permanent('perm'), 'users/perm'), {
        onboardingCompleted: false,
        aiConsent: true,
        reminderEnabled: false,
        lastInsightRefreshAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
        createdAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
      }),
    );
  });
});

describe('users/{uid} schema validation', () => {
  const ref = () => doc(permanent('alice'), 'users/alice');

  it('rejects unknown fields', async () => {
    await assertFails(setDoc(ref(), { onboardingCompleted: true, hacked: true }));
    await assertFails(setDoc(ref(), { lastNotificationSentAt: Timestamp.now() }));
  });

  it.each([
    ['onboardingCompleted', 'yes'],
    ['aiConsent', 1],
    ['reminderEnabled', 'true'],
    ['lastInsightRefreshAt', 'today'],
    ['createdAt', 123],
  ])('rejects wrong type for %s', async (field, value) => {
    await assertFails(setDoc(ref(), { [field]: value }));
  });

  it('rejects unknown fields on update of an existing document', async () => {
    await seedAdmin('users/alice', { aiConsent: false });
    await assertFails(updateDoc(ref(), { somethingElse: 1 }));
    await assertSucceeds(updateDoc(ref(), { aiConsent: true }));
  });
});

describe('save-account invite dismissal state', () => {
  const ref = () => doc(anonymous('alice'), 'users/alice');

  it('accepts a timestamp or null for saveAccountInviteDismissedAt', async () => {
    await assertSucceeds(setDoc(ref(), { saveAccountInviteDismissedAt: Timestamp.now() }));
    await assertSucceeds(setDoc(ref(), { saveAccountInviteDismissedAt: null }));
  });

  it('accepts an integer >= 0 or null for saveAccountInviteDismissedDayCount', async () => {
    await assertSucceeds(setDoc(ref(), { saveAccountInviteDismissedDayCount: 0 }));
    await assertSucceeds(setDoc(ref(), { saveAccountInviteDismissedDayCount: 3 }));
    await assertSucceeds(setDoc(ref(), { saveAccountInviteDismissedDayCount: null }));
    await assertSucceeds(
      setDoc(ref(), { saveAccountInviteDismissedAt: Timestamp.now(), saveAccountInviteDismissedDayCount: 5 }),
    );
  });

  it.each([
    ['string', '3'],
    ['negative', -1],
    ['decimal', 2.5],
    ['boolean', true],
  ])('rejects %s for saveAccountInviteDismissedDayCount', async (_name, value) => {
    await assertFails(setDoc(ref(), { saveAccountInviteDismissedDayCount: value }));
  });

  it.each([
    ['string', '2026-01-01'],
    ['number', 1700000000],
  ])('rejects %s for saveAccountInviteDismissedAt', async (_name, value) => {
    await assertFails(setDoc(ref(), { saveAccountInviteDismissedAt: value }));
  });
});

describe('internal/**', () => {
  it('is inaccessible to clients', async () => {
    const alice = permanent('alice');
    await seedAdmin('internal/userQuotas', { n: 1 });
    await assertFails(getDoc(doc(alice, 'internal/userQuotas')));
    await assertFails(setDoc(doc(alice, 'internal/userQuotas'), { n: 2 }));
    await assertFails(setDoc(doc(anonymous('anon'), 'internal/x/y/z'), { n: 2 }));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'internal/userQuotas')));
  });
});
