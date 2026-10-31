import type { IndicatorSuggestion } from './types';

/**
 * Four optional starting points shown on a new account. Nothing here is
 * persisted until the person explicitly chooses "Adicionar".
 */
export const INITIAL_INDICATOR_SUGGESTIONS: IndicatorSuggestion[] = [
  {
    key: 'exercise',
    name: 'Exercício Físico',
    abbreviation: 'EXE',
    emoji: '🏋️',
    group: 'factor',
    meta: '1x ao dia',
    valueSummary: 'Booleano (Sim / Não)',
    input: {
      group: 'factor',
      name: 'Exercício Físico',
      abbreviation: 'EXE',
      emoji: '🏋️',
      valueType: 'boolean',
      frequency: 'single_per_day',
      sortOrder: 1000
    }
  },
  {
    key: 'coffee',
    name: 'Café Expresso',
    abbreviation: 'CAF',
    emoji: '☕',
    group: 'factor',
    meta: 'Múltiplos registros',
    valueSummary: 'Numérico (xícaras)',
    input: {
      group: 'factor',
      name: 'Café Expresso',
      abbreviation: 'CAF',
      emoji: '☕',
      valueType: 'numeric',
      numeric: { unit: 'xícaras', min: 0, max: null, step: 0.5 },
      frequency: 'multiple_per_day',
      dailyAggregation: 'sum',
      sortOrder: 1010
    }
  },
  {
    key: 'energy',
    name: 'Nível de Energia',
    abbreviation: 'ENE',
    emoji: '⚡',
    group: 'result',
    meta: 'Quanto maior, melhor',
    valueSummary: 'Escala 0 a 10',
    input: {
      group: 'result',
      name: 'Nível de Energia',
      abbreviation: 'ENE',
      emoji: '⚡',
      valueType: 'scale',
      scale: { min: 0, max: 10, step: 1 },
      desiredDirection: 'higher',
      frequency: 'single_per_day',
      sortOrder: 1020
    }
  },
  {
    key: 'focus',
    name: 'Concentração / Foco',
    abbreviation: 'CON',
    emoji: '🧠',
    group: 'result',
    meta: 'Faixa ideal: 7 a 10',
    valueSummary: 'Escala 0 a 10',
    input: {
      group: 'result',
      name: 'Concentração / Foco',
      abbreviation: 'CON',
      emoji: '🧠',
      valueType: 'scale',
      scale: { min: 0, max: 10, step: 1 },
      desiredDirection: 'target_range',
      idealRange: { min: 7, max: 10 },
      frequency: 'single_per_day',
      sortOrder: 1030
    }
  }
];
