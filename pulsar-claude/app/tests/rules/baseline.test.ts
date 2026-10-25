import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-pulsar-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
beforeEach(() => env.clearFirestore());
afterAll(() => env.cleanup());

describe('baseline UID isolation', () => {
  it('lets a user read and write their own documents', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(alice, 'users/alice'), { aiConsent: false }));
    await assertSucceeds(getDoc(doc(alice, 'users/alice')));
  });

  it("blocks reading another user's documents and unauthenticated access", async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), 'users/alice/entries/e1'), { x: 1 }),
    );
    await assertFails(getDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice/entries/e1')));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/alice/entries/e1')));
  });

  it('keeps internal/ server-only', async () => {
    await assertFails(getDoc(doc(env.authenticatedContext('alice').firestore(), 'internal/userQuotas')));
  });
});
