/* eslint-env node */
/**
 * lint-staged configuration
 * Runs linters and formatters on staged files
 */

module.exports = {
  // TypeScript and JavaScript files
  '**/*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier --write'],

  // Type check TypeScript files
  '**/*.ts?(x)': () => 'npm run build:types --noEmit',

  // Format other files
  '**/*.{json,md,yml,yaml,css,scss}': ['prettier --write'],
};
