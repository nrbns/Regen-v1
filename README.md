# OmniBrowser

**A privacy-first, agentic research browser with Arc-level UX**

Electron + React + TypeScript + Vite multi-mode desktop browser with:
- 🛡️ **Brave + Tor + VPN** unified privacy stack ✅
- 🤖 **Agentic intelligence** with consent ledger ✅
- 📚 **Knowledge graph** foundation ✅
- 🧩 **Plugin runtime** ready ✅
- ⚡ **Performance-first** with tab hibernation ✅

**Status**: 🟡 **In Active Development (v0.1.0-alpha)**

[![CI](https://github.com/nrbns/Omnibrowser/workflows/CI/badge.svg)](https://github.com/nrbns/Omnibrowser/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Note**: Currently in Phase 4 (Pre-Launch Hardening). See [PROJECT_STATUS.md](./PROJECT_STATUS.md) for detailed status.

## Quick Start

```bash
npm install
npm run dev
```

## Documentation

- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Current features and status
- [PROJECT_CHECKLIST.md](./PROJECT_CHECKLIST.md) - 90-day build plan checklist
- [CHANGELOG.md](./CHANGELOG.md) - Release notes and changelog
- [ISSUES.md](./ISSUES.md) - Issue tracking and roadmap
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Architecture documentation
- [SECURITY.md](./SECURITY.md) - Security documentation

## Prerequisites
- Node 20+
- npm/pnpm/yarn

## Development
```bash
npm install
npm run dev
```
Vite runs on 5173; Electron loads the renderer.

## Build
```bash
npm run build
```
Outputs platform installers via electron-builder.

## Safety
- Video download requires explicit consent in Settings.
- Threat Analysis is informational only.
