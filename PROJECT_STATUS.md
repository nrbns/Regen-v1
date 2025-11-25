# Omnibrowser Project Status

**Last Updated:** $(date)

## Overview

Comprehensive status of all major components, their completion levels, working features, gaps, and fix priorities.

---

## Component Status Matrix

| Component                | On Track? | What's Working (Complete)                                                                                                                                                                                        | What's Lagging/Missing (20% Gap)                                                                                                                                                                                                           | Fix Priority                                                |
| ------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| **Research Mode**        | ✅ 90%    | File uploads (PDF/DOCX/TXT/MD), AI analysis/summaries/comparisons, citations, knowledge graph viz, multi-source aggregation, auto-tab opens, cross-tab memory. Perplexity-like outputs (cards/tables/pros-cons). | No live web search (manual uploads only – no DuckDuckGo/Bing queries); multilingual queries basic (12 langs, no auto-detect/Indic models like Bhashini for 22 Indic); graph blanks on slow nets; no voice trigger ("Research in Bengali"). | **High** – Add live search + IndicBERT for global beat.     |
| **Trade Mode**           | ✅ 95%    | AI signals (30s intervals), risk mgmt/position sizing, real-time charts/portfolio metrics, voice trading (12 langs).                                                                                             | Charts basic (no TradingView candlesticks/drawings/indicators); alerts drop on background/restart (stateless); no multilingual handoff (e.g., Hindi voice → Tamil summary).                                                                | **Medium** – Lightweight-charts + persistence for pro feel. |
| **Browser Core**         | ⚠️ 85%    | Tauri webview for navigation/tabs, lifecycle mgmt, crash-safe reloads, GPU accel, download manager. Search fallback teased.                                                                                      | Site blocks (CSP/red-no on Zerodha/YouTube per prior screenshot); no full search (non-URL → Google in lang); tab hibernation experimental (leaks). Offline weak.                                                                           | **Critical** – Allowlist/CSP fix for 100% loads.            |
| **UI/UX**                | ⚠️ 75%    | Tailwind responsive layout, mode switcher/sidebar, dark theme, Playwright-tested ergonomics.                                                                                                                     | No toasts/loading skeletons (AI feels frozen); sidebar janks on mobile (no collapse); no onboarding tour/lang switcher; no haptic/waveform for voice. Cold start 5-8s.                                                                     | **High** – Hot-toast + lazy-load for delight.               |
| **Functionality/Agents** | ✅ 85%    | Agentic core (DOM tagging/snapshots, planner goal→steps/loops, tool registry for nav/search/n8n tease); multi-provider AI (streaming/caching); automation (click/fill/extract/sequences).                        | n8n not wired (no workflow calls/loops – teased only); no multi-agent handoff (Research → Trade); persistence missing (state lost on crash); multilingual limited (12 langs, no 100+ auto-detect).                                         | **High** – n8n proxy + localStorage for OS feel.            |
| **Multilingual/Global**  | ⚠️ 60%    | 12 India-first langs (Hindi/Tamil etc.), voice browsing.                                                                                                                                                         | No 100+ langs (no IndicBERT/mBART for 22 Indic + global); no auto-detect (query in Bengali → English fallback); no offline translation.                                                                                                    | **Critical** – Bhashini/Gemini chain for Perplexity-beat.   |
| **OS Polish**            | ⚠️ 70%    | Low-RAM Tauri (22MB APK), privacy tease (Tor/VPN), extension sandbox future.                                                                                                                                     | No tab resurrection/workflow marketplace; no UPI/govt bots live; extensions not ready.                                                                                                                                                     | **Medium** – Resurrection + marketplace UI for "OS" vibe.   |
| **Testing/Scale**        | ✅ 80%    | Playwright E2E (~60% coverage, tab/UI focus); CI headless runs.                                                                                                                                                  | No offline/low-RAM tests; no lang-specific (Hindi voice); no load (10 tabs + agents).                                                                                                                                                      | **Medium** – Add 5 lang tests for 80% coverage.             |

---

## Priority Roadmap

### 🔴 Critical (Blocking Core Functionality)

1. **Browser Core – CSP/Allowlist Fix**
   - Fix site blocks on Zerodha/YouTube
   - Implement CSP allowlist for trusted domains
   - Enable full search (non-URL → Google in language)
   - Fix tab hibernation memory leaks

2. **Multilingual/Global – Language Support**
   - Integrate Bhashini API for 22 Indic languages
   - Add IndicBERT/mBART models for auto-detect
   - Implement offline translation fallback
   - Add 100+ language support via Gemini chain

### 🟠 High Priority (User Experience)

3. **Research Mode – Live Search**
   - Integrate DuckDuckGo/Bing API for live web search
   - Add voice trigger ("Research in Bengali")
   - Fix knowledge graph rendering on slow networks
   - Improve multilingual query handling

4. **UI/UX – Polish & Performance**
   - Add react-hot-toast for user feedback
   - Implement loading skeletons for AI operations
   - Add sidebar collapse for mobile
   - Create onboarding tour
   - Add language switcher UI
   - Optimize cold start (target: <3s)

5. **Functionality/Agents – Integration**
   - Wire n8n workflow calls/loops
   - Implement multi-agent handoff (Research → Trade)
   - Add localStorage persistence for crash recovery
   - Expand multilingual support to 100+ languages

### 🟡 Medium Priority (Nice to Have)

6. **Trade Mode – Advanced Charts**
   - Integrate TradingView or lightweight-charts
   - Add candlesticks, drawings, indicators
   - Implement alert persistence across restarts
   - Add multilingual handoff (Hindi voice → Tamil summary)

7. **OS Polish – Features**
   - Implement tab resurrection UI
   - Build workflow marketplace UI
   - Add UPI integration
   - Add government bot integrations

8. **Testing/Scale – Coverage**
   - Add offline/low-RAM test scenarios
   - Add language-specific tests (Hindi voice, etc.)
   - Add load testing (10 tabs + agents)
   - Target 80%+ coverage

---

## Quick Wins (Can be done immediately)

- ✅ Add react-hot-toast (already in dependencies)
- ✅ Implement loading skeletons
- ✅ Add sidebar collapse toggle
- ✅ Fix unused imports/variables (completed)
- ✅ Exclude build artifacts from linting (completed)

---

## Technical Debt

- CSP configuration needs allowlist approach
- Tab hibernation memory leaks
- Cold start optimization (5-8s → <3s target)
- Offline translation fallback
- State persistence across crashes

---

## Next Steps

1. **This Week:** Critical fixes (CSP, language support foundation)
2. **Next Week:** High priority (live search, UI polish)
3. **This Month:** Medium priority (charts, testing expansion)

---

## Notes

- Overall completion: ~80% across all components
- Strongest areas: Research Mode (90%), Trade Mode (95%), Agents (85%)
- Weakest areas: Multilingual (60%), UI/UX polish (75%), OS features (70%)
- Focus should be on critical browser core fixes and multilingual expansion for global reach
