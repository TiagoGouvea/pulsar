import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addDays,
  brasiliaDateKey,
  formatDate,
  formatDateTime,
  localDate,
  toUtcIso,
  windowDays,
} from '../time';

const originalTz = process.env.TZ;

function setTz(tz: string) {
  process.env.TZ = tz;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

describe('localDate', () => {
  // 2026-10-25T02:30Z is 23:30 on the 24th in São Paulo and 11:30 on the 25th in Tokyo
  const instant = new Date('2026-10-25T02:30:00Z');

  it.each([
    ['America/Sao_Paulo', '2026-10-24'],
    ['Asia/Tokyo', '2026-10-25'],
    ['UTC', '2026-10-25'],
    ['America/Los_Angeles', '2026-10-24'],
    ['Pacific/Auckland', '2026-10-25'],
  ])('uses the browser timezone (%s)', (tz, expected) => {
    setTz(tz);
    expect(localDate(instant)).toBe(expected);
  });

  it('defaults to the current time', () => {
    setTz('Asia/Tokyo');
    vi.setSystemTime(instant);
    expect(localDate()).toBe('2026-10-25');
  });

  it('formats as zero-padded YYYY-MM-DD', () => {
    setTz('UTC');
    expect(localDate(new Date('2026-01-05T12:00:00Z'))).toBe('2026-01-05');
  });

  it('rolls over at local midnight (São Paulo)', () => {
    setTz('America/Sao_Paulo');
    vi.setSystemTime(new Date('2026-10-25T02:59:59Z'));
    expect(localDate()).toBe('2026-10-24');
    vi.setSystemTime(new Date('2026-10-25T03:00:00Z'));
    expect(localDate()).toBe('2026-10-25');
  });

  it('rolls over at local midnight (Auckland, UTC+13)', () => {
    setTz('Pacific/Auckland');
    vi.setSystemTime(new Date('2026-10-24T10:59:59Z'));
    expect(localDate()).toBe('2026-10-24');
    vi.setSystemTime(new Date('2026-10-24T11:00:00Z'));
    expect(localDate()).toBe('2026-10-25');
  });
});

describe('UTC persistence and pt-BR display', () => {
  const instant = new Date('2026-10-25T02:30:00Z');

  it('toUtcIso is independent of the browser timezone', () => {
    setTz('Asia/Tokyo');
    const a = toUtcIso(instant);
    setTz('America/Sao_Paulo');
    const b = toUtcIso(instant);
    expect(a).toBe('2026-10-25T02:30:00.000Z');
    expect(b).toBe(a);
  });

  it('formatDate shows pt-BR dd/mm/yyyy in the browser timezone', () => {
    setTz('America/Sao_Paulo');
    expect(formatDate(instant)).toBe('24/10/2026');
    setTz('Asia/Tokyo');
    expect(formatDate(instant)).toBe('25/10/2026');
  });

  it('formatDateTime shows pt-BR date and 24h time in the browser timezone', () => {
    setTz('America/Sao_Paulo');
    expect(formatDateTime(instant)).toMatch(/^24\/10\/2026,? (às )?23:30$/);
    setTz('Asia/Tokyo');
    expect(formatDateTime(instant)).toMatch(/^25\/10\/2026,? (às )?11:30$/);
  });

  it('accepts ISO strings', () => {
    setTz('UTC');
    expect(formatDate('2026-10-25T02:30:00Z')).toBe('25/10/2026');
  });
});

describe('brasiliaDateKey', () => {
  const instant = new Date('2026-10-25T02:30:00Z'); // 23:30 on 10-24 in Brasília

  it.each(['America/Sao_Paulo', 'Asia/Tokyo', 'UTC', 'Pacific/Auckland', 'America/Los_Angeles'])(
    'is America/Sao_Paulo regardless of the browser timezone (%s)',
    (tz) => {
      setTz(tz);
      expect(brasiliaDateKey(instant)).toBe('2026-10-24');
    },
  );

  it('rolls over at Brasília midnight (03:00Z)', () => {
    setTz('Asia/Tokyo');
    vi.setSystemTime(new Date('2026-10-25T02:59:59Z'));
    expect(brasiliaDateKey()).toBe('2026-10-24');
    vi.setSystemTime(new Date('2026-10-25T03:00:00Z'));
    expect(brasiliaDateKey()).toBe('2026-10-25');
  });

  it('can differ from localDate', () => {
    setTz('Asia/Tokyo');
    expect(localDate(instant)).not.toBe(brasiliaDateKey(instant));
  });
});

describe('no trip correction', () => {
  it('changing timezone only changes the result for the current timezone, stored UTC is untouched', () => {
    const recordedAt = new Date('2026-10-25T02:30:00Z');
    setTz('America/Sao_Paulo');
    const before = localDate(recordedAt);
    setTz('Asia/Tokyo');
    const after = localDate(recordedAt);
    expect(before).toBe('2026-10-24');
    expect(after).toBe('2026-10-25');
    expect(toUtcIso(recordedAt)).toBe('2026-10-25T02:30:00.000Z');
  });
});

describe('30-day window helpers', () => {
  it('addDays moves calendar days across month, year and leap boundaries', () => {
    expect(addDays('2026-10-25', -1)).toBe('2026-10-24');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-10-25', 0)).toBe('2026-10-25');
  });

  it('addDays is not affected by DST in the browser timezone', () => {
    setTz('America/New_York');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
    expect(addDays('2026-11-02', -1)).toBe('2026-11-01');
  });

  it('windowDays returns 30 consecutive days ending today, oldest first', () => {
    const days = windowDays('2026-10-25');
    expect(days).toHaveLength(30);
    expect(days[29]).toBe('2026-10-25');
    expect(days[0]).toBe('2026-09-26');
    expect(new Set(days).size).toBe(30);
  });

  it('windowDays accepts a custom size', () => {
    expect(windowDays('2026-10-25', 7)).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ]);
  });

  it('windowDays crosses a year boundary', () => {
    const days = windowDays('2027-01-10');
    expect(days[0]).toBe('2026-12-12');
    expect(days).toContain('2026-12-31');
    expect(days).toContain('2027-01-01');
  });
});
