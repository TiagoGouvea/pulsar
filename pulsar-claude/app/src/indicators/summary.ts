/**
 * Short pt-BR labels of the indicator configuration shown in the list screen
 * (design/meus_indicadores). Pure helpers: no React, no Firebase, no DOM.
 */
import type { IndicatorInput } from '../domain/indicator';
import { aggregationLabel } from './aggregation';
import { DIRECTION_OPTIONS } from './catalog';

/** "Booleano (Sim/Não)", "Escala 0–10", "Numérico (mg)", "Ordinal". */
export function valueTypeLabel(indicator: IndicatorInput): string {
  if (indicator.valueType === 'boolean') return 'Booleano (Sim/Não)';
  if (indicator.valueType === 'scale') {
    return indicator.scale ? `Escala ${indicator.scale.min}–${indicator.scale.max}` : 'Escala';
  }
  if (indicator.valueType === 'numeric') {
    return indicator.numeric?.unit ? `Numérico (${indicator.numeric.unit})` : 'Numérico';
  }
  return 'Ordinal';
}

/** "1x ao dia" or "Múltiplos registros". */
export function frequencyLabel(indicator: IndicatorInput): string {
  return indicator.frequency === 'single_per_day' ? '1x ao dia' : 'Múltiplos registros';
}

/** Daily aggregation of the indicator, when it applies (single-per-day has none). */
export function aggregationSummary(indicator: IndicatorInput): string | null {
  return indicator.dailyAggregation ? aggregationLabel(indicator.dailyAggregation) : null;
}

/** Desired direction of a result, when it has one. */
export function directionSummary(indicator: IndicatorInput): string | null {
  if (!indicator.desiredDirection) return null;
  const option = DIRECTION_OPTIONS.find((entry) => entry.value === indicator.desiredDirection);
  return option ? option.label : null;
}

/** Ideal range of a result, when it has one. */
export function idealRangeSummary(indicator: IndicatorInput): string | null {
  if (!indicator.idealRange) return null;
  return `Faixa ideal (${indicator.idealRange.min} a ${indicator.idealRange.max})`;
}
