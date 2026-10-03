import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/node_modules/**',
    '**/coverage/**',
    'playwright-report/**',
    'test-results/**',
  ]),

  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Plan §14: type safety is non-negotiable.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true, 'ts-nocheck': true },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
    },
  },

  {
    files: ['client/**/*.{ts,tsx}'],
    extends: [
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: { globals: globals.browser },
    rules: {
      // Plan §15: content is rendered as text; raw HTML injection is banned.
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'dangerouslySetInnerHTML is not allowed (plan §15).',
        },
      ],
    },
  },

  {
    // Public pages keep Zod and the schemas out of their initial JavaScript (plan §16): they import
    // values from `@roman/shared/lite` and validate through the lazily loaded lib/api/validation.ts.
    files: ['client/src/**/*.{ts,tsx}'],
    ignores: [
      'client/src/features/admin/**',
      'client/src/lib/api/{admin,auth,uploads,validation}.ts',
      'client/src/lib/cloudinaryUpload.ts',
      'client/src/features/audio/sessionSchema.ts',
      'client/src/features/contact/ContactForm.tsx',
      'client/src/**/*.test.{ts,tsx}',
      'client/src/test/**',
    ],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@roman/shared',
              allowTypeImports: true,
              message:
                'Public code imports values from @roman/shared/lite; schemas load lazily (plan §16).',
            },
            {
              name: 'zod',
              allowTypeImports: true,
              message: 'Zod loads lazily on public pages (plan §16).',
            },
          ],
        },
      ],
    },
  },

  {
    files: [
      'server/**/*.ts',
      'shared/**/*.ts',
      'scripts/**/*.ts',
      '*.ts',
      'client/scripts/**/*.ts',
      'client/*.ts',
    ],
    languageOptions: { globals: globals.node },
  },

  {
    // Tests assert on mocked methods, e.g. expect(api.destroy).toHaveBeenCalled().
    files: ['**/*.test.{ts,tsx}'],
    rules: { '@typescript-eslint/unbound-method': 'off' },
  },

  prettier,
]);
