import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'functions/lib'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, prettier],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Pure statistics must never touch Firebase or the DOM.
    files: ['src/stats/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['firebase', 'firebase/*', 'react', 'react-*'] }],
    },
  },
  {
    files: ['scripts/**/*.ts', 'e2e/**/*.ts', 'tests/**/*.ts'],
    rules: { 'no-console': 'off', 'react-hooks/rules-of-hooks': 'off' },
  },
);
