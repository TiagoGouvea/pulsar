import { describe, expect, it } from 'vitest';
import { validateIndicator } from '../../../domain/indicator';
import { INDICATOR_SUGGESTIONS } from '../suggestions';

describe('empty dashboard suggestions', () => {
  it('offers two Factors and two Results with valid, complete configurations', () => {
    expect(INDICATOR_SUGGESTIONS).toHaveLength(4);
    expect(INDICATOR_SUGGESTIONS.filter((s) => s.indicator.group === 'factor')).toHaveLength(2);
    expect(INDICATOR_SUGGESTIONS.filter((s) => s.indicator.group === 'result')).toHaveLength(2);

    for (const suggestion of INDICATOR_SUGGESTIONS) {
      const validation = validateIndicator(suggestion.indicator);
      expect(validation.errors, suggestion.indicator.name).toEqual([]);
      expect(suggestion.indicator.abbreviation).not.toBeNull();
    }
  });

  it('keeps the quick-start configurations deterministic', () => {
    const byKey = Object.fromEntries(
      INDICATOR_SUGGESTIONS.map((suggestion) => [suggestion.key, suggestion.indicator]),
    );

    expect(byKey.exercise).toMatchObject({
      group: 'factor',
      valueType: 'boolean',
      frequency: 'single_per_day',
      dailyAggregation: null,
    });
    expect(byKey.coffee).toMatchObject({
      group: 'factor',
      valueType: 'numeric',
      frequency: 'multiple_per_day',
      dailyAggregation: 'sum',
    });
    expect(byKey.energy).toMatchObject({
      group: 'result',
      valueType: 'scale',
      desiredDirection: 'higher',
      frequency: 'single_per_day',
    });
    expect(byKey.focus).toMatchObject({
      group: 'result',
      valueType: 'scale',
      desiredDirection: 'target_range',
      idealRange: { min: 7, max: 10 },
    });
  });
});
