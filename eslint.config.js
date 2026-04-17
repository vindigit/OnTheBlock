const js = require('@eslint/js');
const reactHooks = require('eslint-plugin-react-hooks');
const tseslint = require('typescript-eslint');

module.exports = [
  {
    ignores: ['node_modules/', 'coverage/', 'dist/', '.expo/', 'eslint.config.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.test.ts'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        it: 'readonly',
        beforeEach: 'readonly',
      },
    },
  },
];
