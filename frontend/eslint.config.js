import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // ds-bundle i .ds-sync to wytwory importu systemu designu do claude.ai/design:
  // zbudowany bundle i sklonowane skrypty konwertera. Ani jedno, ani drugie nie
  // jest kodem tego repo. Pisane ręcznie wejścia (.design-sync/) lintujemy
  // normalnie - z wyjątkiem .cache/, który też jest generowany.
  {
    ignores: [
      'dist',
      'src/api/schema.d.ts',
      'ds-bundle',
      '.ds-sync',
      '.design-sync/.cache',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  // configs.flat[...], nie configs['recommended-latest']: to drugie trzyma
  // `plugins` jako tablicę stringów (format eslintrc), którego ESLint 10 już nie
  // przyjmuje. Wariant `flat` to ten sam zestaw reguł w formacie flat config.
  reactHooks.configs.flat['recommended-latest'],
  reactRefresh.configs.vite,
  // Skrypty przygotowujące wejścia dla design-sync chodzą w Node, nie w
  // przeglądarce - potrzebują własnego zestawu globali.
  {
    files: ['.design-sync/**/*.mjs'],
    languageOptions: { ecmaVersion: 2022, globals: globals.node },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      // Nieużywany argument z podkreśleniem to świadomy placeholder
      // (np. `(_event, value) =>`), nie zapomniany kod.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
)
