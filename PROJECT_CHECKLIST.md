# OmniBrowser Project Checklist

Curated from the deep review and roadmap discussion. Tasks are grouped by milestone so you can track what belongs in the beta cut versus longer-term releases.

---

## Phase A — Beta Readiness (Next 30–60 Days)

### Release Hygiene
- [x] Restore public status doc (`PROJECT_STATUS.md`) with phase tracker and blockers
- [x] Tag `v0.2.0-beta` with release notes and changelog
- [x] Ensure CI runs lint (`npm run lint`), tests, and `npm audit`
- [x] Add signed Windows (NSIS) and macOS (DMG) installers with published hashes

### Onboarding & Docs
- [x] Publish user-friendly installation guide with screenshots _(screenshots pending, text guide available at `docs/INSTALLATION_GUIDE.md`)_
- [x] Add first-launch “Consent Ledger Tour” walkthrough (`docs/consent-ledger-tour.md`)
- [x] Document privacy settings and consent controls in `docs/USER_GUIDE.md`

### UI/UX Polish
- [x] Implement tab split-view or peek preview
- [x] Display hibernation indicators and animations
- [x] Run accessibility audit (axe-core) and fix issues
- [x] Add dark/light themes with auto-detect
- [x] Wrap agent/graph flows in error boundaries with user-friendly retry prompts

---

## Phase B — Agentic Intelligence & Productivity (3–6 Months)

### Ethical Agent Enhancements
- [x] Ship voice-activated agent (speech-to-text pipeline)
- [x] Log every agent action with undo/rollback controls
- [x] Integrate knowledge-graph powered “personal search” (local query cache)
- [x] Expose consent ledger history UI with granular filters

### Productivity Features
- [x] Launch “Spaces” that cluster tabs via graph context
- [x] Add quick command palette (`Ctrl/Cmd + K`) for tabs/apps/agents
- [x] Implement peek sidebar / hover previews
- [x] Attach graph notes (Easel-like) to research sessions

### Dynamic Privacy & Shields
- [x] Prototype ML-backed dynamic shield decisions
- [x] Visual threat dashboard (VPN, Tor, shield activity)
- [x] Automated privacy scans integrated into CI
- [x] CSP hardening (iframe proxy + headers)
- [x] Tor proxy auto-routing when enabled
- [x] AI Privacy Sentinel badge with per-tab tracker scoring

---

## Phase C — Community, Sync & Extensibility (6–12 Months)

### Sync & Collaboration
- [x] Prototype zero-knowledge sync for tabs and graph nodes
- [x] Support collaborative graph sharing (anonymous/secure links)
- [x] Build encrypted backup/export tooling

### Plugin Marketplace
- [x] Publish plugin SDK and documentation
- [x] Stand up curated marketplace with privacy scoring
- [x] Add moderation workflow for extension submissions

### Differentiators & 2025 Bets
- [x] Eco-mode (script throttling with energy metrics)
- [x] Parental/educator privacy assistant
- [ ] Experiment with AR/VR tab previews (WebXR prototype)

---

## Operational & Support Tasks (Ongoing)

- [x] Launch community channel (Discord or GitHub Discussions) for testers
- [x] Document Ethical AI Manifesto highlighting consent ledger and telemetry stance
- [x] Schedule quarterly security reviews (Tor/VPN leakage tests, dependency audits)
- [x] Collect beta telemetry (opt-in) to guide UX iterations
- [x] Maintain public roadmap aligning releases with Arc/Brave/Atlas/Comet competitive analysis
- [x] Publish CI health dashboard (link to Actions) for external testers


