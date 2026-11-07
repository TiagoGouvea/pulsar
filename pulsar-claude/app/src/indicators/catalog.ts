/**
 * Static catalog of the indicator editor: response types, emoji suggestions and the
 * suggested units of spec 4.2 D.
 */
import type { DesiredDirection, ValueType } from '../domain/indicator';

export const EMOJI_OPTIONS = ['⚡', '☕', '🏃', '💤', '🎯', '💊', '🤕', '🙂'] as const;

export const UNIT_GROUPS: { label: string; units: string[] }[] = [
  {
    label: 'Quantidade',
    units: ['unidade(s)', 'comprimido(s)', 'cápsula(s)', 'dose(s)', 'xícara(s)', 'porção(ões)'],
  },
  { label: 'Tempo', units: ['minuto(s)', 'hora(s)'] },
  { label: 'Massa', units: ['mg', 'g', 'kg'] },
  { label: 'Volume', units: ['mL', 'L'] },
  { label: 'Medidas fisiológicas', units: ['bpm', '°C', '%', 'mmHg'] },
];

export const CUSTOM_UNIT = '__custom_unit__';

export const ALL_UNITS = UNIT_GROUPS.flatMap((group) => group.units);

export function isCustomUnit(unit: string): boolean {
  return unit !== '' && !ALL_UNITS.includes(unit);
}

export const VALUE_TYPE_OPTIONS: { value: ValueType; label: string; caption: string }[] = [
  { value: 'boolean', label: 'Sim / Não', caption: 'Resposta objetiva, com opção de não responder' },
  { value: 'scale', label: 'Escala', caption: 'Percepção em uma faixa numérica' },
  { value: 'numeric', label: 'Número + unidade', caption: 'mg, horas, bpm, mL' },
  { value: 'ordinal', label: 'Opções ordenadas', caption: 'Ruim → Excelente' },
];

export const DIRECTION_OPTIONS: { value: DesiredDirection; label: string }[] = [
  { value: 'neutral', label: 'Sem preferência' },
  { value: 'higher', label: 'Quanto maior, melhor' },
  { value: 'lower', label: 'Quanto menor, melhor' },
  { value: 'target_range', label: 'Faixa ideal' },
];
