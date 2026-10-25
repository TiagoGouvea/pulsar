import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: {
    files: [
      './index.html',
      './src/**/*.{js,ts,jsx,tsx}'
    ]
  },
  theme: {
    extend: {
      colors: {
        // Primary colors
        primary: '#630ed4',
        'primary-container': '#7c3aed',
        'on-primary': '#ffffff',
        'primary-fixed': '#eaddff',
        'primary-fixed-dim': '#d2bbff',
        'on-primary-fixed': '#25005a',
        'on-primary-fixed-variant': '#5a00c6',
        'primary-container': '#7c3aed',
        'on-primary-container': '#ede0ff',

        // Secondary colors
        secondary: '#0051d5',
        'secondary-container': '#316bf3',
        'on-secondary': '#ffffff',
        'secondary-fixed': '#dbe1ff',
        'secondary-fixed-dim': '#b4c5ff',
        'on-secondary-fixed': '#00174b',
        'on-secondary-fixed-variant': '#003ea8',
        'on-secondary-container': '#fefcff',

        // Tertiary colors
        tertiary: '#005b3d',
        'tertiary-container': '#007650',
        'on-tertiary': '#ffffff',
        'tertiary-fixed': '#6ffbbe',
        'tertiary-fixed-dim': '#4edea3',
        'on-tertiary-fixed': '#002113',
        'on-tertiary-fixed-variant': '#005236',
        'on-tertiary-container': '#76ffc2',

        // Background colors
        background: '#faf8ff',
        surface: '#faf8ff',
        'surface-bright': '#faf8ff',
        'surface-dim': '#d2d9f4',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f2f3ff',
        'surface-container': '#eaedff',
        'surface-container-high': '#e2e7ff',
        'surface-container-highest': '#dae2fd',
        'surface-variant': '#dae2fd',
        'on-surface-variant': '#4a4455',
        'outline-variant': '#ccc3d8',
        'inverse-surface': '#283044',
        'inverse-on-surface': '#eef0ff',

        // Error colors
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',

        // Outline
        outline: '#7b7487',

        // On colors
        'on-background': '#131b2e',
        'on-surface': '#131b2e'
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg: '2rem',
        xl: '3rem',
        full: '9999px'
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '0.75rem',
        'space-lg': '1.25rem',
        'space-xl': '2rem',
        gutter: '1rem',
        'gutter-desktop': '1.5rem',
        margin: '1rem',
        'margin-desktop': '2rem'
      },
      fontFamily: {
        'headline-lg-mobile': ['Space Grotesk', 'sans-serif'],
        'headline-md': ['Space Grotesk', 'sans-serif'],
        'body-lg': ['Geist', 'sans-serif'],
        'label-lg': ['Geist', 'sans-serif'],
        'label-code': ['Geist', 'monospace'],
        'headline-xl-mobile': ['Space Grotesk', 'sans-serif'],
        'body-md': ['Geist', 'sans-serif'],
        'body-sm': ['Geist', 'sans-serif'],
        'headline-lg': ['Space Grotesk', 'sans-serif'],
        'label-md': ['Geist', 'sans-serif'],
        'stat-display': ['Space Grotesk', 'sans-serif'],
        'headline-xl': ['Space Grotesk', 'sans-serif']
      },
      fontSize: {
        'headline-lg-mobile': ['22px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md': ['20px', { lineHeight: '26px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'label-lg': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'label-code': ['11px', { lineHeight: '14px', letterSpacing: '0.08em', fontWeight: '600' }],
        'headline-xl-mobile': ['28px', { lineHeight: '34px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'headline-lg': ['28px', { lineHeight: '36px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'label-md': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'stat-display': ['32px', { lineHeight: '36px', letterSpacing: '-0.03em', fontWeight: '700' }],
        'headline-xl': ['36px', { lineHeight: '44px', letterSpacing: '-0.03em', fontWeight: '700' }]
      },
      screens: {
        mobile: '390px',
        'mobile-lg': '430px',
        desktop: '1024px'
      }
    }
  },
  plugins: []
};

export default config;
