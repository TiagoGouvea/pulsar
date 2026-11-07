import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

let env: RulesTestEnvironment;
const instant = Timestamp.fromDate(new Date('2026-01-02T12:00:00.000Z'));
const lockedInstant = Timestamp.fromDate(new Date('2026-01-03T12:00:00.000Z'));

const numericFactor = {
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
  frequency: 'multiple_per_day',
  dailyAggregation: 'sum',
  sortOrder: 1000,
  archivedAt: null,
  lockedAt: null,
  createdAt: instant,
  updatedAt: instant,
};
const numericResult = { ...numericFactor, group: 'result', desiredDirection: 'neutral' };
const scaleResult = {
  ...numericResult,
  valueType: 'scale',
  numeric: null,
  scale: { min: 0, max: 10, step: 1 },
  dailyAggregation: 'mean',
};
const ordinalFactor = {
  ...numericFactor,
  valueType: 'ordinal',
  numeric: null,
  options: [
    { id: 'low', label: 'Baixo' },
    { id: 'high', label: 'Alto' },
  ],
  dailyAggregation: 'last',
};
const booleanFactor = { ...numericFactor, valueType: 'boolean', numeric: null, dailyAggregation: 'any' };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-pulsar-indicator-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
beforeEach(() => env.clearFirestore());
afterAll(() => env.cleanup());

const ownerRef = (id = 'indicator') =>
  doc(env.authenticatedContext('alice').firestore(), `users/alice/indicators/${id}`);
const seed = (data: Record<string, unknown>, id = 'indicator') =>
  env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), `users/alice/indicators/${id}`), data));

describe('indicator access and schema', () => {
  it('allows valid indicators of each type and denies access to other users', async () => {
    for (const [index, data] of [
      numericFactor,
      numericResult,
      scaleResult,
      ordinalFactor,
      booleanFactor,
    ].entries()) {
      await assertSucceeds(setDoc(ownerRef(`i${index}`), data));
    }
    const other = doc(env.authenticatedContext('bob').firestore(), 'users/alice/indicators/i0');
    const unauthenticated = doc(env.unauthenticatedContext().firestore(), 'users/alice/indicators/i0');
    await assertFails(getDoc(other));
    await assertFails(updateDoc(other, { name: 'Outro nome' }));
    await assertFails(getDoc(unauthenticated));
    await assertFails(setDoc(unauthenticated, numericFactor));
  });

  it.each([
    ['unknown field', { injected: true }],
    ['empty name', { name: '' }],
    ['name longer than 60', { name: 'a'.repeat(61) }],
    ['abbreviation longer than 4', { abbreviation: 'ABCDE' }],
    ['unit longer than 20', { numeric: { ...numericFactor.numeric, unit: 'x'.repeat(21) } }],
    ['wrong group', { group: 'other' }],
    ['wrong value type', { valueType: 'text' }],
    ['wrong frequency', { frequency: 'weekly' }],
    ['wrong order type', { sortOrder: '1000' }],
    ['wrong archive type', { archivedAt: '2026-01-01' }],
    ['wrong lock type', { lockedAt: true }],
    ['wrong creation time type', { createdAt: '2026-01-01' }],
    ['wrong update time type', { updatedAt: 1 }],
  ])('rejects %s', async (_label, patch) => {
    await assertFails(setDoc(ownerRef(), { ...numericFactor, ...patch }));
  });

  it('rejects missing required fields', async () => {
    const withoutName: Record<string, unknown> = { ...numericFactor };
    delete withoutName.name;
    await assertFails(setDoc(ownerRef(), withoutName));
  });
});

