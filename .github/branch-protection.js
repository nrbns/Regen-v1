/**
 * Branch Protection Configuration
 * Apply these settings in GitHub repo settings
 */

module.exports = {
  // Main branch protection
  main: {
    required_status_checks: {
      strict: true,
      contexts: [
        'Lint & Type Check',
        'Format Check',
        'Unit & Integration Tests',
        'Build & Package',
        'End-to-End Tests',
        'Load & Stress Tests', // K6 - CRITICAL
        'All Quality Gates Passed',
      ],
    },
    enforce_admins: true,
    required_pull_request_reviews: {
      dismiss_stale_reviews: true,
      require_code_owner_reviews: true,
      required_approving_review_count: 1,
    },
    restrictions: null,
    required_linear_history: true,
    allow_force_pushes: false,
    allow_deletions: false,
    required_conversation_resolution: true,
  },

  // Develop branch protection
  develop: {
    required_status_checks: {
      strict: true,
      contexts: [
        'Lint & Type Check',
        'Format Check',
        'Unit & Integration Tests',
        'Build & Package',
        'End-to-End Tests',
        'Load & Stress Tests', // K6 - CRITICAL
      ],
    },
    enforce_admins: false,
    required_pull_request_reviews: {
      dismiss_stale_reviews: false,
      require_code_owner_reviews: false,
      required_approving_review_count: 1,
    },
    restrictions: null,
    allow_force_pushes: false,
    allow_deletions: false,
  },
};
