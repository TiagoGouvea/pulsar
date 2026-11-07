/**
 * Labels and examples of the daily aggregation choices (spec 4.1.1 and arquitetura 4).
 * Only the aggregations valid for the value type are offered.
 */
import {
  allowedAggregations,
  suggestAggregation,
  type DailyAggregation,
  type Frequency,
  type IndicatorGroup,
  type ValueType,
} from '../domain/indicator';

export const AGGREGATION_LABELS: Record<DailyAggregation, string> = {
  sum: 'Soma',
  mean: 'Média',
  last: 'Último',
  any: 'Presença',
};

export function aggregationLabel(aggregation: DailyAggregation): string {
  return AGGREGATION_LABELS[aggregation];
}

/** Deterministic suggestion: depends only on group and value type, never on the name. */
export function suggestedAggregation(group: IndicatorGroup, valueType: ValueType): DailyAggregation {
  return suggestAggregation({ group, valueType });
}

/** Aggregations offered in "Configurações avançadas"; null when the indicator is single-per-day. */
export function aggregationChoices(valueType: ValueType, frequency: Frequency): DailyAggregation[] | null {
  return allowedAggregations(valueType, frequency);
}

/** Short example of the effect of choosing this aggregation for this type (spec 4.1.1). */
export function aggregationExample(valueType: ValueType, aggregation: DailyAggregation): string {
  switch (aggregation) {
    case 'sum':
      return 'Se você registrar 2 e 3 no mesmo dia, o dia vale a soma: 5.';
    case 'mean':
      return 'Se você registrar 4 e 8 no mesmo dia, o dia vale a média: 6.';
    case 'last':
      if (valueType === 'ordinal') {
        return 'Se você registrar “Ruim” e depois “Bom”, o dia vale a última opção: “Bom”.';
      }
      if (valueType === 'boolean') {
        return 'Se você registrar “Sim” e depois “Não”, o dia vale o último registro: “Não”.';
      }
      return 'Se você registrar 4 e 8 no mesmo dia, o dia vale o último valor: 8.';
    case 'any':
      return 'Se qualquer registro do dia for “Sim”, o dia vale “Sim”.';
  }
}
