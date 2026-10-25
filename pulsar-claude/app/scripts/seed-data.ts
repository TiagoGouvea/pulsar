/**
 * Pure, deterministic synthetic dataset for the seed user. Fictitious data only.
 * Planted patterns (verifiable by tests and by the statistics engine):
 *  - Exercício (bool factor) -> ZQX_ENERGIA_7F3 (0–10 result): ~+2 points on exercise days.
 *  - ZQX_SONO_9K2 (hours factor) -> ZQX_FOCO_4M8 (0–10 result): strong positive monotonic relation.
 *  - ZQX_ENERGIA_7F3 rises ~1.2 points in the last 7 days (trend).
 *  - Café (multiple/sum) x Dor de cabeça: no relation. Meditação: too sparse for any association.
 * Also covers explicit "Não" vs absence, explicit 0 vs absence, an extreme value, skipped days,
 * multiple entries per day, an archived indicator, an indicator without abbreviation and notes.
 */

export const SEED_UID = 'seed-user-0001';
export const SEED_EMAIL = 'seed@pulsar.test';
export const SENTINELS = {
  energy: 'ZQX_ENERGIA_7F3',
  sleep: 'ZQX_SONO_9K2',
  focus: 'ZQX_FOCO_4M8',
  note: 'ZQX_OBS_NOTA_5T1',
} as const;

// Brasília has no DST since 2019; seed timestamps are generated at a fixed -03:00 offset and stored in UTC.
const SEED_TZ_OFFSET = '-03:00';

type ValueType = 'boolean' | 'scale' | 'ordinal' | 'numeric';
type EntryValue = { boolean: boolean } | { number: number } | { optionId: string };

export interface SeedIndicator {
  id: string;
  group: 'factor' | 'result';
  name: string;
  abbreviation: string | null;
  emoji: string | null;
  valueType: ValueType;
  numeric: { unit: string; min: number | null; max: number | null; step: number } | null;
  scale: { min: number; max: number; step: number } | null;
  options: { id: string; label: string }[] | null;
  desiredDirection: 'neutral' | 'higher' | 'lower' | 'target_range' | null;
  idealRange: { min: number; max: number } | null;
  frequency: 'single_per_day' | 'multiple_per_day';
  dailyAggregation: 'sum' | 'mean' | 'last' | 'any' | null;
  sortOrder: number;
  archived: boolean;
}

export interface SeedEntry {
  id: string;
  indicatorId: string;
  localDate: string;
  /** ISO-8601 UTC */
  recordedAt: string;
  valueType: ValueType;
  value: EntryValue;
  note: string | null;
}

export interface SeedDataset {
  uid: string;
  firstDate: string;
  indicators: SeedIndicator[];
  entries: SeedEntry[];
}

const base = {
  numeric: null,
  scale: null,
  options: null,
  desiredDirection: null,
  idealRange: null,
  dailyAggregation: null,
  archived: false,
} as const;
const scale010 = { min: 0, max: 10, step: 1 };

export const SEED_INDICATORS: SeedIndicator[] = [
  {
    ...base,
    id: 'ind_exercise',
    group: 'factor',
    name: 'Exercício',
    abbreviation: 'EXE',
    emoji: '🏃',
    valueType: 'boolean',
    frequency: 'single_per_day',
    sortOrder: 1000,
  },
  {
    ...base,
    id: 'ind_sleep',
    group: 'factor',
    name: SENTINELS.sleep,
    abbreviation: 'SON',
    emoji: '💤',
    valueType: 'numeric',
    numeric: { unit: 'horas', min: 0, max: 24, step: 0.5 },
    frequency: 'single_per_day',
    sortOrder: 2000,
  },
  {
    ...base,
    id: 'ind_coffee',
    group: 'factor',
    name: 'Café',
    abbreviation: 'CAF',
    emoji: '☕',
    valueType: 'numeric',
    numeric: { unit: 'xícaras', min: 0, max: null, step: 0.5 },
    frequency: 'multiple_per_day',
    dailyAggregation: 'sum',
    sortOrder: 3000,
  },
  {
    ...base,
    id: 'ind_meditation',
    group: 'factor',
    name: 'Meditação',
    abbreviation: null,
    emoji: null,
    valueType: 'boolean',
    frequency: 'single_per_day',
    sortOrder: 4000,
  },
  {
    ...base,
    id: 'ind_q10',
    group: 'factor',
    name: 'Coenzima Q10',
    abbreviation: 'Q10',
    emoji: '💊',
    valueType: 'numeric',
    numeric: { unit: 'mg', min: 0, max: null, step: 50 },
    frequency: 'single_per_day',
    sortOrder: 5000,
    archived: true,
  },
  {
    ...base,
    id: 'ind_energy',
    group: 'result',
    name: SENTINELS.energy,
    abbreviation: 'ENE',
    emoji: '⚡',
    valueType: 'scale',
    scale: scale010,
    desiredDirection: 'higher',
    frequency: 'multiple_per_day',
    dailyAggregation: 'mean',
    sortOrder: 1000,
  },
  {
    ...base,
    id: 'ind_focus',
    group: 'result',
    name: SENTINELS.focus,
    abbreviation: 'FOC',
    emoji: '🎯',
    valueType: 'scale',
    scale: scale010,
    desiredDirection: 'higher',
    frequency: 'single_per_day',
    sortOrder: 2000,
  },
  {
    ...base,
    id: 'ind_headache',
    group: 'result',
    name: 'Dor de cabeça',
    abbreviation: 'DOR',
    emoji: '🤕',
    valueType: 'boolean',
    desiredDirection: 'lower',
    frequency: 'single_per_day',
    sortOrder: 3000,
  },
  {
    ...base,
    id: 'ind_mood',
    group: 'result',
    name: 'Humor',
    abbreviation: 'HUM',
    emoji: '🙂',
    valueType: 'ordinal',
    options: [
      { id: 'bad', label: 'Ruim' },
      { id: 'fair', label: 'Regular' },
      { id: 'good', label: 'Bom' },
      { id: 'great', label: 'Excelente' },
    ],
    desiredDirection: 'neutral',
    frequency: 'single_per_day',
    sortOrder: 4000,
  },
  {
    ...base,
    id: 'ind_weight',
    group: 'result',
    name: 'Peso',
    abbreviation: 'PES',
    emoji: null,
    valueType: 'numeric',
    numeric: { unit: 'kg', min: 0, max: null, step: 0.1 },
    desiredDirection: 'target_range',
    idealRange: { min: 70, max: 75 },
    frequency: 'single_per_day',
    sortOrder: 5000,
  },
];

