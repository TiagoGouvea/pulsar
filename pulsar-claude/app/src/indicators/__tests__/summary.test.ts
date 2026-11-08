import { describe, expect, it } from 'vitest';
import type { IndicatorInput } from '../../domain/indicator';
import {
  aggregationSummary,
  directionSummary,
  frequencyLabel,
  idealRangeSummary,
  valueTypeLabel,
} from '../summary';

const base: IndicatorInput = {
  group: 'factor',
  name: 'Exercício',
  abbreviation: 'EXE',
  emoji: null,
  valueType: 'boolean',
  numeric: null,
  scale: null,
  options: null,
  desiredDirection: null,
  idealRange: null,
  frequency: 'single_per_day',
  dailyAggregation: null,
};

describe('indicator summary labels', () => {
  it('describes the response type in pt-BR', () => {
    expect(valueTypeLabel(base)).toBe('Booleano (Sim/Não)');
    expect(valueTypeLabel({ ...base, valueType: 'scale', scale: { min: 0, max: 10, step: 1 } })).toBe(
      'Escala 0–10',
    );
    expect(
      valueTypeLabel({
        ...base,
        valueType: 'numeric',
        numeric: { unit: 'mg', min: 0, max: null, step: 50 },
      }),
    ).toBe('Numérico (mg)');
    expect(
      valueTypeLabel({
        ...base,
        valueType: 'ordinal',
        options: [
          { id: 'a', label: 'Ruim' },
          { id: 'b', label: 'Bom' },
        ],
      }),
    ).toBe('Ordinal');
  });

  it('describes the daily frequency', () => {
    expect(frequencyLabel(base)).toBe('1x ao dia');
    expect(frequencyLabel({ ...base, frequency: 'multiple_per_day' })).toBe('Múltiplos registros');
  });

  it('shows the aggregation only when it applies', () => {
    expect(aggregationSummary(base)).toBeNull();
    expect(
      aggregationSummary({
        ...base,
        valueType: 'numeric',
        numeric: { unit: 'xícaras', min: 0, max: null, step: 0.5 },
        frequency: 'multiple_per_day',
        dailyAggregation: 'sum',
      }),
    ).toBe('Soma');
  });

  it('shows the direction and the ideal range of results', () => {
    expect(directionSummary(base)).toBeNull();
    expect(directionSummary({ ...base, group: 'result', desiredDirection: 'higher' })).toBe(
      'Quanto maior, melhor',
    );
    expect(idealRangeSummary({ ...base, group: 'result', idealRange: { min: 7, max: 10 } })).toBe(
      'Faixa ideal (7 a 10)',
    );
  });
});
