import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist/**', 'coverage/**', 'src/generated/**']),
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended],
  },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
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

      // Prefer const over let
      'prefer-const': 'error',

      // Require strict equality
      eqeqeq: ['error', 'always'],

      // Disallow var
      'no-var': 'error',

      // Disallow debugger
      'no-debugger': 'error',

      // Disallow constant conditions
      'no-constant-condition': 'error',

      // Warn about console.log
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Allow classes with decorators (NestJS)
      '@typescript-eslint/no-extraneous-class': [
        'error',
        { allowWithDecorator: true },
      ],
    },
  },
]);
