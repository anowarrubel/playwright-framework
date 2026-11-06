import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'test-results/**', 'playwright-report/**', 'blob-report/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Assertions live inside page-object methods named expect*, so treat
      // those calls as assertions too.
      'playwright/expect-expect': [
        'warn',
        { assertFunctionNames: ['expect', 'a11y'], assertFunctionPatterns: ['^expect'] },
      ],
    },
  },
);
