import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

let env: RulesTestEnvironment;
const instant = Timestamp.fromDate(new Date('2026-10-24T12:00:00.000Z'));
const indicator = {
  group: 'factor',
  name: 'Café',
  abbreviation: 'CAF',
  emoji: '☕',
  valueType: 'numeric',
  numeric: { unit: 'xícaras', min: 0, max: null, step: 0.5 },
  scale: null,
  options: null,
  desiredDirection: null,
  idealRange: null,
  frequency: 'single_per_day',
  dailyAggregation: null,
  sortOrder: 1000,
  archivedAt: null,
  lockedAt: instant,
  createdAt: instant,
  updatedAt: instant,
};
const booleanIndicator = { ...indicator, valueType: 'boolean', numeric: null };
const scaleIndicator = {
  ...indicator,
  valueType: 'scale',
  numeric: null,
  scale: { min: 0, max: 10, step: 1 },
};
const ordinalIndicator = {
  ...indicator,
  valueType: 'ordinal',
  numeric: null,
  options: [
    { id: 'low', label: 'Baixo' },
    { id: 'high', label: 'Alto' },
  ],
};
const entry = {
  indicatorId: 'indicator',
  localDate: '2026-10-24',
  recordedAt: instant,
  valueType: 'numeric',
  value: { number: 1 },
};

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-pulsar-entry-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
beforeEach(() => env.clearFirestore());
afterAll(() => env.cleanup());

const seedIndicator = (data: Record<string, unknown> = indicator, uid = 'alice', id = 'indicator') =>
  env.withSecurityRulesDisabled((context) =>
    setDoc(doc(context.firestore(), `users/${uid}/indicators/${id}`), data),
  );
const seedEntry = (data: Record<string, unknown> = entry, uid = 'alice', id = 'entry') =>
  env.withSecurityRulesDisabled((context) =>
    setDoc(doc(context.firestore(), `users/${uid}/entries/${id}`), data),
  );

