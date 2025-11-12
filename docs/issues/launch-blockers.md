# Launch Blocker Issues

Proposed GitHub issues for the remaining launch-critical gaps. Each entry includes ready-to-paste metadata plus concrete acceptance criteria and QA notes.

---

## 1. Graph intelligence service (Neo4j + ETL ingest)

- **Title:** `feat(graph): stand up Neo4j-backed research knowledge graph`
- **Labels:** `backend`, `graph`, `launch-blocker`
- **Summary:** The research mode still surfaces static sessions because no graph backend is wired. We need a live Neo4j instance, ETL ingest, and an internal API for traversal and scoring.

### Acceptance Criteria
- Spin up a reusable `apps/graph` FastAPI service (or module) that manages Neo4j connections with retry/backoff and health probes.
- Implement an ETL worker that ingests research citations, highlights, and agent outputs into Neo4j within 60s of creation.
- Expose typed traversal endpoints (e.g. `/graph/citations`, `/graph/entities/:id`) consumed by the renderer via IPC.
- Provide cache invalidation or TTL so outdated graph edges expire automatically.
- Add integration tests that seed fixtures and validate traversal queries.
- Document environment variables (`NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`) in `docs/backend/README.md`.

### QA
- Start the stack locally with seeded data and confirm `/graph/health` returns 200.
- In the UI, switching to Research mode should render live graph-derived related sources within 1s.
- Playwright smoke: add a check ensuring the graph endpoint returns ≥1 related node for a seeded citation.

---

## 2. Accessibility: high-contrast theme + screen reader coverage

- **Title:** `a11y: add high-contrast mode and audit screen reader flows`
- **Labels:** `frontend`, `accessibility`, `launch-blocker`
- **Summary:** Deep review flagged missing high-contrast styling and partial ARIA coverage. We must ship an AA-compliant theme toggle and ensure critical flows are screen-reader friendly.

### Acceptance Criteria
- Provide a `HighContrast` theme toggle persisted via `useAppStore`, affecting root CSS variables and Tailwind tokens.
- Audit all interactive components (TopNav, TabStrip, Downloads, Agent Console) with axe-core; fix violations or document exceptions.
- Ensure focus rings meet contrast ratios (≥ 3:1) and respect reduced motion preferences.
- Add `aria-live` regions for streaming AI responses and download status changes.
- Update documentation with keyboard navigation cheatsheet and accessibility statement.

### QA
- Run `npm run lint:a11y` (new script using `@axe-core/react`) with zero violations.
- Playwright happy-path checks using `expect(page).toHaveScreenshot()` in high-contrast mode.
- Manual verification with NVDA/VoiceOver for Agent Console interaction and tab switching.

---

## 3. Agent runtime offline fallback + health surfacing

- **Title:** `feat(agent): offline fallback + health indicators`
- **Labels:** `backend`, `agent`, `observability`, `launch-blocker`
- **Summary:** Although we added circuit breakers, the UI still shows “Model Ready” even when Ollama/Redis are unavailable. Provide deterministic fallbacks and expose health to the renderer.

### Acceptance Criteria
- Extend `apps/api/routes/agent.py` with `/agent/health` returning the status of Ollama, Redis, and circuit breaker state.
- Update the renderer (`useAgentStreamStore`) to poll the health endpoint and surface a banner + disable run button when degraded.
- Implement an offline answer generator that references the last successful transcript (cached) when remote calls fail.
- Add structured logging (JSON) for health state transitions and forward to the diagnostics pane.
- Write Playwright tests simulating a downed Ollama server; assert the banner appears and cached summary is used.

### QA
- Kill the Ollama process during streaming; verify UI shows “Offline mode: serving cached summary”.
- Metrics WebSocket should emit `agent_status: degraded` within 5s of failure.
- Ensure recovery path clears the banner automatically once health is restored.

---

## 4. Release artifact validation & signing

- **Title:** `release: code signing + artifact smoke tests`
- **Labels:** `release`, `security`, `launch-blocker`
- **Summary:** Release workflow builds installers but does not sign or validate them. We must add platform-specific signing and a post-build smoke test to ensure the binaries launch.

### Acceptance Criteria
- Integrate Windows code signing using EV/standard certificates (`CSC_LINK`, `CSC_KEY_PASSWORD`) and notarize macOS builds (App Store Connect credentials).
- Run a containerized smoke test per platform (e.g. `wine` for Windows, `xvfb-run` for Linux) that launches the built binary, verifies the splash screen, and exits cleanly.
- Attach signed artifacts and checksums (`sha256sum.txt`) to the GitHub release.
- Update release documentation with credential setup, revocation procedures, and rotation timelines.

### QA
- Confirm `signtool verify` (Windows) and `spctl --assess` (macOS) succeed in CI.
- Perform manual install from the generated artifacts on Windows 11 and macOS Sonoma.
- Validate checksums match between pipeline output and GitHub release assets.

---

## 5. Privacy telemetry audit & user-facing logs

- **Title:** `privacy: expose Tor/VPN/DoH telemetry with exportable logs`
- **Labels:** `privacy`, `ipc`, `launch-blocker`
- **Summary:** Proxy handlers are wired, but the Trust dashboard still shows placeholder data. We need real-time telemetry, historical logs, and export capabilities for privacy audits.

### Acceptance Criteria
- Stream Tor circuit status, VPN connection metadata, and DoH resolver errors over an IPC channel consumed by `TrustDashboard`.
- Persist the last 24 hours of privacy events (JSON Lines) in the profile directory with rotation.
- Add a “Download Privacy Log” action that exports the JSON file with a timestamped filename.
- Display explicit error states (e.g., “VPN disconnected”) with retry controls and helpful remediation hints.
- Document data retention and log structure in `docs/privacy/README.md`.

### QA
- Simulate Tor/VPN disruptions and confirm dashboard updates within 2s.
- Ensure logs are redacted (no IP/PII) and pass JSON schema validation.
- Playwright test verifies that exporting logs produces a file containing the simulated events.

---

**Next step:** Create GitHub issues using the templates above or automate via `gh issue create` with the provided titles and bodies. Update the project board once issues exist. 

