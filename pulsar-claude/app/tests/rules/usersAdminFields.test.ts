import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, deleteField, doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-pulsar-rules-users-admin',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
beforeEach(() => env.clearFirestore());
afterAll(() => env.cleanup());

const seedAdmin = (path: string, data: Record<string, unknown>) =>
  env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), path), data));

describe('administrative fields stay out of client reach', () => {
  const alice = () => env.authenticatedContext('alice').firestore();

  it('lets the owner read a missing or client-only profile', async () => {
    await assertSucceeds(getDoc(doc(alice(), 'users/alice')));
    await seedAdmin('users/alice', { aiConsent: true });
    await assertSucceeds(getDoc(doc(alice(), 'users/alice')));
  });

  it('does not expose or let the owner rewrite misplaced admin fields', async () => {
    await seedAdmin('users/alice', { aiConsent: true, lastNotificationSentAt: Timestamp.now() });
    await assertFails(getDoc(doc(alice(), 'users/alice')));
    await assertFails(updateDoc(doc(alice(), 'users/alice'), { aiConsent: false }));
    await assertFails(updateDoc(doc(alice(), 'users/alice'), { lastNotificationSentAt: deleteField() }));
    await assertFails(setDoc(doc(alice(), 'users/alice'), { aiConsent: false }));
  });

  it('denies direct deletion of the profile, with or without admin fields', async () => {
    await seedAdmin('users/alice', { aiConsent: true });
    await assertFails(deleteDoc(doc(alice(), 'users/alice')));
    await seedAdmin('users/alice', { aiConsent: true, lastNotificationSentAt: Timestamp.now() });
    await assertFails(deleteDoc(doc(alice(), 'users/alice')));
  });

  it('keeps the per-user admin document under internal/ unreadable', async () => {
    await seedAdmin('internal/userAdmin/users/alice', { lastNotificationSentAt: Timestamp.now() });
    await assertFails(getDoc(doc(alice(), 'internal/userAdmin/users/alice')));
    await assertFails(deleteDoc(doc(alice(), 'internal/userAdmin/users/alice')));
  });
});