// mulberry32: small seeded PRNG so the dataset is reproducible.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function addDays(isoDate: string, delta: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** AC-21: the seed user has exactly 30 synthetic days ending today. */
export const SEED_DAYS = 30;

export function buildSeedDataset({ today, seed = 7 }: { today: string; seed?: number }): SeedDataset {
  const days = SEED_DAYS;
  const rand = rng(seed);
  const normal = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const entries: SeedEntry[] = [];
  const at = (localDate: string, hour: number, minute = 0) =>
    new Date(
      `${localDate}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00${SEED_TZ_OFFSET}`,
    ).toISOString();
  const push = (
    indicatorId: string,
    localDate: string,
    hour: number,
    valueType: ValueType,
    value: EntryValue,
    n?: number,
    note: string | null = null,
  ) =>
    entries.push({
      id: n === undefined ? `${indicatorId}_${localDate}` : `${indicatorId}_${localDate}_e${n}`,
      indicatorId,
      localDate,
      recordedAt: at(localDate, hour, Math.floor(rand() * 60)),
      valueType,
      value,
      note,
    });

  const firstDate = addDays(today, -(days - 1));
  for (let back = days - 1; back >= 0; back--) {
    const date = addDays(today, -back);
    const dayIndex = days - 1 - back;
    if (back > 0 && rand() < 0.12) continue; // skipped day: no entries at all

    const exercised = rand() < 0.5;
    if (rand() < 0.9) push('ind_exercise', date, 19, 'boolean', { boolean: exercised });

    const sleep = clamp(Math.round((5 + rand() * 4) * 2) / 2, 0, 24);
    const sleepAnswered = rand() < 0.9;
    if (sleepAnswered) push('ind_sleep', date, 7, 'numeric', { number: sleep });

    // Coffee: explicit 0 on some days, one extreme day, otherwise 0–3 separate events summed per day.
    if (dayIndex === 20)
      [0, 1, 2, 3, 4, 5].forEach((n) => push('ind_coffee', date, 8 + n * 2, 'numeric', { number: 1.5 }, n));
    else if (rand() < 0.08) push('ind_coffee', date, 9, 'numeric', { number: 0 }, 0);
    else
      Array.from({ length: Math.floor(rand() * 4) }).forEach((_, n) =>
        push('ind_coffee', date, 8 + n * 3, 'numeric', { number: rand() < 0.2 ? 0.5 : 1 }, n),
      );

    if (rand() < 0.3) push('ind_meditation', date, 21, 'boolean', { boolean: rand() < 0.5 });
    if (dayIndex < 15) push('ind_q10', date, 8, 'numeric', { number: 200 });

    const trendBoost = back < 7 ? 1.2 : 0;
    const energyBase = 4.8 + (exercised ? 2 : 0) + trendBoost;
    const energyEvents = rand() < 0.3 ? 2 : 1;
    for (let n = 0; n < energyEvents; n++) {
      const value = clamp(Math.round(energyBase + normal() * 0.8), 0, 10);
      const note = rand() < 0.2 ? `${SENTINELS.note} reunião longa pela manhã` : null;
      push('ind_energy', date, 12 + n * 6, 'scale', { number: value }, n, note);
    }

    if (sleepAnswered && rand() < 0.92) {
      push('ind_focus', date, 18, 'scale', {
        number: clamp(Math.round(0.9 * sleep - 0.5 + normal() * 0.6), 0, 10),
      });
    }
    if (rand() < 0.85) push('ind_headache', date, 20, 'boolean', { boolean: rand() < 0.25 });
    if (rand() < 0.8) {
      const moodIndex = clamp(Math.floor(energyBase / 2.5 + normal() * 0.7), 0, 3);
      push('ind_mood', date, 21, 'ordinal', { optionId: ['bad', 'fair', 'good', 'great'][moodIndex]! });
    }
    if (rand() < 0.5)
      push('ind_weight', date, 7, 'numeric', { number: Math.round((78 + normal() * 0.3) * 10) / 10 });
  }

  return { uid: SEED_UID, firstDate, indicators: SEED_INDICATORS, entries };
}
