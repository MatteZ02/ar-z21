const {defineConfig} = require('eslint/config');
const universe = require('eslint-config-universe/flat/default');
const universeTypescriptAnalysis = require('eslint-config-universe/flat/shared/typescript-analysis');
const reactNative = require('eslint-plugin-react-native');

// Matches colour values written as string literals: #rgb, #rrggbb(aa), rgb(),
// rgba(), hsl() and hsla(). Colours belong in src/theme only.
const COLOR_LITERAL =
  '/^\\s*(#[0-9a-fA-F]{3,8}\\s*$|(rgb|rgba|hsl|hsla)\\s*\\()/';

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
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['src/theme/**'],
    plugins: {'react-native': reactNative},
    rules: {
      'react-native/no-color-literals': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=${COLOR_LITERAL}]`,
          message:
            'Hard-coded colour. Use a semantic token from useTheme() (see src/theme).',
        },
        {
          selector: `TemplateElement[value.raw=${COLOR_LITERAL}]`,
          message:
            'Hard-coded colour. Use a semantic token from useTheme() (see src/theme).',
        },
      ],
    },
  },
]);
