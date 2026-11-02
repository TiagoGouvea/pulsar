import { describe, expect, it } from 'vitest';
import {
  allowedAggregations,
  suggestAggregation,
  validateIndicator,
  type IndicatorInput,
} from '../indicator';

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
} as const;

const factorBool: IndicatorInput = { ...base, group: 'factor', name: 'Exercício', valueType: 'boolean' };
const resultScale: IndicatorInput = {
  ...base,
  group: 'result',
  name: 'Energia',
  valueType: 'scale',
  scale: { min: 0, max: 10, step: 1 },
  desiredDirection: 'neutral',
};
const resultNumeric: IndicatorInput = {
  ...base,
  group: 'result',
  name: 'Peso',
  valueType: 'numeric',
  numeric: { unit: 'kg', min: null, max: null, step: 0.1 },
  desiredDirection: 'neutral',
};
const opts = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `o${i}`, label: `Opção ${i}` }));
const ordinal = (n: number): IndicatorInput => ({
  ...base,
  group: 'result',
  name: 'Humor',
  valueType: 'ordinal',
  options: opts(n),
  desiredDirection: 'neutral',
});

const fieldsOf = (input: IndicatorInput) => validateIndicator(input).errors.map((e) => e.field);

describe('suggestAggregation', () => {
  it('suggests by group and value type only', () => {
    expect(suggestAggregation({ group: 'factor', valueType: 'numeric' })).toBe('sum');
    expect(suggestAggregation({ group: 'result', valueType: 'numeric' })).toBe('last');
    expect(suggestAggregation({ group: 'factor', valueType: 'scale' })).toBe('mean');
    expect(suggestAggregation({ group: 'result', valueType: 'scale' })).toBe('mean');
    expect(suggestAggregation({ group: 'factor', valueType: 'boolean' })).toBe('any');
    expect(suggestAggregation({ group: 'result', valueType: 'boolean' })).toBe('any');
    expect(suggestAggregation({ group: 'factor', valueType: 'ordinal' })).toBe('last');
    expect(suggestAggregation({ group: 'result', valueType: 'ordinal' })).toBe('last');
  });

  it('never uses the name', () => {
    const a = suggestAggregation({ group: 'factor', valueType: 'numeric', name: 'Peso' } as never);
    const b = suggestAggregation({ group: 'factor', valueType: 'numeric', name: 'Café' } as never);
    expect(a).toBe('sum');
    expect(b).toBe('sum');
  });
});

describe('allowedAggregations', () => {
  it('lists valid aggregations per type for multiple_per_day', () => {
    const m = 'multiple_per_day';
    expect([...(allowedAggregations('numeric', m) ?? [])].sort()).toEqual(['last', 'mean', 'sum']);
    expect([...(allowedAggregations('scale', m) ?? [])].sort()).toEqual(['last', 'mean', 'sum']);
    expect([...(allowedAggregations('boolean', m) ?? [])].sort()).toEqual(['any', 'last']);
    expect(allowedAggregations('ordinal', m)).toEqual(['last']);
  });

  it('returns null for single_per_day', () => {
    for (const t of ['numeric', 'scale', 'boolean', 'ordinal'] as const) {
      expect(allowedAggregations(t, 'single_per_day')).toBeNull();
    }
  });
});