describe('entry security rules', () => {
  it.each([
    ['numeric zero', indicator, { valueType: 'numeric', value: { number: 0 } }],
    ['boolean false', booleanIndicator, { valueType: 'boolean', value: { boolean: false } }],
    ['scale', scaleIndicator, { valueType: 'scale', value: { number: 7 } }],
    ['ordinal first option', ordinalIndicator, { valueType: 'ordinal', value: { optionId: 'low' } }],
    ['ordinal second option', ordinalIndicator, { valueType: 'ordinal', value: { optionId: 'high' } }],
  ])('accepts %s for the owner and permits an optional note', async (_label, configured, value) => {
    await seedIndicator(configured);
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(db, 'users/alice/entries/without-note'), { ...entry, ...value }));
    await assertSucceeds(
      setDoc(doc(db, 'users/alice/entries/with-note'), { ...entry, ...value, note: 'x'.repeat(500) }),
    );
  });

  it.each([
    ['wrong value type', indicator, { valueType: 'boolean', value: { boolean: true } }],
    ['boolean represented as a number', booleanIndicator, { valueType: 'boolean', value: { number: 1 } }],
    [
      'boolean value has the wrong primitive',
      booleanIndicator,
      { valueType: 'boolean', value: { boolean: 'true' } },
    ],
    ['numeric represented as text', indicator, { valueType: 'numeric', value: { number: '1' } }],
    ['scale represented as an option', scaleIndicator, { valueType: 'scale', value: { optionId: 'high' } }],
    ['unknown ordinal option', ordinalIndicator, { valueType: 'ordinal', value: { optionId: 'missing' } }],
    ['empty value', indicator, { value: {} }],
    ['multiple value fields', indicator, { value: { number: 1, boolean: true } }],
  ])('rejects %s', async (_label, configured, patch) => {
    await seedIndicator(configured);
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'users/alice/entries/entry'), { ...entry, ...patch }));
  });

  it.each([
    ['extra field', { extra: true }],
    ['note longer than 500 characters', { note: 'x'.repeat(501) }],
    ['non-string note', { note: 123 }],
    ['invalid timestamp', { recordedAt: '2026-10-24T12:00:00Z' }],
  ])('rejects %s', async (_label, patch) => {
    await seedIndicator();
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'users/alice/entries/entry'), { ...entry, ...patch }));
  });

  it.each(['indicatorId', 'localDate', 'recordedAt', 'valueType', 'value'])(
    'rejects a missing %s',
    async (field) => {
      await seedIndicator();
      const data: Record<string, unknown> = { ...entry };
      delete data[field];
      const db = env.authenticatedContext('alice').firestore();
      await assertFails(setDoc(doc(db, 'users/alice/entries/entry'), data));
    },
  );

  it('rejects a missing indicator and an indicator owned only by another user', async () => {
    await seedIndicator(indicator, 'bob');
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'users/alice/entries/missing'), entry));
    await assertFails(
      setDoc(doc(db, 'users/alice/entries/other'), { ...entry, indicatorId: 'bob/indicator' }),
    );
  });

  it('requires the indicator to be locked and accepts locking it in the same batch as the first entry', async () => {
    await seedIndicator({ ...indicator, lockedAt: null });
    const db = env.authenticatedContext('alice').firestore();
    const indicatorRef = doc(db, 'users/alice/indicators/indicator');
    const entryRef = doc(db, 'users/alice/entries/first');
    await assertFails(setDoc(entryRef, entry));
    const batch = writeBatch(db);
    batch.update(indicatorRef, { lockedAt: serverTimestamp() });
    batch.set(entryRef, { ...entry, recordedAt: serverTimestamp() });
    await assertSucceeds(batch.commit());
    expect((await getDoc(indicatorRef)).data()?.lockedAt).toBeInstanceOf(Timestamp);
    expect((await getDoc(entryRef)).data()?.recordedAt).toBeInstanceOf(Timestamp);
  });

  it('does not leave the lock or entry behind when the first entry in the batch is invalid', async () => {
    await seedIndicator({ ...indicator, lockedAt: null });
    const db = env.authenticatedContext('alice').firestore();
    const indicatorRef = doc(db, 'users/alice/indicators/indicator');
    const entryRef = doc(db, 'users/alice/entries/first');
    const batch = writeBatch(db);
    batch.update(indicatorRef, { lockedAt: serverTimestamp() });
    batch.set(entryRef, { ...entry, value: { boolean: true } });
    await assertFails(batch.commit());
    expect((await getDoc(indicatorRef)).data()?.lockedAt).toBeNull();
    expect((await getDoc(entryRef)).exists()).toBe(false);
  });

  it.each(['2026-10-23', '2026-10-24'])(
    'rejects update and overwrite for %s, even for one field',
    async (date) => {
      await seedIndicator();
      await seedEntry({ ...entry, localDate: date, note: 'Original' });
      const db = env.authenticatedContext('alice').firestore();
      const ref = doc(db, 'users/alice/entries/entry');
      await assertFails(updateDoc(ref, { value: { number: 2 } }));
      await assertFails(updateDoc(ref, { note: 'Alterada' }));
      await assertFails(setDoc(ref, { ...entry, localDate: date, value: { number: 2 } }));
      expect((await getDoc(ref)).data()).toMatchObject({ value: { number: 1 }, note: 'Original' });
    },
  );

  it('accepts atomic replacement with a new ID and deletion of the previous entry', async () => {
    await seedIndicator();
    await seedEntry();
    const db = env.authenticatedContext('alice').firestore();
    const previous = doc(db, 'users/alice/entries/entry');
    const replacement = doc(db, 'users/alice/entries/new-id');
    const batch = writeBatch(db);
    batch.set(replacement, { ...entry, recordedAt: serverTimestamp(), value: { number: 2 } });
    batch.delete(previous);
    await assertSucceeds(batch.commit());
    expect((await getDoc(previous)).exists()).toBe(false);
    expect((await getDoc(replacement)).data()).toMatchObject({ value: { number: 2 } });
  });

  it.each(['1900-01-01', '2099-12-31'])(
    'allows creation and deletion on %s without server-date comparison',
    async (date) => {
      await seedIndicator();
      const db = env.authenticatedContext('alice').firestore();
      const ref = doc(db, 'users/alice/entries/entry');
      await assertSucceeds(setDoc(ref, { ...entry, localDate: date }));
      await assertSucceeds(deleteDoc(ref));
      expect((await getDoc(ref)).exists()).toBe(false);
    },
  );

  it('isolates reads, writes, updates and deletes from another user and unauthenticated clients', async () => {
    await seedIndicator();
    await seedEntry();
    for (const db of [
      env.authenticatedContext('bob').firestore(),
      env.unauthenticatedContext().firestore(),
    ]) {
      const ref = doc(db, 'users/alice/entries/entry');
      await assertFails(getDoc(ref));
      await assertFails(setDoc(doc(db, 'users/alice/entries/other'), entry));
      await assertFails(updateDoc(ref, { value: { number: 2 } }));
      await assertFails(deleteDoc(ref));
    }
  });
});
