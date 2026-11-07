import { describe, expect, it } from 'vitest';
import {
  allowedDailyAggregations,
  buildIndicatorPatch,
  directionSummary,
  displayAbbreviation,
  emptyFormState,
  formStateFromIndicator,
  indicatorInputFromForm,
  nextSortOrder,
  reorderPlan,
  suggestedDailyAggregation,
  validateIndicatorForm,
  valueTypeSummary
} from './model';
import type { Indicator, IndicatorInput } from './types';

function indicator(overrides: Partial<Indicator> = {}): Indicator {
  return {
    id: 'indicator-1',
    group: 'factor',
    name: 'Exercício Físico',
    abbreviation: 'EXE',
    emoji: '',
    valueType: 'boolean',
    frequency: 'single_per_day',
    sortOrder: 100,
    firstEntryAt: null,
    archivedAt: null,
    createdAt: '2026-11-01T12:00:00.000Z',
    updatedAt: '2026-11-01T12:00:00.000Z',
    ...overrides
  };
}

function input(overrides: Partial<IndicatorInput> = {}): IndicatorInput {
  return {
    group: 'factor',
    name: 'Exercício Físico',
    abbreviation: 'EXE',
    emoji: '',
    valueType: 'boolean',
    frequency: 'single_per_day',
    sortOrder: 100,
    ...overrides
  };
}

describe('aggregation compatibility', () => {
  it('allows only compatible aggregations per value type', () => {
    expect(allowedDailyAggregations('boolean')).toEqual(['any', 'last']);
    expect(allowedDailyAggregations('ordinal')).toEqual(['last']);
    expect(allowedDailyAggregations('scale')).toEqual(['sum', 'mean', 'last']);
    expect(allowedDailyAggregations('numeric')).toEqual(['sum', 'mean', 'last']);
  });

  it('suggests the deterministic aggregation from the structured configuration', () => {
    expect(suggestedDailyAggregation('factor', 'numeric')).toBe('sum');
    expect(suggestedDailyAggregation('result', 'numeric')).toBe('last');
    expect(suggestedDailyAggregation('factor', 'scale')).toBe('mean');
    expect(suggestedDailyAggregation('result', 'boolean')).toBe('any');
    expect(suggestedDailyAggregation('result', 'ordinal')).toBe('last');
  });
});

describe('display helpers', () => {
  it('uses the stored abbreviation and falls back to the first three letters of the name', () => {
    expect(displayAbbreviation(indicator())).toBe('EXE');
    expect(displayAbbreviation(indicator({ abbreviation: '' }))).toBe('Exe...');
    expect(displayAbbreviation({ name: 'Café', abbreviation: ' ' })).toBe('Caf...');
  });

  it('summarizes the value type, frequency and direction for chips', () => {
    expect(valueTypeSummary(indicator())).toBe('Booleano (Sim/Não)');
    expect(
      valueTypeSummary(indicator({ valueType: 'scale', scale: { min: 0, max: 10, step: 1 } }))
    ).toBe('Escala 0–10');
    expect(
      valueTypeSummary(
        indicator({ valueType: 'numeric', numeric: { unit: 'mg', min: 0, max: null, step: 1 } })
      )
    ).toBe('Numérico (mg)');
    expect(
      valueTypeSummary(
        indicator({
          group: 'result',
          valueType: 'ordinal',
          options: [
            { id: 'o0', label: 'Ruim', order: 0 },
            { id: 'o1', label: 'Bom', order: 1 }
          ]
        })
      )
    ).toBe('Ordinal (Ruim → Bom)');
    expect(directionSummary(indicator())).toBeNull();
    expect(
      directionSummary(
        indicator({ group: 'result', desiredDirection: 'higher' })
      )
    ).toBe('Quanto maior, melhor');
    expect(
      directionSummary(
        indicator({ group: 'result', desiredDirection: 'target_range', idealRange: { min: 7, max: 10 } })
      )
    ).toBe('Faixa ideal (7 a 10)');
  });
});

