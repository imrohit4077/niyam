import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Standard fetch-on-mount pattern sets loading state at effect start; allow across the app.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['src/auth/AuthContext.tsx', 'src/contexts/**/*.tsx'],
    rules: {
      // Context modules export hooks alongside providers; HMR still works for leaf components.
      'react-refresh/only-export-components': 'off',
    },
  },
])
