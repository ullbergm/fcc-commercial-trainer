import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/'] },
  js.configs.recommended,
  {
    // Browser scripts loaded via <script> tags. These files define one shared
    // global each (QUESTION_BANK, FSRS, Store), consumed by js/app.js.
    files: ['js/fsrs.js', 'js/storage.js', 'data/questions.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.browser },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^(FSRS|Store|QUESTION_BANK)$' }],
    },
  },
  {
    files: ['js/app.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.browser,
        QUESTION_BANK: 'readonly',
        FSRS: 'readonly',
        Store: 'readonly',
      },
    },
  },
  {
    files: ['sw.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.serviceworker },
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node, QUESTION_BANK: 'readonly' },
    },
  },
];