describe('form validation', () => {
  it('requires a name within the size limit', () => {
    const state = emptyFormState();
    expect(validateIndicatorForm(state).name).toBe('Informe o nome do indicador.');
    expect(validateIndicatorForm({ ...state, name: '  Energia  ' }).name).toBeUndefined();
    expect(validateIndicatorForm({ ...state, name: 'E'.repeat(81) }).name).toBeDefined();
  });

  it('limits abbreviation and emoji sizes', () => {
    const state = emptyFormState();
    expect(validateIndicatorForm({ ...state, name: 'Energia', abbreviation: 'ABCDEFG' }).abbreviation).toBeUndefined();
    expect(validateIndicatorForm({ ...state, name: 'Energia', abbreviation: 'ABCDEFGHI' }).abbreviation).toBeDefined();
    expect(validateIndicatorForm({ ...state, name: 'Energia', emoji: '🏋️' }).emoji).toBeUndefined();
    expect(validateIndicatorForm({ ...state, name: 'Energia', emoji: '🏋️🏋️🏋️' }).emoji).toBeDefined();
  });

  it('validates the scale configuration', () => {
    const state = { ...emptyFormState(), name: 'Energia', valueType: 'scale' as const };
    expect(validateIndicatorForm({ ...state, scaleMin: '10', scaleMax: '0' }).scaleMax).toBe(
      'O máximo deve ser maior que o mínimo.'
    );
    expect(validateIndicatorForm({ ...state, scaleStep: '0' }).scaleStep).toBe(
      'O passo deve ser maior que zero.'
    );
    expect(validateIndicatorForm({ ...state, scaleMin: 'a' }).scaleMin).toBe(
      'O mínimo deve ser um número.'
    );
  });

  it('validates the numeric configuration with an optional unit', () => {
    const state = {
      ...emptyFormState(),
      name: 'Café',
      valueType: 'numeric' as const,
      unit: 'xícaras',
      numericStep: '0,5'
    };
    expect(validateIndicatorForm(state).unit).toBeUndefined();
    expect(validateIndicatorForm({ ...state, unit: '' }).unit).toBeUndefined();
    expect(validateIndicatorForm({ ...state, numericMin: '3', numericMax: '1' }).numericMax).toBe(
      'O máximo deve ser maior ou igual ao mínimo.'
    );
    expect(validateIndicatorForm({ ...state, numericStep: '' }).numericStep).toBe(
      'O passo deve ser maior que zero.'
    );
  });

  it('requires between two and eight labeled ordinal options', () => {
    const state = { ...emptyFormState(), name: 'Humor', valueType: 'ordinal' as const };
    expect(validateIndicatorForm(state).optionDrafts).toBe('Cada opção precisa de um rótulo.');
    const labeled = {
      ...state,
      optionDrafts: [
        { id: 'a', label: 'Ruim' },
        { id: 'b', label: 'Bom' }
      ]
    };
    expect(validateIndicatorForm(labeled).optionDrafts).toBeUndefined();
    expect(
      validateIndicatorForm({
        ...labeled,
        optionDrafts: [{ id: 'only', label: 'Bom' }]
      }).optionDrafts
    ).toBe('Informe pelo menos 2 opções.');
  });

  it('requires a compatible aggregation for multiple daily records', () => {
    const base = {
      ...emptyFormState(),
      name: 'Café',
      valueType: 'numeric' as const,
      frequency: 'multiple_per_day' as const
    };
    expect(validateIndicatorForm(base).dailyAggregation).toBe(
      'Escolha a agregação diária.'
    );
    expect(
      validateIndicatorForm({ ...base, dailyAggregation: 'sum' }).dailyAggregation
    ).toBeUndefined();
    expect(
      validateIndicatorForm({ ...base, valueType: 'ordinal', dailyAggregation: 'sum' })
        .dailyAggregation
    ).toBe('Essa agregação não é compatível com o tipo de resposta.');
    expect(
      validateIndicatorForm({ ...base, valueType: 'boolean', dailyAggregation: 'last' })
        .dailyAggregation
    ).toBeUndefined();
  });

  it('validates the ideal range only for scale or numeric results', () => {
    const base = { ...emptyFormState(), group: 'result' as const, name: 'Energia' };
    const target = { ...base, desiredDirection: 'target_range' as const };
    expect(validateIndicatorForm(target).desiredDirection).toBe(
      'A faixa ideal está disponível para escala ou número.'
    );
    const scale = { ...target, valueType: 'scale' as const, idealMin: '7', idealMax: '10' };
    expect(validateIndicatorForm(scale).idealMin).toBeUndefined();
    expect(validateIndicatorForm({ ...scale, idealMin: '11' }).idealMin).toBe(
      'O mínimo ideal deve estar dentro da escala.'
    );
    expect(validateIndicatorForm({ ...scale, idealMax: '8', idealMin: '9' }).idealMax).toBe(
      'O máximo ideal deve ser maior ou igual ao mínimo.'
    );
  });
});

