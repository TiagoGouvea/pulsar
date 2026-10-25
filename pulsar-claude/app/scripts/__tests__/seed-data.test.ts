import { describe, expect, it } from 'vitest';
import { buildSeedDataset, SENTINELS } from '../seed-data';

const data = buildSeedDataset({ today: '2026-10-24' });
const valuesBy = (indicatorId: string) => data.entries.filter((e) => e.indicatorId === indicatorId);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('buildSeedDataset', () => {
  it('is deterministic', () => {
    expect(buildSeedDataset({ today: '2026-10-24' })).toEqual(data);
  });

  it('spans exactly 30 days ending today and stores UTC timestamps', () => {
    const dates = [...new Set(data.entries.map((e) => e.localDate))].sort();
    expect(data.firstDate).toBe('2026-09-25');
    expect(dates[0]! >= '2026-09-25').toBe(true);
    expect(dates.at(-1)).toBe('2026-10-24');
    expect(dates.length).toBeGreaterThanOrEqual(20);
    expect(dates.length).toBeLessThanOrEqual(30);
    expect(data.entries.every((e) => e.recordedAt.endsWith('Z'))).toBe(true);
  });

  it('uses every sentinel', () => {
    const names = data.indicators.map((i) => i.name);
    expect(names).toEqual(expect.arrayContaining([SENTINELS.energy, SENTINELS.sleep, SENTINELS.focus]));
    expect(data.entries.some((e) => e.note?.includes(SENTINELS.note))).toBe(true);
  });

  it('distinguishes explicit "Não"/0 from absence and has multiple entries per day', () => {
    expect(valuesBy('ind_exercise').some((e) => 'boolean' in e.value && !e.value.boolean)).toBe(true);
    expect(valuesBy('ind_coffee').some((e) => 'number' in e.value && e.value.number === 0)).toBe(true);
    expect(new Set(valuesBy('ind_coffee').map((e) => e.localDate)).size).toBeLessThan(
      valuesBy('ind_coffee').length,
    );
  });

  it('plants exercise -> energy (>= 1.5 points on daily means)', () => {
    const energyByDay = new Map<string, number[]>();
    valuesBy('ind_energy').forEach((e) => {
      if ('number' in e.value)
        energyByDay.set(e.localDate, [...(energyByDay.get(e.localDate) ?? []), e.value.number]);
    });
    const groups = { yes: [] as number[], no: [] as number[] };
    valuesBy('ind_exercise').forEach((e) => {
      const day = energyByDay.get(e.localDate);
      if (day && 'boolean' in e.value) groups[e.value.boolean ? 'yes' : 'no'].push(mean(day));
    });
    expect(groups.yes.length).toBeGreaterThanOrEqual(5);
    expect(groups.no.length).toBeGreaterThanOrEqual(5);
    expect(mean(groups.yes) - mean(groups.no)).toBeGreaterThanOrEqual(1.5);
  });

  it('has enough sleep x focus pairs for a Spearman association (>= 16 days, >= 4 distinct)', () => {
    const focusDays = new Set(valuesBy('ind_focus').map((e) => e.localDate));
    const pairs = valuesBy('ind_sleep').filter((e) => focusDays.has(e.localDate));
    expect(pairs.length).toBeGreaterThanOrEqual(16);
    expect(new Set(pairs.map((e) => JSON.stringify(e.value))).size).toBeGreaterThanOrEqual(4);
  });
});
