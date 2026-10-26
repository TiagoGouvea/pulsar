/**
 * Design tokens for Pulsar
 * Based on official design specifications
 */

// Color tokens
export const colors = {
  // Primary - Purple (Pulsar brand)
  primary: '#630ed4',
  primaryContainer: '#7c3aed',
  onPrimary: '#ffffff',
  primaryFixed: '#eaddff',
  primaryFixedDim: '#d2bbff',
  onPrimaryFixed: '#25005a',
  onPrimaryFixedVariant: '#5a00c6',
  onPrimaryContainer: '#ede0ff',
  surfaceTint: '#732ee4',
  inversePrimary: '#d2bbff',

  // Secondary - Blue
  secondary: '#0051d5',
  secondaryContainer: '#316bf3',
  onSecondary: '#ffffff',
  secondaryFixed: '#dbe1ff',
  secondaryFixedDim: '#b4c5ff',
  onSecondaryFixed: '#00174b',
  onSecondaryFixedVariant: '#003ea8',
  onSecondaryContainer: '#fefcff',

  // Tertiary - Green
  tertiary: '#005b3d',
  tertiaryContainer: '#007650',
  onTertiary: '#ffffff',
  tertiaryFixed: '#6ffbbe',
  tertiaryFixedDim: '#4edea3',
  onTertiaryFixed: '#002113',
  onTertiaryFixedVariant: '#005236',
  onTertiaryContainer: '#76ffc2',

  // Background
  background: '#faf8ff',
  surface: '#faf8ff',
  surfaceBright: '#faf8ff',
  surfaceDim: '#d2d9f4',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f2f3ff',
  surfaceContainer: '#eaedff',
  surfaceContainerHigh: '#e2e7ff',
  surfaceContainerHighest: '#dae2fd',
  surfaceVariant: '#dae2fd',
  onSurfaceVariant: '#4a4455',
  outlineVariant: '#ccc3d8',
  inverseSurface: '#283044',
  inverseOnSurface: '#eef0ff',

  // Error
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#93000a',

  // Warning (amber, low-confidence states per official design)
  warning: '#f59e0b',

  // Outline
  outline: '#7b7487',

  // On colors
  onBackground: '#131b2e',
  onSurface: '#131b2e'
} as const;

// Border radius tokens
export const borderRadius = {
  sm: '0.5rem',
  DEFAULT: '1rem',
  md: '1.5rem',
  lg: '2rem',
  xl: '3rem',
  full: '9999px'
} as const;

// Spacing tokens
export const spacing = {
  spaceXs: '0.25rem',
  spaceSm: '0.5rem',
  spaceMd: '0.75rem',
  spaceLg: '1.25rem',
  spaceXl: '2rem',
  gutter: '1rem',
  gutterDesktop: '1.5rem',
  margin: '1rem',
  marginDesktop: '2rem'
} as const;

// Typography tokens
export const fontFamily = {
  headlineLgMobile: ['Space Grotesk', 'sans-serif'] as const,
  headlineMd: ['Space Grotesk', 'sans-serif'] as const,
  bodyLg: ['Geist', 'sans-serif'] as const,
  labelLg: ['Geist', 'sans-serif'] as const,
  labelCode: ['Geist', 'monospace'] as const,
  headlineXlMobile: ['Space Grotesk', 'sans-serif'] as const,
  bodyMd: ['Geist', 'sans-serif'] as const,
  bodySm: ['Geist', 'sans-serif'] as const,
  headlineLg: ['Space Grotesk', 'sans-serif'] as const,
  labelMd: ['Geist', 'sans-serif'] as const,
  statDisplay: ['Space Grotesk', 'sans-serif'] as const,
  headlineXl: ['Space Grotesk', 'sans-serif'] as const
} as const;

// Font size tokens with line height and weight
export const fontSize = {
  headlineLgMobile: {
    fontSize: '22px',
    lineHeight: '28px',
    letterSpacing: '-0.01em',
    fontWeight: '600' as const
  },
  headlineMd: {
    fontSize: '20px',
    lineHeight: '26px',
    letterSpacing: '-0.01em',
    fontWeight: '600' as const
  },
  bodyLg: {
    fontSize: '16px',
    lineHeight: '24px',
    fontWeight: '400' as const
  },
  labelLg: {
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: '600' as const
  },
  labelCode: {
    fontSize: '11px',
    lineHeight: '14px',
    letterSpacing: '0.08em',
    fontWeight: '600' as const
  },
  headlineXlMobile: {
    fontSize: '28px',
    lineHeight: '34px',
    letterSpacing: '-0.02em',
    fontWeight: '700' as const
  },
  bodyMd: {
    fontSize: '14px',
    lineHeight: '20px',
    fontWeight: '400' as const
  },
  bodySm: {
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: '400' as const
  },
  headlineLg: {
    fontSize: '28px',
    lineHeight: '36px',
    letterSpacing: '-0.02em',
    fontWeight: '600' as const
  },
  labelMd: {
    fontSize: '12px',
    lineHeight: '16px',
    fontWeight: '500' as const
  },
  statDisplay: {
    fontSize: '32px',
    lineHeight: '36px',
    letterSpacing: '-0.03em',
    fontWeight: '700' as const
  },
  headlineXl: {
    fontSize: '36px',
    lineHeight: '44px',
    letterSpacing: '-0.03em',
    fontWeight: '700' as const
  }
} as const;

// Screen size tokens
export const screens = {
  mobile: '390px',
  mobileLg: '430px',
  desktop: '1024px'
} as const;

// Animation tokens
export const animation = {
  durationFast: '150ms',
  durationNormal: '250ms',
  durationSlow: '350ms',
  bounceFast: '2.8s',
  bounceNormal: '3.2s',
  bounceSlow: '3.5s'
} as const;

// Z-index tokens
export const zIndex = {
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700
} as const;

// Shadow tokens
export const shadows = {
  xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
  none: 'none'
} as const;

// Border tokens
export const borders = {
  none: '0px',
  xs: '1px',
  sm: '2px',
  md: '4px',
  lg: '8px',
  xl: '16px'
} as const;

// Default export for easy import
export const designTokens = {
  colors,
  borderRadius,
  spacing,
  fontFamily,
  fontSize,
  screens,
  animation,
  zIndex,
  shadows,
  borders
};

export default designTokens;
