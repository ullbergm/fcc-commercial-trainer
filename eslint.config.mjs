import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/'] },
  js.configs.recommended,
  {
    // Browser scripts loaded via <script> tags. These files define one shared
    // global each (QUESTION_BANK, FSRS, Store), consumed by js/app.js;
    // storage.js reads its localStorage key out of EXAM_CONFIG.
    files: ['js/fsrs.js', 'js/storage.js', 'data/questions.js', 'data/manual-pages.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.browser, EXAM_CONFIG: 'readonly' },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^(FSRS|Store|QUESTION_BANK|MANUAL_PAGES)$' }],
    },
  },
  {
    // Same, but readiness.js reads the FSRS global rather than defining it,
    // and takes its pass mark from EXAM_CONFIG when that is loaded.
    files: ['js/readiness.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.browser, FSRS: 'readonly', EXAM_CONFIG: 'readonly' },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^Readiness$' }],
    },
  },
  {
    // The exam config loads after the two data files and may read both.
    files: ['data/exam-config.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.browser, QUESTION_BANK: 'readonly', MANUAL_PAGES: 'readonly' },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^EXAM_CONFIG$' }],
    },
  },
  {
    files: ['js/app.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.browser,
        QUESTION_BANK: 'readonly',
        EXAM_CONFIG: 'readonly',
        FSRS: 'readonly',
        Readiness: 'readonly',
        Store: 'readonly',
      },
    },
  },
  {
    // Documentation tooling: injected into a throwaway copy of index.html by
    // docs/screenshots/generate.sh, never part of the app.
    files: ['docs/screenshots/seed.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.browser, QUESTION_BANK: 'readonly', EXAM_CONFIG: 'readonly' },
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
    // Node scripts run by hand to regenerate committed data files.
    files: ['tools/**/*.js'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        QUESTION_BANK: 'readonly', MANUAL_PAGES: 'readonly',
        EXAM_CONFIG: 'readonly', FSRS: 'readonly', Readiness: 'readonly',
      },
    },
  },
];
