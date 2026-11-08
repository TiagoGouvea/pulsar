import type { IconName } from '../../design';
import type { IndicatorInput } from '../../domain/indicator';

/**
 * Quick-start suggestions of the empty dashboard (spec 3.1 / 5.4).
 *
 * The configurations are fixed so a new account never starts with implicitly created indicators:
 * tapping a suggestion is the only way to create one of them. Keep the four suggestions matching
 * design/dashboard_inicial_estado_vazio (two Factors and two Results).
 */

export type SuggestionKey = 'exercise' | 'coffee' | 'energy' | 'focus';

export function suggestionIndicatorId(key: SuggestionKey): string {
  return `suggestion-${key}`;
}

export interface IndicatorSuggestion {
  key: SuggestionKey;
  /** Decorative icon shown in the suggestion card. */
  icon: IconName;
  /** Factual format hint ("Booleano (Sim / Não)", "Escala 0 a 10"...). */
  format: string;
  /** Frequency or direction hint shown next to the group badge. */
  meta: string;
  /** Fixed order inside the group, so quick-start indicators line up deterministically. */
  sortOrder: number;
  indicator: IndicatorInput;
}

export const INDICATOR_SUGGESTIONS: readonly IndicatorSuggestion[] = [
  {
    key: 'exercise',
    icon: 'fitness_center',
    format: 'Booleano (Sim / Não)',
    meta: '1x ao dia',
    sortOrder: 1000,
    indicator: {
      group: 'factor',
      name: 'Exercício Físico',
      abbreviation: 'EXE',
      emoji: '🏃',
      valueType: 'boolean',
      numeric: null,
      scale: null,
      options: null,
      desiredDirection: null,
      idealRange: null,
      frequency: 'single_per_day',
      dailyAggregation: null,
    },
  },
  {
    key: 'coffee',
    icon: 'coffee',
    format: 'Numérico (Xícaras)',
    meta: 'Múltiplos registros',
    sortOrder: 2000,
    indicator: {
      group: 'factor',
      name: 'Café Expresso',
      abbreviation: 'CAF',
      emoji: '☕',
      valueType: 'numeric',
      numeric: { unit: 'xícaras', min: 0, max: null, step: 1 },
      scale: null,
      options: null,
      desiredDirection: null,
      idealRange: null,
      frequency: 'multiple_per_day',
      dailyAggregation: 'sum',
    },
  },
  {
    key: 'energy',
    icon: 'bolt',
    format: 'Escala 0 a 10',
    meta: 'Quanto maior, melhor',
    sortOrder: 1000,
    indicator: {
      group: 'result',
      name: 'Nível de Energia',
      abbreviation: 'ENE',
      emoji: '⚡',
      valueType: 'scale',
      numeric: null,
      scale: { min: 0, max: 10, step: 1 },
      options: null,
      desiredDirection: 'higher',
      idealRange: null,
      frequency: 'single_per_day',
      dailyAggregation: null,
    },
  },
  {
    key: 'focus',
    icon: 'psychology',
    format: 'Escala 0 a 10',
    meta: 'Faixa ideal: 7 a 10',
    sortOrder: 2000,
    indicator: {
      group: 'result',
      name: 'Concentração / Foco',
      abbreviation: 'CON',
      emoji: null,
      valueType: 'scale',
      numeric: null,
      scale: { min: 0, max: 10, step: 1 },
      options: null,
      desiredDirection: 'target_range',
      idealRange: { min: 7, max: 10 },
      frequency: 'single_per_day',
      dailyAggregation: null,
    },
  },
];
