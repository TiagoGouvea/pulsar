import { describe, expect, it } from 'vitest';
import type { Indicator } from '@features/indicators/types';
import type { Entry } from './types';
import {
  aggregateDay,
  entriesForDate,
  entriesForIndicator,
  formatDailyAggregate,
  formatEntryValue,
  formatLocalDate,
  isLocalDate,
  noteByteLength,
  privacyEmoji,
  privacyHeading,
  privacyLabel,
  singleEntryId,
  validateEntryValue,
  validateNote,
  MAX_NOTE_BYTES
} from './model';

function indicator(overrides: Partial<Indicator> = {}): Indicator {
  return {
    id: 'exe',
    group: 'factor',
    name: 'Exercício Físico',
    abbreviation: 'EXE',
    emoji: '🏋️',
    valueType: 'boolean',
    frequency: 'single_per_day',
    sortOrder: 10,
    firstEntryAt: null,
    archivedAt: null,
    createdAt: '2026-10-24T10:00:00.000Z',
    updatedAt: '2026-10-24T10:00:00.000Z',
    ...overrides
  };
}

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'entry-1',
    indicatorId: 'exe',
    localDate: '2026-10-24',
    recordedAt: '2026-10-24T10:00:00.000Z',
    valueType: 'boolean',
    value: { boolean: true },
    note: '',
    ...overrides
  };
}

describe('local dates and entry identity', () => {
  it('formats the browser local calendar date instead of the UTC date', () => {
    expect(formatLocalDate(new Date(2026, 9, 24, 23, 59))).toBe('2026-10-24');
    expect(formatLocalDate(new Date(2026, 0, 1, 0, 1))).toBe('2026-01-01');
  });

  it('validates real calendar dates and rejects impossible ones', () => {
    expect(isLocalDate('2026-10-24')).toBe(true);
    expect(isLocalDate('2024-02-29')).toBe(true);
    expect(isLocalDate('2026-02-29')).toBe(false);
    expect(isLocalDate('24/10/2026')).toBe(false);
  });

  it('builds the same deterministic ID the Firestore rules enforce', () => {
    expect(singleEntryId('ind-abc', '2026-10-24')).toBe('ind-abc_2026-10-24');
  });

  it('filters records by indicator and by local date', () => {
    const list = [
      entry({ id: 'today' }),
      entry({ id: 'yesterday', localDate: '2026-10-23' }),
      entry({ id: 'other', indicatorId: 'caf' })
    ];
    expect(entriesForIndicator(list, 'exe').map((item) => item.id)).toEqual(['today', 'yesterday']);
    expect(entriesForDate(list, '2026-10-24').map((item) => item.id)).toEqual(['today', 'other']);
  });
});

