import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const time = Timestamp.fromDate(new Date('2026-01-02T12:00:00.000Z'));
const indicator = {
  group: 'factor',
  name: 'Café',
  abbreviation: 'CAF',
  emoji: null,
  valueType: 'numeric',
  numeric: { unit: 'xícaras', min: 0, max: null, step: 1 },
  scale: null,
  options: null,
  desiredDirection: null,
  idealRange: null,
  frequency: 'multiple_per_day',
  dailyAggregation: 'sum',
  sortOrder: 1000,
  archivedAt: null,
  lockedAt: null,
  createdAt: time,
  updatedAt: time,
};

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-pulsar-indicator-lock-transition',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
beforeEach(() => env.clearFirestore());
afterAll(() => env.cleanup());

describe('indicator lock transition', () => {
  it('locks the existing configuration atomically and prevents later changes', async () => {
    const ref = doc(env.authenticatedContext('alice').firestore(), 'users/alice/indicators/coffee');
    await assertSucceeds(setDoc(ref, indicator));
    await assertFails(updateDoc(ref, { lockedAt: time, dailyAggregation: 'mean' }));
    await assertFails(updateDoc(ref, { lockedAt: time, numeric: { ...indicator.numeric, unit: 'ml' } }));
    await assertSucceeds(updateDoc(ref, { lockedAt: time, name: 'Café novo' }));
    await assertFails(updateDoc(ref, { lockedAt: null }));
    await assertFails(updateDoc(ref, { dailyAggregation: 'mean' }));
  });

  it('archives without deleting entries and denies client deletion and cross-user changes', async () => {
    const ref = doc(env.authenticatedContext('alice').firestore(), 'users/alice/indicators/coffee');
    const entry = doc(env.authenticatedContext('alice').firestore(), 'users/alice/entries/first');
    await assertSucceeds(setDoc(ref, indicator));
    await env.withSecurityRulesDisabled((context) =>
      setDoc(doc(context.firestore(), 'users/alice/entries/first'), { indicatorId: 'coffee' }),
    );
    await assertFails(
      updateDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice/indicators/coffee'), {
        archivedAt: time,
      }),
    );
    await assertSucceeds(updateDoc(ref, { archivedAt: time }));
    await assertFails(deleteDoc(ref));
    await assertSucceeds(getDoc(entry));
  });
});
