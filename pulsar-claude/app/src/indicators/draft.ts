/**
 * Draft model of the indicator editor: everything as text so the user can type freely,
 * converted to the domain model only when the form is submitted. Pure and testable.
 */
import type {
  DailyAggregation,
  DesiredDirection,
  Frequency,
  IndicatorGroup,
  IndicatorInput,
  OrdinalOption,
  ValueType,
} from '../domain/indicator';
import { suggestAggregation } from '../domain/indicator';
import { formatDecimal, parseDecimal } from '../lib/number';

export interface IndicatorDraft {
  group: IndicatorGroup;
  name: string;
  abbreviation: string;
  emoji: string | null;
  valueType: ValueType;
  scaleMin: string;
  scaleMax: string;
  scaleStep: string;
  /** Empty string means "no unit" (spec 4.2 D). */
  unit: string;
  /** Hidden numeric configuration, preserved when editing (the form only exposes the unit). */
  numericMin: string;
  numericMax: string;
  numericStep: string;
  options: OrdinalOption[];
  frequency: Frequency;
  dailyAggregation: DailyAggregation;
  desiredDirection: DesiredDirection;
  idealMin: string;
  idealMax: string;
}

export type DraftErrorField = 'name' | 'abbreviation' | 'scale' | 'unit' | 'options' | 'idealRange';

export type DraftErrors = Partial<Record<DraftErrorField, string>>;

export const DEFAULT_ORDINAL_LABELS = ['Pouco', 'Médio', 'Muito'] as const;

function ordinalOptions(labels: readonly string[]): OrdinalOption[] {
  return labels.map((label, index) => ({ id: `option-${index + 1}`, label }));
}

/** New empty option with the next free id, keeping the ids of the options that already exist. */
export function createOrdinalOption(options: readonly OrdinalOption[]): OrdinalOption {
  let n = options.length + 1;
  while (options.some((option) => option.id === `option-${n}`)) n += 1;
  return { id: `option-${n}`, label: '' };
}

export function emptyIndicatorDraft(): IndicatorDraft {
  return {
    group: 'factor',
    name: '',
    abbreviation: '',
    emoji: null,
    valueType: 'boolean',
    scaleMin: '0',
    scaleMax: '10',
    scaleStep: '1',
    unit: '',
    numericMin: '',
    numericMax: '',
    numericStep: '1',
    options: ordinalOptions(DEFAULT_ORDINAL_LABELS),
    frequency: 'single_per_day',
    dailyAggregation: suggestAggregation({ group: 'factor', valueType: 'boolean' }),
    desiredDirection: 'neutral',
    idealMin: '',
    idealMax: '',
  };
}

/** Builds the editor draft from a stored indicator (create/spec 4.1 and edit/spec 4.1 lock rules). */
export function draftFromIndicator(indicator: IndicatorInput): IndicatorDraft {
  return {
    group: indicator.group,
    name: indicator.name,
    abbreviation: indicator.abbreviation ?? '',
    emoji: indicator.emoji,
    valueType: indicator.valueType,
    scaleMin: formatDecimal(indicator.scale?.min ?? 0),
    scaleMax: formatDecimal(indicator.scale?.max ?? 10),
    scaleStep: formatDecimal(indicator.scale?.step ?? 1),
    unit: indicator.numeric?.unit ?? '',
    numericMin: formatDecimal(indicator.numeric?.min ?? null),
    numericMax: formatDecimal(indicator.numeric?.max ?? null),
    numericStep: formatDecimal(indicator.numeric?.step ?? 1),
    options: indicator.options?.map((option) => ({ ...option })) ?? ordinalOptions(DEFAULT_ORDINAL_LABELS),
    frequency: indicator.frequency,
    dailyAggregation:
      indicator.dailyAggregation ??
      suggestAggregation({ group: indicator.group, valueType: indicator.valueType }),
    desiredDirection: indicator.desiredDirection ?? 'neutral',
    idealMin: formatDecimal(indicator.idealRange?.min ?? null),
    idealMax: formatDecimal(indicator.idealRange?.max ?? null),
  };
}

/** Converts the draft to the domain input. Only the configuration of the selected type is kept. */
export function draftToInput(draft: IndicatorDraft): IndicatorInput {
  const isResult = draft.group === 'result';
  const wantsIdealRange = isResult && draft.desiredDirection === 'target_range';
  return {
    group: draft.group,
    name: draft.name.trim(),
    abbreviation: draft.abbreviation.trim() || null,
    emoji: draft.emoji,
    valueType: draft.valueType,
    numeric:
      draft.valueType === 'numeric'
        ? {
            unit: draft.unit.trim(),
            min: parseDecimal(draft.numericMin),
            max: parseDecimal(draft.numericMax),
            step: parseDecimal(draft.numericStep) ?? 1,
          }
        : null,
    scale:
      draft.valueType === 'scale'
        ? {
            min: parseDecimal(draft.scaleMin) ?? 0,
            max: parseDecimal(draft.scaleMax) ?? 0,
            step: parseDecimal(draft.scaleStep) ?? 0,
          }
        : null,
    options:
      draft.valueType === 'ordinal'
        ? draft.options.map((option) => ({ id: option.id, label: option.label.trim() }))
        : null,
    desiredDirection: isResult ? draft.desiredDirection : null,
    idealRange: wantsIdealRange
      ? { min: parseDecimal(draft.idealMin) ?? 0, max: parseDecimal(draft.idealMax) ?? 0 }
      : null,
    frequency: draft.frequency,
    dailyAggregation: draft.frequency === 'multiple_per_day' ? draft.dailyAggregation : null,
  };
}

/** Validation shown by the form, always in pt-BR. */
export function validateDraft(draft: IndicatorDraft): DraftErrors {
  const errors: DraftErrors = {};

  if (draft.name.trim().length === 0) {
    errors.name = 'Informe um nome para o indicador.';
  }
  if (draft.abbreviation.trim().length > 4) {
    errors.abbreviation = 'A sigla deve ter no máximo 4 caracteres.';
  }

  if (draft.valueType === 'scale') {
    const min = parseDecimal(draft.scaleMin);
    const max = parseDecimal(draft.scaleMax);
    const step = parseDecimal(draft.scaleStep);
    if (min === null || max === null || step === null) {
      errors.scale = 'Preencha o mínimo, o máximo e o passo da escala.';
    } else if (min >= max) {
      errors.scale = 'O mínimo deve ser menor que o máximo.';
    } else if (step <= 0) {
      errors.scale = 'O passo deve ser maior que zero.';
    }
  }

  if (draft.valueType === 'numeric' && draft.unit.trim().length > 20) {
    errors.unit = 'A unidade deve ter no máximo 20 caracteres.';
  }

  if (draft.valueType === 'ordinal') {
    if (draft.options.length < 2 || draft.options.length > 7) {
      errors.options = 'Use de 2 a 7 opções.';
    } else if (draft.options.some((option) => option.label.trim().length === 0)) {
      errors.options = 'Todas as opções precisam de um nome.';
    }
  }

  if (draft.group === 'result' && draft.desiredDirection === 'target_range') {
    const min = parseDecimal(draft.idealMin);
    const max = parseDecimal(draft.idealMax);
    if (min === null || max === null) {
      errors.idealRange = 'Informe o mínimo e o máximo da faixa ideal.';
    } else if (min > max) {
      errors.idealRange = 'O mínimo da faixa ideal deve ser menor ou igual ao máximo.';
    }
  }

  return errors;
}
