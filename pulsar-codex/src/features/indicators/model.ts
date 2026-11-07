import type { MaterialIconName } from '@components/ui/MaterialIcon';
import type {
  DailyAggregation,
  DesiredDirection,
  Indicator,
  IndicatorFrequency,
  IndicatorGroup,
  IndicatorInput,
  IndicatorOption,
  IndicatorPatch,
  IndicatorValueType,
  NumericConfig,
  ScaleConfig
} from './types';

/**
 * Pure indicator domain logic: display summaries, deterministic aggregation
 * suggestions, form validation (kept in sync with the Firestore rules) and
 * patch building. No Firebase imports on purpose so every rule here is unit
 * tested without emulators.
 */

export const MAX_NAME_BYTES = 80;
export const MAX_ABBREVIATION_BYTES = 8;
export const MAX_EMOJI_BYTES = 8;
export const MAX_UNIT_BYTES = 24;
export const MAX_OPTION_LABEL_BYTES = 120;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 8;
const ABSOLUTE_LIMIT = 1000000;
const STEP_LIMIT = 0.000001;

export interface ValueTypeOption {
  value: IndicatorValueType;
  label: string;
  description: string;
  icon: MaterialIconName;
}

export const VALUE_TYPE_OPTIONS: ValueTypeOption[] = [
  {
    value: 'boolean',
    label: 'Booleano',
    description: 'Sim / Não (ex: treinou?)',
    icon: 'toggle_on'
  },
  {
    value: 'scale',
    label: 'Escala',
    description: '0 a 10, percepção subjetiva',
    icon: 'linear_scale'
  },
  {
    value: 'numeric',
    label: 'Número + Unidade',
    description: 'mg, horas, bpm, ml',
    icon: 'speed'
  },
  {
    value: 'ordinal',
    label: 'Opções Ordenadas',
    description: 'Ruim → Excelente',
    icon: 'segment'
  }
];

export const FREQUENCY_LABELS: Record<IndicatorFrequency, string> = {
  single_per_day: '1x ao dia',
  multiple_per_day: 'Múltiplos registros'
};

export const DAILY_AGGREGATION_LABELS: Record<DailyAggregation, string> = {
  sum: 'Soma',
  mean: 'Média',
  last: 'Último',
  any: 'Presença'
};

export const DAILY_AGGREGATION_EXAMPLES: Record<DailyAggregation, string> = {
  sum: 'Ex.: 2 + 3 + 1 registrados no dia viram 6.',
  mean: 'Ex.: valores 2, 8 e 9 no dia viram 6,3.',
  last: 'Ex.: valores 4 e 7 no dia viram 7 (o último).',
  any: 'Ex.: qualquer “Sim” no dia conta como “Sim” no dia.'
};

/**
 * Aggregations valid per value type (spec 4.1.1): number and scale accept
 * sum, mean and last; boolean accepts presence and last; ordinal only last.
 */
export function allowedDailyAggregations(valueType: IndicatorValueType): DailyAggregation[] {
  if (valueType === 'boolean') return ['any', 'last'];
  if (valueType === 'ordinal') return ['last'];
  return ['sum', 'mean', 'last'];
}

/**
 * Deterministic suggestion for the daily aggregation, derived only from the
 * structured configuration (never from the indicator name): factor numeric →
 * sum, result numeric → last, scale → mean, boolean → any, ordinal → last.
 */
export function suggestedDailyAggregation(
  group: IndicatorGroup,
  valueType: IndicatorValueType
): DailyAggregation {
  if (valueType === 'numeric') return group === 'factor' ? 'sum' : 'last';
  if (valueType === 'scale') return 'mean';
  if (valueType === 'ordinal') return 'last';
  return 'any';
}

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/** Sigla shown in the interface: the stored abbreviation or the first three letters of the name. */
export function displayAbbreviation(indicator: Pick<Indicator, 'name' | 'abbreviation'>): string {
  const abbreviation = indicator.abbreviation.trim();
  if (abbreviation) return abbreviation;
  const name = indicator.name.trim();
  if (!name) return '…';
  return `${name.slice(0, 3)}...`;
}

export function valueTypeName(valueType: IndicatorValueType): string {
  return VALUE_TYPE_OPTIONS.find((option) => option.value === valueType)?.label ?? 'Indicador';
}

