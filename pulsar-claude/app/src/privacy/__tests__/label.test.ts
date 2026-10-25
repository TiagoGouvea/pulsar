import { describe, expect, it } from 'vitest';
import { abbreviationOf, indicatorLabel } from '../label';

describe('indicatorLabel', () => {
  const energy = { name: 'Nível de Energia', abbreviation: 'ENE', emoji: '⚡' };

  it('shows the abbreviation and hides the emoji when names are hidden', () => {
    expect(indicatorLabel(energy, false)).toEqual({ text: 'ENE', emoji: null });
  });

  it('shows the full name and emoji when names are revealed', () => {
    expect(indicatorLabel(energy, true)).toEqual({ text: 'Nível de Energia', emoji: '⚡' });
  });

  it('falls back to the first 3 letters + "..." without an abbreviation', () => {
    expect(abbreviationOf({ name: 'Concentração' })).toBe('Con...');
    expect(abbreviationOf({ name: 'Concentração', abbreviation: '   ' })).toBe('Con...');
  });

  it('keeps a typed abbreviation as typed, duplicates allowed', () => {
    expect(abbreviationOf({ name: 'Coenzima', abbreviation: 'q10' })).toBe('q10');
  });
});
