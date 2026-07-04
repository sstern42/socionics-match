import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      // The React Compiler lint rules (react-hooks v7) surface real patterns
      // worth cleaning up, but several live in core auth/feed/messaging flows
      // where a blind refactor risks regressions. Keep them visible as warnings
      // and address incrementally, rather than blocking CI on them. Tracked in #931.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      // Fast-refresh-only concern (dev HMR), no runtime impact. Fixing means
      // splitting context/data files; not worth the import churn in core files.
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    // Service worker runs in the ServiceWorkerGlobalScope — `clients`, `caches`,
    // `skipWaiting`, etc. are globals there, not in the browser window scope.
    files: ['public/sw.js'],
    languageOptions: { globals: globals.serviceworker },
  },
])
