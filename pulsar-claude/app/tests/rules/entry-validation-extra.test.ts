import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const timestamp = Timestamp.fromDate(new Date('2026-10-24T12:00:00Z'));
const indicator = {
  group: 'factor',
  name: 'Example',
  abbreviation: null,
  emoji: null,
  valueType: 'numeric',
  numeric: { unit: '', min: 1, max: 5, step: 1 },
  scale: null,
  options: null,
  desiredDirection: null,
  idealRange: null,
  frequency: 'single_per_day',
  dailyAggregation: null,
  sortOrder: 1,
  archivedAt: null,
  lockedAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
};
const entry = {
  indicatorId: 'example',
  localDate: '2026-10-24',
  recordedAt: timestamp,
  valueType: 'numeric',
  value: { number: 1 },
};

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-pulsar-entry-validation-extra',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
beforeEach(() => env.clearFirestore());
afterAll(() => env.cleanup());

async function seedIndicator(data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled((context) =>
    setDoc(doc(context.firestore(), 'users/alice/indicators/example'), data),
  );
}

describe('additional entry validation', () => {
  it('enforces numeric bounds and the date-key shape', async () => {
    await seedIndicator(indicator);
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(db, 'users/alice/entries/min'), entry));
    await assertSucceeds(setDoc(doc(db, 'users/alice/entries/max'), { ...entry, value: { number: 5 } }));
    await assertFails(setDoc(doc(db, 'users/alice/entries/below'), { ...entry, value: { number: 0 } }));
    await assertFails(setDoc(doc(db, 'users/alice/entries/above'), { ...entry, value: { number: 6 } }));
    await assertFails(setDoc(doc(db, 'users/alice/entries/date'), { ...entry, localDate: 'today' }));
  });

  it('accepts all seven ordinal options and rejects an option outside the list', async () => {
    const options = Array.from({ length: 7 }, (_, index) => ({ id: `option-${index}`, label: `${index}` }));
    await seedIndicator({ ...indicator, valueType: 'ordinal', numeric: null, options });
    const db = env.authenticatedContext('alice').firestore();
    for (const option of options) {
      await assertSucceeds(
        setDoc(doc(db, `users/alice/entries/${option.id}`), {
          ...entry,
          valueType: 'ordinal',
          value: { optionId: option.id },
        }),
      );
    }
    await assertFails(
      setDoc(doc(db, 'users/alice/entries/unknown'), {
        ...entry,
        valueType: 'ordinal',
        value: { optionId: 'unknown' },
      }),
    );
  });
});
