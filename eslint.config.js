// ESLint configuration (flat config, ESLint >= 9). Run with `npm run lint` / `npm run lintFix`.
// Plain JavaScript on purpose: ESLint can only load a .ts config with an extra package (jiti).
//
// The config is a list of objects; for each file ESLint merges all objects whose `files`
// match (later entries override earlier ones).
import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  // Not linted: build output, coverage report and dependencies (node_modules is ignored by default).
  { ignores: ['dist/', 'coverage/'] },

  {
    files: ['**/*.ts'],
    extends: [
      // Likely bugs: unused variables, unreachable code, duplicate keys, ...
      js.configs.recommended,
      // TypeScript-specific problems: `any`, non-null assertions (!), empty functions, ...
      // Also parses TypeScript and turns off core rules TypeScript already checks (e.g. no-undef).
      tseslint.configs.recommended,
    ],
    plugins: {
      // Formatting rules. They moved out of ESLint core (deprecated there, removed in ESLint 11).
      '@stylistic': stylistic,
    },
    rules: {
      // --- Formatting (npm run lintFix fixes all of these) ---
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/indent': ['error', 2, { SwitchCase: 1 }],
      // LF only. Git with core.autocrlf=true can check out files with CRLF, which fails here.
      '@stylistic/linebreak-style': ['error', 'unix'],
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/brace-style': ['error'],

      // --- Code style ---
      'dot-notation': 'error', // obj.key instead of obj['key']
      eqeqeq: ['error', 'always', { null: 'ignore' }], // === except `x == null` (null or undefined)
      curly: ['error', 'all'], // braces around every if/else/loop body

      // --- TypeScript ---
      // Reported as warnings (typescript-eslint >= 6 makes them errors): the API models still
      // use `any` in places, and some interface implementations ignore their parameters.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      // Node runs the .ts tests and scripts directly (type stripping): type-only imports must be
      // marked, or they would be loaded at runtime and fail.
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    },
  },
);
