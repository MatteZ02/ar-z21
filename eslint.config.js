const {defineConfig} = require('eslint/config');
const universe = require('eslint-config-universe/flat/default');
const universeTypescriptAnalysis = require('eslint-config-universe/flat/shared/typescript-analysis');

module.exports = defineConfig([
  {ignores: ['node_modules/', '.expo/', 'dist/', 'web-build/']},
  universe,
  universeTypescriptAnalysis,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.d.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
  {
    rules: {
      'import/order': ['error', {'newlines-between': 'never'}],
      'prettier/prettier': 'warn',
    },
  },
]);