export function valueTypeIcon(valueType: IndicatorValueType): MaterialIconName {
  return VALUE_TYPE_OPTIONS.find((option) => option.value === valueType)?.icon ?? 'science';
}

export function valueTypeSummary(indicator: Indicator): string {
  if (indicator.valueType === 'boolean') return 'Booleano (Sim/Não)';
  if (indicator.valueType === 'scale') {
    const scale = indicator.scale ?? { min: 0, max: 10 };
    return `Escala ${scale.min}–${scale.max}`;
  }
  if (indicator.valueType === 'numeric') {
    const unit = indicator.numeric?.unit.trim();
    return `Numérico${unit ? ` (${unit})` : ''}`;
  }
  const options = indicator.options ?? [];
  if (options.length === 0) return 'Ordinal';
  const sorted = [...options].sort((left, right) => left.order - right.order);
  return `Ordinal (${sorted[0].label} → ${sorted[sorted.length - 1].label})`;
}

export function frequencySummary(indicator: Indicator): string {
  return indicator.frequency === 'single_per_day' ? '1x ao dia' : 'Múltiplos';
}

export function dailyAggregationSummary(indicator: Indicator): string | null {
  if (indicator.frequency !== 'multiple_per_day' || !indicator.dailyAggregation) return null;
  const labels: Record<DailyAggregation, string> = {
    sum: 'Soma diária',
    mean: 'Média',
    last: 'Último valor',
    any: 'Presença de “Sim”'
  };
  return labels[indicator.dailyAggregation];
}

export function directionSummary(indicator: Indicator): string | null {
  if (indicator.group !== 'result') return null;
  const direction = indicator.desiredDirection ?? 'neutral';
  if (direction === 'higher') return 'Quanto maior, melhor';
  if (direction === 'lower') return 'Quanto menor, melhor';
  if (direction === 'target_range') {
    const range = indicator.idealRange;
    return range ? `Faixa ideal (${range.min} a ${range.max})` : 'Faixa ideal';
  }
  return null;
}

/** Structural fields freeze after the first entry ever recorded for the indicator. */
export function isStructurallyFrozen(indicator: Pick<Indicator, 'firstEntryAt'>): boolean {
  return indicator.firstEntryAt != null;
}

/** Next free global sort order; sections are ordered independently inside each group. */
export function nextSortOrder(indicators: Indicator[]): number {
  const max = indicators.reduce((current, indicator) => Math.max(current, indicator.sortOrder), 0);
  return max + 10;
}

function sameNumeric(left: NumericConfig | undefined, right: NumericConfig | undefined): boolean {
  if (!left || !right) return left === right;
  return (
    left.unit === right.unit &&
    left.min === right.min &&
    left.max === right.max &&
    left.step === right.step
  );
}

function sameScale(left: ScaleConfig | undefined, right: ScaleConfig | undefined): boolean {
  if (!left || !right) return left === right;
  return left.min === right.min && left.max === right.max && left.step === right.step;
}

function sameOptions(left: IndicatorOption[] | undefined, right: IndicatorOption[] | undefined): boolean {
  if (!left || !right) return left === right;
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const sortedRight = [...right].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return sortedLeft.every(
    (option, index) =>
      option.id === sortedRight[index].id &&
      option.label === sortedRight[index].label &&
      option.order === sortedRight[index].order
  );
}

function applyNumericConfig(input: IndicatorInput): NumericConfig | null {
  return input.numeric ?? null;
}

function applyScaleConfig(input: IndicatorInput): ScaleConfig | null {
  return input.scale ?? null;
}

function applyOptions(input: IndicatorInput): IndicatorOption[] | null {
  return input.options ?? null;
}

/**
 * Builds the editable patch that turns `existing` into `input`. Structural
 * fields are only included while the indicator has no entries; after the
 * first entry the patch keeps only name, abbreviation, emoji, sort order,
 * desired direction and ideal range (spec 4.1). `null` values mark fields
 * that must be removed from the document.
 */
