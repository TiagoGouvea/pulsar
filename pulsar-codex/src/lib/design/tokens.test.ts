import { describe, expect, it } from 'vitest';
import { borderRadius, colors, fontFamily, fontSize, screens, spacing } from './tokens';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

describe('design tokens', () => {
  it('exposes the official Pulsar palette', () => {
    expect(colors.primary).toBe('#630ed4');
    expect(colors.secondary).toBe('#0051d5');
    expect(colors.tertiary).toBe('#005b3d');
    expect(colors.onPrimary).toBe('#ffffff');
  });

  it('uses valid hex values for every color token', () => {
    for (const value of Object.values(colors)) {
      expect(value).toMatch(HEX_RE);
    }
  });

  it('carries the semantic warning and tonal tokens from the official design', () => {
    expect(colors.warning).toBe('#f59e0b');
    expect(colors.surfaceTint).toBe('#732ee4');
    expect(colors.inversePrimary).toBe('#d2bbff');
    expect(borderRadius).toMatchObject({ sm: '0.5rem', md: '1.5rem' });
  });

  it('provides the spacing scale aligned to the mobile gutter', () => {
    expect(spacing.gutter).toBe('1rem');
    expect(Object.keys(spacing)).toEqual(
      expect.arrayContaining(['spaceXs', 'spaceSm', 'spaceMd', 'spaceLg', 'spaceXl', 'gutter', 'margin'])
    );
  });

  it('keeps the typography families from the official design', () => {
    expect(fontFamily.headlineMd[0]).toBe('Space Grotesk');
    expect(fontFamily.bodyMd[0]).toBe('Geist');
    expect(fontFamily.labelCode[1]).toBe('monospace');
  });

  it('defines font sizes with line height and weight', () => {
    expect(fontSize.headlineMd.fontSize).toBe('20px');
    expect(fontSize.headlineMd.lineHeight).toBeTruthy();
    expect(fontSize.headlineMd.fontWeight).toBeTruthy();
  });

  it('targets the primary mobile breakpoints', () => {
    expect(screens).toMatchObject({ mobile: '390px', mobileLg: '430px' });
  });
});