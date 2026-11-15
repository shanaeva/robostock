import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import stylistic from '@stylistic/eslint-plugin';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      // Always use curly braces
      curly: ['error', 'all'],

      // Require blank lines before if and return
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'if' },
        { blankLine: 'always', prev: '*', next: 'return' },
      ],

      // Prefer const over let when possible
      'prefer-const': 'error',

      // Require strict equality
      eqeqeq: ['error', 'always'],

      // Disallow var
      'no-var': 'error',

      // Disallow debugger
      'no-debugger': 'error',

      // Disallow constant conditions in if, while, etc.
      'no-constant-condition': 'error',

      // Disallow duplicate imports from the same module
      'no-duplicate-imports': 'error',

      // Warn about console.log, but allow warn and error
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
]);

export default eslintConfig;