describe('patch building', () => {
  it('edits only the always-editable fields when the indicator has entries', () => {
    const frozen = indicator({ firstEntryAt: '2026-11-02T10:00:00.000Z' });
    const patch = buildIndicatorPatch(frozen, input({ name: 'Treino', abbreviation: 'TRN', emoji: '🏋️', sortOrder: 20 }));
    expect(patch).toEqual({ name: 'Treino', abbreviation: 'TRN', emoji: '🏋️', sortOrder: 20 });
  });

  it('keeps the result direction editable even when frozen', () => {
    const frozen = indicator({
      group: 'result',
      firstEntryAt: '2026-11-02T10:00:00.000Z',
      desiredDirection: 'neutral'
    });
    const patch = buildIndicatorPatch(
      frozen,
      input({
        group: 'result',
        desiredDirection: 'target_range',
        idealRange: { min: 7, max: 10 },
        valueType: 'boolean',
        frequency: 'single_per_day'
      })
    );
    expect(patch.desiredDirection).toBe('target_range');
    expect(patch.idealRange).toEqual({ min: 7, max: 10 });
    expect(patch.valueType).toBeUndefined();
    expect(patch.frequency).toBeUndefined();
  });

  it('includes structural changes before the first entry, removing now-invalid config keys', () => {
    const existing = indicator({
      valueType: 'numeric',
      numeric: { unit: 'mg', min: 0, max: null, step: 1 },
      frequency: 'multiple_per_day',
      dailyAggregation: 'sum'
    });
    const patch = buildIndicatorPatch(
      existing,
      input({
        valueType: 'boolean',
        frequency: 'single_per_day',
        name: existing.name,
        abbreviation: existing.abbreviation,
        emoji: existing.emoji,
        sortOrder: existing.sortOrder
      })
    );
    expect(patch.valueType).toBe('boolean');
    expect(patch.frequency).toBe('single_per_day');
    expect(patch.dailyAggregation).toBeNull();
    expect(patch.numeric).toBeNull();
  });

  it('clears direction fields when a result becomes a factor before the first entry', () => {
    const existing = indicator({
      group: 'result',
      desiredDirection: 'higher'
    });
    const patch = buildIndicatorPatch(
      existing,
      input({ group: 'factor', name: existing.name, abbreviation: existing.abbreviation })
    );
    expect(patch.group).toBe('factor');
    expect(patch.desiredDirection).toBeNull();
    expect(patch.idealRange).toBeNull();
  });

  it('returns an empty patch when nothing changes', () => {
    const existing = indicator({ group: 'result', desiredDirection: 'higher' });
    const patch = buildIndicatorPatch(
      existing,
      input({ group: 'result', desiredDirection: 'higher', name: existing.name, abbreviation: existing.abbreviation })
    );
    expect(patch).toEqual({});
  });
});

describe('ordering helpers', () => {
  it('computes the next sort order after the current maximum', () => {
    expect(nextSortOrder([])).toBe(10);
    expect(
      nextSortOrder([indicator({ sortOrder: 990 }), indicator({ id: '2', sortOrder: 30 })])
    ).toBe(1000);
  });

  it('plans only the sort orders that actually change', () => {
    const list = [
      indicator({ id: 'a', sortOrder: 0 }),
      indicator({ id: 'b', sortOrder: 10 }),
      indicator({ id: 'c', sortOrder: 20 })
    ];
    expect(reorderPlan(list, ['b', 'a', 'c'])).toEqual([
      { id: 'b', sortOrder: 0 },
      { id: 'a', sortOrder: 10 }
    ]);
    expect(reorderPlan(list, ['a', 'b', 'c'])).toEqual([]);
  });
});

describe('form conversion', () => {
  it('round-trips an indicator through the form state', () => {
    const existing = indicator({
      group: 'result',
      valueType: 'scale',
      scale: { min: 0, max: 10, step: 1 },
      desiredDirection: 'target_range',
      idealRange: { min: 7, max: 10 },
      frequency: 'multiple_per_day',
      dailyAggregation: 'mean'
    });
    const state = formStateFromIndicator(existing);
    expect(validateIndicatorForm(state)).toEqual({});
    const converted = indicatorInputFromForm(state);
    expect(converted).toMatchObject({
      group: 'result',
      name: 'Exercício Físico',
      valueType: 'scale',
      scale: { min: 0, max: 10, step: 1 },
      desiredDirection: 'target_range',
      idealRange: { min: 7, max: 10 },
      frequency: 'multiple_per_day',
      dailyAggregation: 'mean'
    });
  });

  it('builds ordered ordinal options with generated ids', () => {
    const state = {
      ...emptyFormState(),
      name: 'Humor',
      valueType: 'ordinal' as const,
      optionDrafts: [
        { id: 'd1', label: ' Ruim ' },
        { id: 'd2', label: '' },
        { id: 'd3', label: 'Bom' }
      ]
    };
    const converted = indicatorInputFromForm(state);
    expect(converted.options).toEqual([
      { id: 'o0', label: 'Ruim', order: 0 },
      { id: 'o2', label: 'Bom', order: 1 }
    ]);
  });

  it('stores null numeric bounds when the fields are empty', () => {
    const state = {
      ...emptyFormState(),
      name: 'Café',
      valueType: 'numeric' as const,
      unit: 'xícaras',
      numericMin: '',
      numericMax: '',
      numericStep: '0.5'
    };
    const converted = indicatorInputFromForm(state);
    expect(converted.numeric).toEqual({ unit: 'xícaras', min: null, max: null, step: 0.5 });
  });
});
