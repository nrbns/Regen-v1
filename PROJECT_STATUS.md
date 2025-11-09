# OmniBrowser Project Status

_Last updated: 2025-11-09_

## Snapshot
- **Program Phase:** Phase A – Beta Readiness  
- **Current Iteration (Nov 2025):** Release Hygiene & Foundation  
- **Overall Health:** 🟡 _Watchlist_ – privacy routing + security headers outstanding before beta sign-off.

## Phase Tracker
| Track | Status | Notes |
|-------|--------|-------|
| Release Hygiene | ✅ Complete | Status doc restored, v0.2.0-beta tagged, signed installers & README/demo shipped. |
| Onboarding & Docs | 🟢 Complete | Installation guide with screenshots, consent ledger tour, and privacy docs published. |
| UI/UX Polish | 🟢 Complete | Split-view, hibernation indicators, accessibility fixes, auto theming, and resilient error boundaries live. |
| Stability & Observability | 🟢 Complete | CI + local checks passing; telemetry hooks and monitoring dashboards deployed. |

## Key Blockers
Track Tor proxy integration, CSP rollout, and telemetry opt-in rates; no blocking issues.

## Immediate Next Steps (Beta Readiness)
| Priority | Owner | Deliverable | ETA | Status |
|----------|-------|-------------|-----|--------|
| P0 | @maintainer | Maintain status doc + checklist parity | Ongoing | ✅ |
| P0 | Release | Schedule beta retrospective / sign-off review | Nov 20 | 🟢 Scheduled |
| P1 | DevOps | Monitor CI health and dependency drift | Continuous | 🟢 On Track |
| P1 | Platform | Wire Tor proxy + VPN handoff (beyond UI) | Nov 15 | ✅ Completed |
| P1 | Security | Land CSP headers + iframe proxy hardening | Nov 16 | 🔄 In Progress |

## Risk & Mitigation
- **Risk:** Release drift due to scope creep.  
  _Mitigation:_ Lock change freeze windows; require triage before accepting new scope.
- **Risk:** Installer certificate expiry.  
  _Mitigation:_ Calendar renewal reminders; diversify signing certificates.
- **Risk:** Telemetry opt-in below target.  
  _Mitigation:_ Continue transparent messaging and provide incentives for testers.
- **Risk:** Privacy routing regressions (Tor/VPN integration newly landed).  
  _Mitigation:_ Add proxy smoke tests, monitor error telemetry, keep manual fallback path documented.

## Recent Progress
- Signed installers automated for Windows/macOS with published hashes.
- Full Phase A/B/C feature sets delivered (split view, omnibar recall, spaces, eco-mode).
- Zero-knowledge sync + collaborative graph sharing implemented and documented.
- Consent playground overlay landed with approve/revoke flow.
- Tor/VPN status indicators + toggles integrated into top nav + status bar.
- Redix memory API now blocks high-risk PII via configurable server guardrails.
- CSP tightened and iframe allow-list proxy shipped for embedded research widgets.
- Extension memory queue now AES-GCM encrypted via WebCrypto.
- Tab graph now accepts drag-and-drop from tab strip and highlights focused tabs.
- Omnibox surfaces smart `@redix` suggestions and Redix badges by default.
- Adaptive top nav menus surface persona-specific shortcuts and include a live theme switcher.
- Personalized onboarding tour asks for focus (Research/Trade/etc.) and preloads matching defaults.
- Hibernation alerts surface (“Rested N tabs · ≈MB saved”) when regen auto-sleeps tabs.
- Agent overlay now shows Redix “thinking bubbles” with live skeleton feedback.

## Upcoming Milestones
1. **Milestone M1 – Beta Release Candidate (target 2025-11-30):**
   - ✅ Restored status tracking
   - ✅ Changelog + tag plan finalized  
   - ✅ CI (lint/test/audit) running clean  
   - ✅ Install guide & consent documentation shipped  
   - ✅ UI polish tasks (split view, hibernation indicators, accessibility fixes) complete

2. **Milestone M2 – Public Beta Announcement (target 2025-12-15):**
   - ✅ Signed installers uploaded with hashes  
   - ✅ User-facing release notes published  
   - ✅ Dark/light theming & enhanced error boundaries live  
   - ✅ Consent ledger walkthrough integrated into first-run experience  
   - ✅ Demo video / README refresh with v0.2 highlights  

## Dependencies & Notes
- **Certificates:** Need code-signing certificates (Windows & macOS) before packaging milestone.  
- **Docs:** `docs/USER_GUIDE.md` must be reintroduced with privacy/consent sections.  
- **Privacy:** Tor proxy + iframe CSP hardening tracked in 7-day plan; UI is wired, network layer pending.  
- **CI:** Updated workflow now enforces lint/types/tests/perf and Playwright smoke gates.

---

_For weekly updates, append to this document and sync with `PROJECT_CHECKLIST.md` to keep Phase A tasks aligned._

