Security Check Report
=====================

Generated: 2026-01-06

The repository-wide `scripts/security-check.js` detected occurrences of potentially dangerous patterns that need review and remediation before v1 stabilization.

Findings (summary):

- Multiple uses of `child_process` or direct process access in build and server scripts (expected in tooling; must be audited and gated):
  - scripts/build-installer-with-ollama.js
  - scripts/ci-validate.js
  - scripts/generate-changelog.js
  - scripts/run-tests.js
  - scripts/setup-playwright.js
  - tools/agent/voice-agent.js
  - tests/load/chaos-harness.js
  - and multiple server-side modules under `server/` and `scripts/`

- Dynamic code execution / eval / Function constructor occurrences (high risk):
  - src/components/browser/BrowserAutomationBridge.tsx (eval)
  - src/components/dev-console/AIDeveloperConsole.tsx (eval)
  - src/content-scripts/scrape-handler.js (eval)
  - src/services/liveTabScraper.ts (eval)
  - src/services/skills/sandbox.ts (new Function / sandbox usage)
  - src/utils/stagehand-api.ts (new Function)

- Dynamic imports from variables (possible runtime code loading):
  - src/core/docs/ocrService.ts
  - src/lib/monitoring/sentry-client.ts
  - src/lib/tauri-invoke.ts
  - src/services/vector/hnswService.ts
  - src/state/settingsStore.ts
  - src/services/prefetch/queryPrefetcher.ts

Recommendation / Next Steps
---------------------------

1. Audit each flagged file. For server-side build scripts that require `child_process`, ensure they run only in CI or as dev tools, not in production runtime, and document them in `SECURITY.md`.
2. Remove or replace `eval`, `new Function`, and similar constructs. Convert sandboxing strategies to use well-reviewed isolated processes or a vetted sandbox runtime.
3. Replace dynamic imports from variables with explicit, allowlisted module imports, or gate them behind `NetworkPolicy`/`ExecutionGate` if they load remote code.
4. Add `security:check` to CI pipelines to fail builds on new occurrences.
5. Perform an IPC/Tauri audit to ensure only allowlisted commands are exposed.

Detailed findings were printed to console when `node scripts/security-check.js` was run. Review and remediation should be planned and tracked.
