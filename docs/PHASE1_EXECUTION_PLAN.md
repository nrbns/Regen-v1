# Phase 1 Execution Plan — OmniBrowser × Redix (Now – Dec 15)

## Objective
Deliver a demo-ready build that proves OmniBrowser is the most efficient browser available: <80 MB idle RAM, <150 MB active, and 2× battery life versus current baselines. Redix acts as the on-device eco brain that predicts drain, throttles intelligently, and exposes transparent regen metrics.

Scope is limited to two projects only:
- `omnibrowser`: browsing UX, SuperMemory capture/recall, AI omnibar.
- `redix`: telemetry ingestion, eco-scoring, predictive actions, regen dashboard.

All other initiatives are paused until this phase closes.

## Weekly Milestones

| Week | Dates | Focus | Key Deliverables | Success Metrics | Status |
|------|-------|-------|------------------|-----------------|--------|
| **1** | Nov 17 – Nov 23 | Performance engine | Battery/RAM/GPU monitors, throttling hooks, aggressive hibernation, perf audit harness | Idle RAM <80 MB; idle CPU <5%; baseline perf report committed | ✅ Completed |
| **2** | Nov 24 – Nov 30 | Redix eco-AI | Resource-aware scorer, predictive boost API, zero-cache automation, regen score calc | Regen score displayed with >90% accuracy; auto-actions logged in SuperMemory | ✅ Completed |
| **3** | Dec 1 – Dec 7 | SuperMemory refresh | Scoped memory writers, retention policies, canned omnibar queries, Redix summaries in recall | “Why Regen fired” query returns answer <150 ms; “Threat notes here” surfaces last 5 notes | ✅ Completed |
| **4** | Dec 8 – Dec 15 | Browser UX polish & demo | Regen mini-dashboard, AI omnibar polish, demo script, final benchmarks | Demo recorded; benchmark table shows targets met | ✅ Completed |

## Workstreams & Owners

- [x] **Performance Engine (Week 1)** — *Owner: perf squad*
  - [x] Implement `battery.ts` and main-process fetch loop.
  - [x] Enforce renderer hardening (`nodeIntegration: false`, offscreen, GC budget hooks).
  - [x] Extend tab hibernation to CPU/battery triggers.
  - [x] Add `perf-audit.js` script + NPM task.

- [x] **Redix Eco Brain (Week 2)** — *Owner: AI squad*
  - [x] Update `redix-core/eco/scorer.py` to include `battery_pct`, `ram_mb`, `cpu_load`.
  - [x] Build `predictBoost(url)` helper and integrate with tab creation.
  - [x] Write zero-cache automation and action logging (`project:"redix"`).
  - [x] Calculate Regen score + time-remaining; expose in IPC.

- [x] **SuperMemory (Week 3)** — *Owner: memory squad*
  - [x] Enforce `ALLOWED_PROJECTS=omnibrowser,redix` for write/search.
  - [x] Implement retention (14-day OmniBrowser raw, 7-day telemetry rollups, 90-day summaries).
  - [x] Add canned omnibar shortcuts and toggle for Redix summaries.
  - [x] Validate PII handling: `pii.level:"high"` never summarized.

- [x] **UX & Demo (Week 4)** — *Owner: experience squad*
  - [x] Build Regen mini-dashboard (score, predicted time, last actions, Regen toggle).
  - [x] Polish omnibar interactions and mode-specific flows.

## Key Technical Tasks (Backlog)

1. [x] `perf-eng-101`: Add `battery.ts` util & telemetry interval (Week 1).
2. [x] `perf-eng-102`: Harden renderer (disable Node integration, GC budget, offscreen rendering).
3. [x] `perf-eng-103`: Expand tab hibernation (CPU/battery triggers).
4. [x] `perf-eng-104`: Create `perf-audit.js` + npm `perf:test`.
5. [x] `redix-eco-201`: Update scorer (`battery_pct`, `ram_mb`, `cpu_load`).
6. [x] `redix-eco-202`: Implement `predictBoost()` + zero-cache automation.
7. [x] `redix-eco-203`: Regen score calculation + action logging.
8. [x] `supermemory-301`: Enforce project allow-list guards.
9. [x] `supermemory-302`: Implement retention + summaries.
10. [x] `supermemory-303`: Add omnibar canned queries & Redix toggle.
11. [x] `ux-401`: Regen mini-dashboard UI.
12. [x] `ux-402`: Demo script + benchmark dashboard.

## Metrics & Validation

- **Battery**: powermetrics/Battery Historian reports showing 2× lifetime increase vs. baseline (Chrome, Brave) under identical scenarios.
- **RAM**: `perf-audit.js` snapshots verifying <80 MB idle, <150 MB active.
- **Regen score**: Correlates with actual battery drain within ±10%.
- **SuperMemory queries**: Measured response times <150 ms for scoped queries.

## Risks & Mitigations

- **Electron overhead**: If RAM floor cannot hit <80 MB, ship low-process mode (2 renderer limit) + document trade-offs.
- **Battery APIs**: Some platforms lack reliable battery info; fall back to OS-specific modules or user estimates.
- **Timeline slip**: Weekly demos every Friday; any misses trigger scope triage next Monday.

## Reporting Cadence

- Daily check-in in #omniregen (Slack/Teams): blockers, perf stats.
- Weekly Friday demo: live metrics + features delivered.
- Project board: columns for Week 1–4 tasks; move cards as completed.

## Definition of Done

- Benchmarks published showing target metrics met.
- Regen dashboard live and functional.
- SuperMemory responses scoped and fast.
- Demo video + release notes ready for v0.2-beta “OmniRegen Update”.