describe('daily aggregation', () => {
  it('keeps absence distinct from false and zero', () => {
    const boolean = indicator();
    const numeric = indicator({
      id: 'caf',
      name: 'Café',
      abbreviation: 'CAF',
      valueType: 'numeric',
      numeric: { unit: 'xícaras', min: 0, max: null, step: 1 },
      frequency: 'multiple_per_day',
      dailyAggregation: 'sum'
    });

    expect(aggregateDay(boolean, [], '2026-10-24')).toBeNull();
    expect(
      aggregateDay(boolean, [entry({ value: { boolean: false } })], '2026-10-24')?.value
    ).toEqual({ boolean: false });
    expect(
      aggregateDay(numeric, [entry({ indicatorId: 'caf', valueType: 'numeric', value: { number: 0 } })], '2026-10-24')?.value
    ).toEqual({ number: 0 });
  });

  it('sums, averages and takes the last numeric event with a stable tiebreaker', () => {
    const numeric = indicator({
      id: 'caf',
      valueType: 'numeric',
      numeric: { unit: 'xícaras', min: 0, max: null, step: 1 },
      frequency: 'multiple_per_day',
      dailyAggregation: 'sum'
    });
    const events = [
      entry({ id: 'b', indicatorId: 'caf', valueType: 'numeric', value: { number: 2 }, recordedAt: '2026-10-24T10:00:00.000Z' }),
      entry({ id: 'a', indicatorId: 'caf', valueType: 'numeric', value: { number: 3 }, recordedAt: '2026-10-24T10:00:00.000Z' })
    ];

    expect(aggregateDay(numeric, events, '2026-10-24')).toMatchObject({ count: 2, value: { number: 5 } });
    expect(
      aggregateDay({ ...numeric, dailyAggregation: 'mean' }, events, '2026-10-24')?.value
    ).toEqual({ number: 2.5 });
    // Both events share the same timestamp; the largest ID is the stable last one.
    expect(
      aggregateDay({ ...numeric, dailyAggregation: 'last' }, events, '2026-10-24')?.value
    ).toEqual({ number: 2 });
  });

  it('applies presence and last to booleans without treating missing as false', () => {
    const boolean = indicator({ frequency: 'multiple_per_day', dailyAggregation: 'any' });
    const events = [
      entry({ id: 'a', value: { boolean: false } }),
      entry({ id: 'b', value: { boolean: true } })
    ];
    expect(aggregateDay(boolean, events, '2026-10-24')?.value).toEqual({ boolean: true });
    expect(
      aggregateDay({ ...boolean, dailyAggregation: 'last' }, events, '2026-10-24')?.value
    ).toEqual({ boolean: true });
    expect(
      aggregateDay(
        { ...boolean, dailyAggregation: 'any' },
        [entry({ value: { boolean: false } })],
        '2026-10-24'
      )?.value
    ).toEqual({ boolean: false });
  });

  it('uses the last ordinal option and formats the stored values', () => {
    const ordinal = indicator({
      id: 'hum',
      valueType: 'ordinal',
      options: [
        { id: 'low', label: 'Baixo', order: 0 },
        { id: 'high', label: 'Alto', order: 1 }
      ],
      frequency: 'multiple_per_day',
      dailyAggregation: 'last'
    });
    const events = [
      entry({ id: 'older', indicatorId: 'hum', valueType: 'ordinal', value: { optionId: 'low' }, recordedAt: '2026-10-24T09:00:00.000Z' }),
      entry({ id: 'newer', indicatorId: 'hum', valueType: 'ordinal', value: { optionId: 'high' }, recordedAt: '2026-10-24T11:00:00.000Z' })
    ];
    const aggregate = aggregateDay(ordinal, events, '2026-10-24');
    expect(aggregate?.value).toEqual({ optionId: 'high' });
    expect(formatDailyAggregate(ordinal, aggregate!)).toBe('Alto');
  });

  it('formats zero, false and scale values without hiding chart numbers', () => {
    const numeric = indicator({
      id: 'caf',
      valueType: 'numeric',
      numeric: { unit: 'xícaras', min: 0, max: null, step: 1 }
    });
    const scale = indicator({
      id: 'ene',
      valueType: 'scale',
      scale: { min: 0, max: 10, step: 1 }
    });
    expect(formatEntryValue(numeric, { number: 0 })).toBe('0 xícaras');
    expect(formatEntryValue(indicator(), { boolean: false })).toBe('Não');
    expect(formatEntryValue(scale, { number: 7 })).toBe('7/10');
  });
});

describe('entry validation and privacy labels', () => {
  it('validates each structured value against its indicator and limits', () => {
    const boolean = indicator();
    const scale = indicator({ id: 'ene', valueType: 'scale', scale: { min: 0, max: 10, step: 1 } });
    const numeric = indicator({
      id: 'caf',
      valueType: 'numeric',
      numeric: { unit: 'mg', min: 0, max: 200, step: 1 }
    });
    const ordinal = indicator({
      id: 'hum',
      valueType: 'ordinal',
      options: [{ id: 'low', label: 'Baixo', order: 0 }]
    });

    expect(validateEntryValue(boolean, 'boolean', { boolean: false })).toBeNull();
    expect(validateEntryValue(boolean, 'boolean', { boolean: true })).toBeNull();
    expect(validateEntryValue(boolean, 'numeric', { number: 1 })).not.toBeNull();
    expect(validateEntryValue(scale, 'scale', { number: 10 })).toBeNull();
    expect(validateEntryValue(scale, 'scale', { number: 11 })).not.toBeNull();
    expect(validateEntryValue(numeric, 'numeric', { number: 0 })).toBeNull();
    expect(validateEntryValue(numeric, 'numeric', { number: 201 })).not.toBeNull();
    expect(validateEntryValue(ordinal, 'ordinal', { optionId: 'low' })).toBeNull();
    expect(validateEntryValue(ordinal, 'ordinal', { optionId: 'high' })).not.toBeNull();
  });

  it('limits observations by UTF-8 bytes', () => {
    expect(validateNote('')).toBeNull();
    expect(validateNote('x'.repeat(MAX_NOTE_BYTES))).toBeNull();
    expect(validateNote('x'.repeat(MAX_NOTE_BYTES + 1))).not.toBeNull();
    expect(noteByteLength('🏋️')).toBe(7);
  });

  it('hides names, fallback abbreviations and emojis while names are hidden', () => {
    const noAbbreviation = indicator({ name: 'Concentração', abbreviation: '', emoji: '🧠' });
    expect(privacyLabel(noAbbreviation, false)).toBe('Con...');
    expect(privacyLabel(noAbbreviation, true)).toBe('Concentração');
    expect(privacyEmoji(noAbbreviation, false)).toBeNull();
    expect(privacyEmoji(noAbbreviation, true)).toBe('🧠');
    expect(privacyHeading(noAbbreviation, false)).toBe('Con...');
    expect(privacyHeading(noAbbreviation, true)).toBe('🧠 Concentração');
  });
});