describe('validateIndicator', () => {
  it('accepts valid indicators of every type', () => {
    for (const i of [factorBool, resultScale, resultNumeric, ordinal(3)]) {
      expect(validateIndicator(i)).toEqual({ valid: true, errors: [] });
    }
  });

  it('requires a name and limits the abbreviation to 4 chars', () => {
    expect(fieldsOf({ ...factorBool, name: '   ' })).toContain('name');
    expect(fieldsOf({ ...factorBool, abbreviation: 'ABCDE' })).toContain('abbreviation');
    expect(validateIndicator({ ...factorBool, abbreviation: 'ABCD' }).valid).toBe(true);
    expect(validateIndicator({ ...factorBool, abbreviation: null }).valid).toBe(true);
  });

  it('requires 2 to 7 ordinal options', () => {
    expect(fieldsOf(ordinal(1))).toContain('options');
    expect(validateIndicator(ordinal(2)).valid).toBe(true);
    expect(validateIndicator(ordinal(7)).valid).toBe(true);
    expect(fieldsOf(ordinal(8))).toContain('options');
  });

  it('requires scale min < max and step > 0', () => {
    const s = (scale: { min: number; max: number; step: number }) => ({ ...resultScale, scale });
    expect(fieldsOf(s({ min: 5, max: 5, step: 1 }))).toContain('scale');
    expect(fieldsOf(s({ min: 6, max: 5, step: 1 }))).toContain('scale');
    expect(fieldsOf(s({ min: 0, max: 10, step: 0 }))).toContain('scale');
    expect(fieldsOf(s({ min: 0, max: 10, step: -1 }))).toContain('scale');
    expect(validateIndicator(s({ min: 0, max: 10, step: 1 })).valid).toBe(true);
  });

  it('accepts neutral, higher, lower and target_range for results; factors have no direction', () => {
    for (const d of ['neutral', 'higher', 'lower'] as const) {
      expect(validateIndicator({ ...resultScale, desiredDirection: d }).valid).toBe(true);
    }
    expect(
      validateIndicator({
        ...resultScale,
        desiredDirection: 'target_range',
        idealRange: { min: 3, max: 7 },
      }).valid,
    ).toBe(true);
    expect(fieldsOf({ ...resultScale, desiredDirection: 'sideways' as never })).toContain('desiredDirection');
    expect(fieldsOf({ ...factorBool, desiredDirection: 'higher' })).toContain('desiredDirection');
    expect(fieldsOf({ ...factorBool, desiredDirection: 'neutral' })).toContain('desiredDirection');
  });

  it('requires idealRange with min <= max for target_range only', () => {
    const t = (idealRange: { min: number; max: number } | null) => ({
      ...resultNumeric,
      desiredDirection: 'target_range' as const,
      idealRange,
    });
    expect(fieldsOf(t(null))).toContain('idealRange');
    expect(fieldsOf(t({ min: 8, max: 7 }))).toContain('idealRange');
    expect(validateIndicator(t({ min: 7, max: 7 })).valid).toBe(true);
    expect(validateIndicator(t({ min: 1, max: 7 })).valid).toBe(true);
  });

  it('allows idealRange only for numeric/scale results', () => {
    const range = { min: 1, max: 2 };
    expect(
      fieldsOf({ ...factorBool, group: 'factor', valueType: 'numeric', numeric: resultNumeric.numeric, idealRange: range }),
    ).toContain('idealRange');
    expect(fieldsOf({ ...ordinal(3), desiredDirection: 'target_range', idealRange: range })).toContain(
      'desiredDirection',
    );
    expect(
      fieldsOf({ ...resultScale, desiredDirection: 'higher', idealRange: range }),
    ).toContain('idealRange');
  });

  it('validates aggregation against frequency and type', () => {
    const multi = { ...factorBool, frequency: 'multiple_per_day' as const };
    expect(validateIndicator({ ...multi, dailyAggregation: 'any' }).valid).toBe(true);
    expect(validateIndicator({ ...multi, dailyAggregation: 'last' }).valid).toBe(true);
    expect(fieldsOf({ ...multi, dailyAggregation: 'sum' })).toContain('dailyAggregation');
    expect(fieldsOf({ ...multi, dailyAggregation: null })).toContain('dailyAggregation');
    expect(fieldsOf({ ...ordinal(3), frequency: 'multiple_per_day', dailyAggregation: 'mean' })).toContain(
      'dailyAggregation',
    );
    expect(fieldsOf({ ...factorBool, dailyAggregation: 'any' })).toContain('dailyAggregation');
  });

  it('requires the config block matching the value type', () => {
    expect(fieldsOf({ ...resultScale, scale: null })).toContain('scale');
    expect(fieldsOf({ ...resultNumeric, numeric: null })).toContain('numeric');
    expect(fieldsOf({ ...ordinal(3), options: null })).toContain('options');
  });
});