export function buildIndicatorPatch(existing: Indicator, input: IndicatorInput): IndicatorPatch {
  const patch: IndicatorPatch = {};
  if (existing.name !== input.name) patch.name = input.name;
  if (existing.abbreviation !== input.abbreviation) patch.abbreviation = input.abbreviation;
  if (existing.emoji !== input.emoji) patch.emoji = input.emoji;
  if (existing.sortOrder !== input.sortOrder) patch.sortOrder = input.sortOrder;

  const direction = input.desiredDirection ?? 'neutral';
  const existingDirection = existing.desiredDirection ?? 'neutral';
  const targetRange = direction === 'target_range' ? input.idealRange ?? null : null;
  const existingIdeal = existing.idealRange ?? null;
  if (existingDirection !== direction) patch.desiredDirection = direction;
  const idealChanged =
    (existingIdeal == null) !== (targetRange == null) ||
    (existingIdeal != null &&
      targetRange != null &&
      (existingIdeal.min !== targetRange.min || existingIdeal.max !== targetRange.max));
  if (idealChanged) patch.idealRange = targetRange;

  if (isStructurallyFrozen(existing)) return patch;

  if (existing.group !== input.group) {
    patch.group = input.group;
    if (input.group === 'factor') {
      patch.desiredDirection = null;
      patch.idealRange = null;
    }
  }
  if (existing.valueType !== input.valueType) patch.valueType = input.valueType;
  if (existing.frequency !== input.frequency) patch.frequency = input.frequency;
  if ((existing.dailyAggregation ?? null) !== (input.dailyAggregation ?? null)) {
    patch.dailyAggregation = input.dailyAggregation ?? null;
  }
  if (!sameNumeric(existing.numeric, input.numeric)) patch.numeric = applyNumericConfig(input);
  if (!sameScale(existing.scale, input.scale)) patch.scale = applyScaleConfig(input);
  if (!sameOptions(existing.options, input.options)) patch.options = applyOptions(input);
  return patch;
}

/**
 * Reorder plan for one group: assigns `index * 10` to the received order and
 * returns only the indicators whose sort order actually changes.
 */
export function reorderPlan(
  indicators: Indicator[],
  orderedIds: string[]
): Array<{ id: string; sortOrder: number }> {
  const byId = new Map(indicators.map((indicator) => [indicator.id, indicator]));
  const changes: Array<{ id: string; sortOrder: number }> = [];
  orderedIds.forEach((id, index) => {
    const indicator = byId.get(id);
    if (!indicator) return;
    const sortOrder = index * 10;
    if (indicator.sortOrder !== sortOrder) changes.push({ id, sortOrder });
  });
  return changes;
}

export interface OrdinalOptionDraft {
  id: string;
  label: string;
}

export interface IndicatorFormState {
  group: IndicatorGroup;
  name: string;
  abbreviation: string;
  emoji: string;
  valueType: IndicatorValueType;
  scaleMin: string;
  scaleMax: string;
  scaleStep: string;
  unit: string;
  numericMin: string;
  numericMax: string;
  numericStep: string;
  optionDrafts: OrdinalOptionDraft[];
  frequency: IndicatorFrequency;
  dailyAggregation: DailyAggregation | null;
  desiredDirection: DesiredDirection;
  idealMin: string;
  idealMax: string;
}

export type IndicatorFormErrors = Partial<Record<keyof IndicatorFormState, string>>;

let draftCounter = 0;

function newOptionDraft(): OrdinalOptionDraft {
  draftCounter += 1;
  return { id: `draft-${draftCounter}`, label: '' };
}

export function emptyFormState(group: IndicatorGroup = 'factor'): IndicatorFormState {
  return {
    group,
    name: '',
    abbreviation: '',
    emoji: '',
    valueType: 'boolean',
    scaleMin: '0',
    scaleMax: '10',
    scaleStep: '1',
    unit: '',
    numericMin: '',
    numericMax: '',
    numericStep: '1',
    optionDrafts: [newOptionDraft(), newOptionDraft(), newOptionDraft()],
    frequency: 'single_per_day',
    dailyAggregation: null,
    desiredDirection: 'neutral',
    idealMin: '',
    idealMax: ''
  };
}

