import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'src/api/schema.d.ts'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  // configs.flat[...], nie configs['recommended-latest']: to drugie trzyma
  // `plugins` jako tablicę stringów (format eslintrc), którego ESLint 10 już nie
  // przyjmuje. Wariant `flat` to ten sam zestaw reguł w formacie flat config.
  reactHooks.configs.flat['recommended-latest'],
  reactRefresh.configs.vite,
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