describe('aggregation, direction and range', () => {
  it.each([
    ['numeric sum', numericFactor, 'sum'],
    ['numeric mean', numericFactor, 'mean'],
    ['numeric last', numericFactor, 'last'],
    ['scale sum', scaleResult, 'sum'],
    ['scale mean', scaleResult, 'mean'],
    ['scale last', scaleResult, 'last'],
    ['boolean any', booleanFactor, 'any'],
    ['boolean last', booleanFactor, 'last'],
    ['ordinal last', ordinalFactor, 'last'],
  ])('allows %s', async (_label, base, aggregation) => {
    await assertSucceeds(setDoc(ownerRef(), { ...base, dailyAggregation: aggregation }));
  });

  it.each([
    ['numeric any', numericFactor, 'any'],
    ['scale any', scaleResult, 'any'],
    ['boolean sum', booleanFactor, 'sum'],
    ['boolean mean', booleanFactor, 'mean'],
    ['ordinal any', ordinalFactor, 'any'],
    ['ordinal mean', ordinalFactor, 'mean'],
    ['ordinal sum', ordinalFactor, 'sum'],
    ['missing multiple-day aggregation', numericFactor, null],
  ])('rejects %s', async (_label, base, aggregation) => {
    await assertFails(setDoc(ownerRef(), { ...base, dailyAggregation: aggregation }));
  });

  it('allows only null aggregation for single-per-day indicators', async () => {
    await assertSucceeds(
      setDoc(ownerRef(), { ...numericFactor, frequency: 'single_per_day', dailyAggregation: null }),
    );
    await assertFails(
      setDoc(ownerRef(), { ...numericFactor, frequency: 'single_per_day', dailyAggregation: 'last' }),
    );
  });

  it('rejects direction for factors and a reversed ideal range', async () => {
    await assertFails(setDoc(ownerRef(), { ...numericFactor, desiredDirection: 'higher' }));
    await assertFails(setDoc(ownerRef(), { ...numericFactor, desiredDirection: 'neutral' }));
    await assertFails(
      setDoc(ownerRef(), {
        ...numericResult,
        desiredDirection: 'target_range',
        idealRange: { min: 8, max: 7 },
      }),
    );
    await assertSucceeds(
      setDoc(ownerRef(), {
        ...numericResult,
        desiredDirection: 'target_range',
        idealRange: { min: 7, max: 7 },
      }),
    );
  });

  it('requires a range only for target_range on numeric or scale results', async () => {
    await assertFails(
      setDoc(ownerRef(), { ...numericResult, desiredDirection: 'target_range', idealRange: null }),
    );
    await assertFails(setDoc(ownerRef(), { ...numericResult, idealRange: { min: 1, max: 2 } }));
    await assertFails(
      setDoc(ownerRef(), {
        ...booleanFactor,
        group: 'result',
        desiredDirection: 'target_range',
        idealRange: { min: 0, max: 1 },
      }),
    );
    await assertSucceeds(
      setDoc(ownerRef(), {
        ...scaleResult,
        desiredDirection: 'target_range',
        idealRange: { min: 2, max: 8 },
      }),
    );
  });
});

describe('locked indicators', () => {
  const changes = [
    ['group', numericFactor, { group: 'result', desiredDirection: 'neutral' }],
    ['value type', numericFactor, { valueType: 'boolean', numeric: null, dailyAggregation: 'any' }],
    ['unit', numericFactor, { numeric: { ...numericFactor.numeric, unit: 'ml' } }],
    ['scale', scaleResult, { scale: { min: 0, max: 5, step: 1 } }],
    [
      'options',
      ordinalFactor,
      {
        options: [
          { id: 'low', label: 'Baixo' },
          { id: 'mid', label: 'Médio' },
        ],
      },
    ],
    ['frequency', numericFactor, { frequency: 'single_per_day', dailyAggregation: null }],
    ['aggregation', numericFactor, { dailyAggregation: 'mean' }],
  ] as const;

  it.each(changes)(
    'allows changing %s before locking and rejects it after locking',
    async (_label, base, patch) => {
      await seed(base, 'unlocked');
      await seed({ ...base, lockedAt: lockedInstant }, 'locked');
      await assertSucceeds(updateDoc(ownerRef('unlocked'), patch));
      await assertFails(updateDoc(ownerRef('locked'), patch));
    },
  );

  it('accepts editing name, abbreviation, emoji, order, archive status, direction and range', async () => {
    await seed({ ...numericResult, lockedAt: lockedInstant });
    await assertSucceeds(
      updateDoc(ownerRef(), {
        name: 'Peso atual',
        abbreviation: 'PES',
        emoji: '⚖️',
        sortOrder: 2500,
        archivedAt: instant,
        desiredDirection: 'target_range',
        idealRange: { min: 60, max: 80 },
        updatedAt: instant,
      }),
    );
    const data = (await assertSucceeds(getDoc(ownerRef()))).data();
    expect(data).toMatchObject({
      name: 'Peso atual',
      abbreviation: 'PES',
      emoji: '⚖️',
      sortOrder: 2500,
      archivedAt: instant,
      desiredDirection: 'target_range',
      idealRange: { min: 60, max: 80 },
      lockedAt: lockedInstant,
    });
    await assertSucceeds(
      updateDoc(ownerRef(), { archivedAt: null, desiredDirection: 'lower', idealRange: null }),
    );
  });

  it('does not allow removing the lock or replacing a locked document with an unlocked one', async () => {
    await seed({ ...numericFactor, lockedAt: lockedInstant });
    await assertFails(updateDoc(ownerRef(), { lockedAt: null }));
    await assertFails(setDoc(ownerRef(), numericFactor));
  });
});