export function formStateFromIndicator(indicator: Indicator): IndicatorFormState {
  const scale = indicator.scale ?? { min: 0, max: 10, step: 1 };
  const numeric = indicator.numeric ?? { unit: '', min: null, max: null, step: 1 };
  const options = [...(indicator.options ?? [])].sort((left, right) => left.order - right.order);
  const ideal = indicator.idealRange;
  return {
    group: indicator.group,
    name: indicator.name,
    abbreviation: indicator.abbreviation,
    emoji: indicator.emoji,
    valueType: indicator.valueType,
    scaleMin: String(scale.min),
    scaleMax: String(scale.max),
    scaleStep: String(scale.step),
    unit: numeric.unit,
    numericMin: numeric.min == null ? '' : String(numeric.min),
    numericMax: numeric.max == null ? '' : String(numeric.max),
    numericStep: String(numeric.step),
    optionDrafts: options.length
      ? options.map((option) => ({ id: option.id, label: option.label }))
      : [newOptionDraft(), newOptionDraft()],
    frequency: indicator.frequency,
    dailyAggregation: indicator.dailyAggregation ?? null,
    desiredDirection: indicator.desiredDirection ?? 'neutral',
    idealMin: ideal ? String(ideal.min) : '',
    idealMax: ideal ? String(ideal.max) : ''
  };
}

