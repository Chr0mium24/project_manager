import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import promisePlugin from 'eslint-plugin-promise';
import sonarjs from 'eslint-plugin-sonarjs';
import boundaries from 'eslint-plugin-boundaries';

const restrictedCompatPatterns = [
  {
    selector: "Identifier[name='Bun']",
    message: 'Do not introduce Bun runtime branches in V1.',
  },
  {
    selector: "Identifier[name='Deno']",
    message: 'Do not introduce Deno runtime branches in V1.',
  },
  {
    selector: "CallExpression[callee.name='require']",
    message: 'Do not use CommonJS compatibility paths. Use ESM imports.',
  },
];

export default tseslint.config(
  {
    ignores: ['storage/**', 'tmp/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    files: ['**/*.{ts,tsx,mts,cts,js,mjs}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: importPlugin,
      promise: promisePlugin,
      sonarjs,
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        { type: 'app', pattern: 'apps/*' },
        { type: 'package', pattern: 'packages/*' },
        { type: 'script', pattern: 'scripts/*' },
      ],
    },
    rules: {
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: false }],
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-depth': ['error', 3],
      complexity: ['error', 10],
      'max-params': ['error', 4],
      'max-statements': ['error', 20],
      'no-restricted-syntax': ['error', ...restrictedCompatPatterns],
      'no-restricted-globals': ['error', 'event'],
      'import/no-default-export': 'error',
      'import/no-cycle': 'error',
      'import/no-internal-modules': [
        'error',
        {
          allow: ['**/src/index.js', '**/src/index.ts', '**/src/public/**'],
        },
      ],
      'promise/no-floating-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'sonarjs/cognitive-complexity': ['error', 10],
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          rules: [
            {
              from: ['package'],
              disallow: ['app'],
              message: 'Packages must not depend on apps.',
            },
          ],
        },
      ],
    },
  },
);
