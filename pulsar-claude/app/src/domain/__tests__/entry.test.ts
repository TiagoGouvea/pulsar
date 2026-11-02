import { describe, expect, it } from 'vitest';
import type { IndicatorInput } from '../indicator';
import { validateEntryValue } from '../entry';

const base = {
  abbreviation: null,
  emoji: null,
  numeric: null,
  scale: null,
  options: null,
  desiredDirection: null,
  idealRange: null,
  frequency: 'single_per_day',
  dailyAggregation: null,
  group: 'factor',
  name: 'X',
} as const;

const boolInd: IndicatorInput = { ...base, valueType: 'boolean' };
const numInd: IndicatorInput = {
  ...base,
  valueType: 'numeric',
  numeric: { unit: 'xícaras', min: 0, max: null, step: 0.5 },
};
const boundedNum: IndicatorInput = {
  ...base,
  valueType: 'numeric',
  numeric: { unit: 'kg', min: 0, max: 100, step: 0.1 },
};
const scaleInd: IndicatorInput = { ...base, valueType: 'scale', scale: { min: 0, max: 10, step: 1 } };
const ordInd: IndicatorInput = {
  ...base,
  valueType: 'ordinal',
  options: [
    { id: 'low', label: 'Pouco' },
    { id: 'high', label: 'Muito' },
  ],
};

const ok = (i: IndicatorInput, v: unknown) => validateEntryValue(i, v as never).valid;

describe('validateEntryValue', () => {
  it('accepts boolean values, including false', () => {
    expect(ok(boolInd, { boolean: true })).toBe(true);
    expect(ok(boolInd, { boolean: false })).toBe(true);
  });

  it('accepts numbers for numeric indicators, including 0 and decimals', () => {
    expect(ok(numInd, { number: 0 })).toBe(true);
    expect(ok(numInd, { number: 1.5 })).toBe(true);
  });

  it('rejects non-finite or non-number values', () => {
    expect(ok(numInd, { number: NaN })).toBe(false);
    expect(ok(numInd, { number: Infinity })).toBe(false);
    expect(ok(numInd, { number: '3' })).toBe(false);
  });

  it('respects numeric min/max when configured', () => {
    expect(ok(boundedNum, { number: -1 })).toBe(false);
    expect(ok(boundedNum, { number: 101 })).toBe(false);
    expect(ok(boundedNum, { number: 100 })).toBe(true);
    expect(ok(numInd, { number: 9999 })).toBe(true);
  });

  it('keeps scale values inside min..max', () => {
    expect(ok(scaleInd, { number: 0 })).toBe(true);
    expect(ok(scaleInd, { number: 10 })).toBe(true);
    expect(ok(scaleInd, { number: 11 })).toBe(false);
    expect(ok(scaleInd, { number: -1 })).toBe(false);
  });

  it('accepts only existing option ids for ordinal indicators', () => {
    expect(ok(ordInd, { optionId: 'high' })).toBe(true);
    expect(ok(ordInd, { optionId: 'medium' })).toBe(false);
    expect(ok(ordInd, { optionId: '' })).toBe(false);
  });

  it('rejects values incompatible with the indicator type', () => {
    expect(ok(boolInd, { number: 1 })).toBe(false);
    expect(ok(boolInd, { optionId: 'low' })).toBe(false);
    expect(ok(numInd, { boolean: true })).toBe(false);
    expect(ok(scaleInd, { optionId: 'low' })).toBe(false);
    expect(ok(ordInd, { number: 1 })).toBe(false);
    expect(ok(ordInd, { boolean: false })).toBe(false);
  });

  it('rejects empty values and values with more than one key', () => {
    expect(ok(boolInd, {})).toBe(false);
    expect(ok(boolInd, null)).toBe(false);
    expect(ok(numInd, { number: 1, boolean: true })).toBe(false);
  });

  it('reports errors on the value field', () => {
    const r = validateEntryValue(boolInd, { number: 1 } as never);
    expect(r.errors.map((e) => e.field)).toContain('value');
  });
});
