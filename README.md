# OmniBrowser

**A privacy-first, agentic research browser with Arc-level UX**

Electron + React + TypeScript + Vite multi-mode desktop browser with:
- 🛡️ **Brave + Tor + VPN** unified privacy stack 🧪 *Experimental / in progress*
- 🤖 **Agentic intelligence** with consent ledger 🧪 *Experimental / in progress*
- 📚 **Knowledge graph** foundation 🧪 *Experimental / in progress*
- 🧩 **Plugin runtime** ready 🧪 *Experimental / in progress*
- ⚡ **Performance-first** with tab hibernation 🧪 *Experimental / in progress*

**Status**: 🟡 **In Active Development (v0.1.0-alpha)**

[![CI](https://github.com/nrbns/Omnibrowser/workflows/CI/badge.svg)](https://github.com/nrbns/Omnibrowser/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Note**: Currently in Phase 3 (Core Runtime & AI Wiring) - many systems are experimental or in progress. See [PROJECT_STATUS.md](./PROJECT_STATUS.md) for detailed status.
> 
> **Issues & Roadmap**: See [GitHub Issues](https://github.com/nrbns/Omnibrowser/issues) for current work and feature requests.

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

## Testing

Playwright-based Electron smoke tests cover the tab strip and critical UI ergonomics. Run them with:

```bash
npm run test:e2e
```

The first run may prompt Playwright to download browser dependencies. In CI the suite runs headlessly and fails the pipeline if any smoke assertion regresses.

## Safety
- Video download requires explicit consent in Settings.
- Threat Analysis is informational only.
