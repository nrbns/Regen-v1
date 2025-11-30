# RegenBrowser Production Fixes - 8% Lag Elimination

## Overview

This document tracks the fixes for the 8% production blockers identified in the audit:

1. Backend Reliability (Ollama auto-start + stream parsing)
2. Iframe/Search Unblock (CSP + proxy)
3. Agents/OS Integration (Global hotkeys + system tray)
4. Trade Polish (Yahoo CORS)
5. Installer (Zero-click NSIS)

## Status

- [x] Fix 1: Backend Reliability
- [x] Fix 2: Iframe/Search Unblock
- [x] Fix 3: Agents/OS Integration
- [x] Fix 4: Trade Polish
- [ ] Fix 5: Installer (in progress)

## Test Commands

After each fix:

```bash
cargo tauri dev
# Test: Research Mode → Hindi query → Cards stream in 2s offline
# Test: Browse Mode → Type "Nifty" → Iframe loads (no blank)
# Test: Ctrl+Shift+Space (app closed) → WISPR wakes
# Test: Trade Mode → Click Nifty → Live price + BUY signal streams
```