function parseNumber(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberFieldError(raw: string, field: string): string | null {
  const value = parseNumber(raw);
  if (value == null) return `${field} deve ser um número.`;
  if (Math.abs(value) > ABSOLUTE_LIMIT) return `${field} deve estar entre -1.000.000 e 1.000.000.`;
  return null;
}

/**
 * Form validation kept in sync with the Firestore rules: every accepted form
 * must also be accepted by `isValidIndicatorFields`, so the app never caches
 * data the server would reject.
 */
export function validateIndicatorForm(state: IndicatorFormState): IndicatorFormErrors {
  const errors: IndicatorFormErrors = {};

  const name = state.name.trim();
  if (!name) errors.name = 'Informe o nome do indicador.';
  else if (byteLength(name) > MAX_NAME_BYTES)
    errors.name = `O nome deve ter até ${MAX_NAME_BYTES} bytes.`;

  if (byteLength(state.abbreviation.trim()) > MAX_ABBREVIATION_BYTES)
    errors.abbreviation = `A sigla deve ter até ${MAX_ABBREVIATION_BYTES} caracteres.`;

  if (byteLength(state.emoji.trim()) > MAX_EMOJI_BYTES)
    errors.emoji = `O emoji deve ter até ${MAX_EMOJI_BYTES} bytes.`;

  if (state.valueType === 'scale') {
    const min = parseNumber(state.scaleMin);
    const max = parseNumber(state.scaleMax);
    const step = parseNumber(state.scaleStep);
    const minError = numberFieldError(state.scaleMin, 'O mínimo');
    const maxError = numberFieldError(state.scaleMax, 'O máximo');
    if (minError) errors.scaleMin = minError;
    if (maxError) errors.scaleMax = maxError;
    if (!minError && !maxError && min != null && max != null && min >= max)
      errors.scaleMax = 'O máximo deve ser maior que o mínimo.';
    if (step == null || step < STEP_LIMIT) errors.scaleStep = 'O passo deve ser maior que zero.';
    else if (step > ABSOLUTE_LIMIT) errors.scaleStep = 'O passo deve ser até 1.000.000.';
    else if (min != null && max != null && max - min > ABSOLUTE_LIMIT)
      errors.scaleMax = 'A amplitude da escala deve ser até 1.000.000.';
  }

  if (state.valueType === 'numeric') {
    const unit = state.unit.trim();
    if (byteLength(unit) > MAX_UNIT_BYTES)
      errors.unit = `A unidade deve ter até ${MAX_UNIT_BYTES} caracteres.`;
    const min = parseNumber(state.numericMin);
    const max = parseNumber(state.numericMax);
    if (state.numericMin.trim() && min == null) errors.numericMin = 'O mínimo deve ser um número.';
    if (state.numericMax.trim() && max == null) errors.numericMax = 'O máximo deve ser um número.';
    if (min != null && max != null && min > max)
      errors.numericMax = 'O máximo deve ser maior ou igual ao mínimo.';
    const step = parseNumber(state.numericStep);
    if (step == null || step < STEP_LIMIT) errors.numericStep = 'O passo deve ser maior que zero.';
    else if (step > ABSOLUTE_LIMIT) errors.numericStep = 'O passo deve ser até 1.000.000.';
  }

  if (state.valueType === 'ordinal') {
    const drafts = state.optionDrafts.filter((draft) => draft.label.trim());
    if (state.optionDrafts.length < MIN_OPTIONS)
      errors.optionDrafts = `Informe pelo menos ${MIN_OPTIONS} opções.`;
    else if (drafts.length < MIN_OPTIONS)
      errors.optionDrafts = 'Cada opção precisa de um rótulo.';
    else if (state.optionDrafts.length > MAX_OPTIONS)
      errors.optionDrafts = `Use no máximo ${MAX_OPTIONS} opções.`;
    else if (drafts.some((draft) => byteLength(draft.label.trim()) > MAX_OPTION_LABEL_BYTES))
      errors.optionDrafts = `Cada rótulo deve ter até ${MAX_OPTION_LABEL_BYTES} caracteres.`;
  }

  if (state.frequency === 'multiple_per_day') {
    if (!state.dailyAggregation) errors.dailyAggregation = 'Escolha a agregação diária.';
    else if (!allowedDailyAggregations(state.valueType).includes(state.dailyAggregation))
      errors.dailyAggregation = 'Essa agregação não é compatível com o tipo de resposta.';
  }

  if (state.group === 'result' && state.desiredDirection === 'target_range') {
    if (state.valueType !== 'scale' && state.valueType !== 'numeric') {
      errors.desiredDirection = 'A faixa ideal está disponível para escala ou número.';
    } else {
      const min = parseNumber(state.idealMin);
      const max = parseNumber(state.idealMax);
      if (min == null) errors.idealMin = 'Informe o mínimo ideal.';
      if (max == null) errors.idealMax = 'Informe o máximo ideal.';
      if (min != null && max != null) {
        if (min > max) errors.idealMax = 'O máximo ideal deve ser maior ou igual ao mínimo.';
        if (state.valueType === 'scale') {
          const scaleMin = parseNumber(state.scaleMin);
          const scaleMax = parseNumber(state.scaleMax);
          if (scaleMin != null && scaleMax != null) {
            if (min < scaleMin || min > scaleMax)
              errors.idealMin = 'O mínimo ideal deve estar dentro da escala.';
            if (max > scaleMax || max < scaleMin)
              errors.idealMax = 'O máximo ideal deve estar dentro da escala.';
          }
        } else {
          const numericMin = parseNumber(state.numericMin);
          const numericMax = parseNumber(state.numericMax);
          if (numericMin != null && (min < numericMin || (numericMax != null && min > numericMax)))
            errors.idealMin = 'O mínimo ideal deve respeitar os limites do indicador.';
          if (numericMax != null && (max > numericMax || (numericMin != null && max < numericMin)))
            errors.idealMax = 'O máximo ideal deve respeitar os limites do indicador.';
        }
      }
    }
  }

  return errors;
}

export function hasFormErrors(errors: IndicatorFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Converts the validated form into the structured indicator input. */
export function indicatorInputFromForm(state: IndicatorFormState): IndicatorInput {
  const name = state.name.trim();
  const input: IndicatorInput = {
    group: state.group,
    name,
    abbreviation: state.abbreviation.trim(),
    emoji: state.emoji.trim(),
    valueType: state.valueType,
    frequency: state.frequency,
    sortOrder: 0
  };

  if (state.valueType === 'scale') {
    input.scale = {
      min: parseNumber(state.scaleMin) ?? 0,
      max: parseNumber(state.scaleMax) ?? 10,
      step: parseNumber(state.scaleStep) ?? 1
    };
  }

  if (state.valueType === 'numeric') {
    const min = parseNumber(state.numericMin);
    const max = parseNumber(state.numericMax);
    input.numeric = {
      unit: state.unit.trim(),
      min: state.numericMin.trim() ? min : null,
      max: state.numericMax.trim() ? max : null,
      step: parseNumber(state.numericStep) ?? 1
    };
  }

  if (state.valueType === 'ordinal') {
    input.options = state.optionDrafts
      .map((draft, index) => ({ label: draft.label.trim(), index }))
      .filter((draft) => draft.label)
      .map((draft, order) => ({
        id: `o${draft.index}`,
        label: draft.label,
        order
      }));
  }

  if (state.frequency === 'multiple_per_day') {
    input.dailyAggregation = state.dailyAggregation ?? undefined;
  }

  if (state.group === 'result') {
    input.desiredDirection = state.desiredDirection;
    if (state.desiredDirection === 'target_range') {
      const min = parseNumber(state.idealMin);
      const max = parseNumber(state.idealMax);
      if (min != null && max != null && min <= max) {
        input.idealRange = { min, max };
      }
    }
  }

  return input;
}
