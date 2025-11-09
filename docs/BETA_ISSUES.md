# OmniBrowser × Redix — Beta Issue Templates

Use these seven issue outlines to track the daily deliverables from the real-time audit plan. Copy/paste each block into GitHub and adjust assignee/labels as needed.

---

## Day 1 — Tab Strip + Omnibox Groundwork ✅
- **Title:** Phase 1 Day 1 — Tab Strip + Omnibox overhaul
- **Summary:** Track completion proof (scroll-into-view, keyboard navigation, quick actions, offline fallback).
- **Acceptance Criteria:**
  - Tab strip supports Home/End/Arrow navigation + middle-click close.
  - Active tab auto scrolls into view.
  - Omnibox handles `/calc`, `@live`, `@agent`, offline history.
  - Playwright smoke suite covers close + keyboard nav.
- **Status:** ✅ Completed (PR merged)
- **Follow-up:** Collect beta feedback on drag-to-reorder/groups.

## Day 2 — Privacy Stack (Tor/VPN) ✅
- **Title:** Phase 1 Day 2 — Tor/VPN stack wiring
- **Summary:** Ensure toggle UI + backend auto-proxy + consent overlay.
- **Acceptance Criteria:**
  - Tor enable sets Electron session proxy (`socks5://127.0.0.1:9050`) and restores previous proxy on stop.
  - VPN monitor updates status badge automatically.
  - Consent Playground surfaces requests + approve/reject states.
  - `REAL_TIME_AUDIT.md` updated → Day 2 marked complete.
- **Status:** ✅ Completed (tor proxy + status wiring shipped)
- **Follow-up:** Add integration smoke test for proxy swap (tracked separately).

## Day 3 — Regen Auto Hibernate + Text-Only ✅
- **Title:** Phase 1 Day 3 — Regen automation polish
- **Summary:** Regen alerts, auto hibernate actions, text-only fallback.
- **Acceptance Criteria:**
  - Efficiency alerts trigger <30% battery predictions.
  - "Hibernate background tabs" action works and surfaces toast.
  - Text-only mode toggle documented in status bar.
- **Status:** ✅ Completed.
- **Follow-up:** Tune thresholds post-beta telemetry.

## Day 4 — Redix Prediction Badge ✅
- **Title:** Phase 1 Day 4 — Redix runtime badge
- **Summary:** Display predicted runtime (e.g. “2.1h left”) next to efficiency badge.
- **Acceptance Criteria:**
  - Badge updates when regen score changes.
  - Hover tooltip details metrics (battery %, regen actions).
  - Logged via telemetry.
- **Status:** ✅ Completed.

## Day 5 — CSP + iframe Proxy ✅
- **Title:** Phase 1 Day 5 — Harden CSP and iframe proxy
- **Summary:** Add domain allow-list + COOP/COEP + header stripping.
- **Acceptance Criteria:**
  - `Content-Security-Policy` tightened for app assets; dev server handled.
  - Allow-listed frames (TradingView, YouTube, etc.) render despite `X-Frame-Options`.
  - `IFRAME_ALLOWLIST` documented.
- **Status:** ✅ Completed.
- **Follow-up:** Monitor for hosts requiring addendum.

## Day 6 — E2E Smoke Tests ✅
- **Title:** Phase 1 Day 6 — Playwright Electron gate
- **Summary:** Ensure CI gating (lint/types/tests/perf + e2e).
- **Acceptance Criteria:**
  - `.github/workflows/ci.yml` enforces lint/type/unit/perf + e2e.
  - `npm run test:e2e` covers tab nav, middle-click, streaming search.
  - CI green on main.
- **Status:** ✅ Completed.
- **Follow-up:** Expand coverage to consent/Tor toggles.

## Day 7 — Demo GIF + README 📹
- **Title:** Phase 1 Day 7 — Record 3 min demo + README refresh
- **Summary:** Screen capture + update main README with highlights/GIF.
- **Acceptance Criteria:**
  - Follow `docs/DEMO_SCRIPT.md` to capture <3m clip.
  - README (root + memory kit) references new GIF & features.
  - Post to release channels (Reddit/HN/X) after QA sign-off.
- **Status:** 🔄 Demo script prepared; recording pending.
- **Checklist:**
  - [ ] Capture demo video/GIF
  - [ ] Update README(s)
  - [ ] Publish to channels

---

> Tip: link each GitHub issue back to the audit section (REAL_TIME_AUDIT.md) for easy context sharing.

