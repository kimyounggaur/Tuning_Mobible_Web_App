import js from '@eslint/js';
import globals from 'globals';
export default [
  { ignores: ['dist/**', 'node_modules/**', 'output/**', 'test-results/**', '.vercel/**'] },
  js.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.worker, ...globals.node } }, rules: { 'no-unused-vars': 'error', 'prefer-const': 'error', eqeqeq: 'error', 'no-var': 'error' } },
];
