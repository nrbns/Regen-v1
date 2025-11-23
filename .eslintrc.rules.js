/* eslint-env node */
/**
 * ESLint Rules for Design System Enforcement
 *
 * Add these rules to your .eslintrc or eslint.config.js to enforce
 * design system token usage and prevent hardcoded values.
 */

module.exports = {
  rules: {
    // Prevent hardcoded color values (encourage CSS variables)
    'no-restricted-syntax': [
      'warn',
      {
        selector:
          "Property[key.name='color'][value.type='Literal'][value.value=/^#[0-9a-fA-F]{3,6}$/]",
        message: 'Use design tokens (tokens.color.*) instead of hardcoded hex colors',
      },
      {
        selector:
          "Property[key.name='backgroundColor'][value.type='Literal'][value.value=/^#[0-9a-fA-F]{3,6}$/]",
        message: 'Use design tokens (tokens.color.*) instead of hardcoded hex colors',
      },
      {
        selector:
          "Property[key.name='borderColor'][value.type='Literal'][value.value=/^#[0-9a-fA-F]{3,6}$/]",
        message: 'Use design tokens (tokens.color.*) instead of hardcoded hex colors',
      },
    ],

    // Prevent hardcoded spacing (encourage tokens)
    'no-magic-numbers': [
      'warn',
      {
        ignore: [0, 1, -1], // Allow common values
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
        detectObjects: false,
      },
    ],

    // Encourage useTokens hook usage
    'no-restricted-imports': [
      'warn',
      {
        patterns: [
          {
            group: ['**/ui/tokens'],
            message: 'Prefer useTokens() hook over direct token imports',
          },
        ],
      },
    ],
  },
};
