# Regen Browser - Project Structure

## 📁 Clean Folder Organization

This document describes the organized structure of the Regen Browser project.

---

## Root Directory

### Essential Files (Stay in Root)
* `README.md` - Main project README (public-facing)
* `VISION.md` - Project vision (moved to `docs/`)
* `CHANGELOG.md` - Version history
* `CONTRIBUTING.md` - Contribution guidelines
* `ROADMAP.md` - Product roadmap
* `SECURITY.md` - Security policies
* `PRIVACY.md` - Privacy policy
* `LEGAL.md` - Legal terms
* `TERMS_OF_SERVICE.md` - Terms of service
* `CONSENT_LEDGER.md` - Consent management
* `RELEASE_NOTES.md` - Release notes

### Configuration Files
* `package.json` / `package-lock.json` - Node.js dependencies
* `tsconfig*.json` - TypeScript configurations
* `vite.config.ts` - Vite build configuration
* `tailwind.config.ts` - Tailwind CSS configuration
* `eslint.config.mjs` - ESLint configuration
* `vitest.config.ts` - Vitest test configuration
* `playwright.config.ts` - Playwright E2E test configuration

### Build & Deployment
* `Dockerfile.*` - Docker container definitions
* `docker-compose.yml` - Docker Compose configuration
* `installer.nsi` - Windows installer script
* `requirements-worker.txt` - Python worker dependencies

### Source Code Directories

#### `/src/` - Frontend Source Code
```
src/
├── components/        # React components
│   ├── ai-sidebar/   # AI Sidebar components
│   ├── layout/       # Layout components (AppShell, etc.)
│   ├── ui/           # UI primitives
│   └── ...
├── core/             # Core business logic
│   └── regen-core/   # Sentinel AI (Regen Core)
├── lib/              # Shared libraries
│   ├── command/      # Command controller & intent router
│   ├── events/       # Event bus system
│   ├── security/     # Security & audit logging
│   └── ...
├── routes/           # Route components
├── state/            # State management (Zustand stores)
├── services/         # Service layer
├── hooks/            # React hooks
├── utils/            # Utility functions
└── types/            # TypeScript type definitions
```

#### `/server/` - Backend Server Code
```
server/
├── agent-engine/     # Agent orchestration
├── doc-service/      # Document processing
├── websocket/        # WebSocket server
└── ...
```

#### `/src-tauri/` - Tauri Desktop App
```
src-tauri/
├── src/              # Rust source code
├── icons/            # App icons
└── ...
```

#### `/apps/` - Application Modules
```
apps/
├── api/              # API services
├── desktop/          # Desktop app code
└── knowledge-engine/ # Knowledge engine
```

---

## Documentation Structure (`/docs/`)

All documentation is organized into logical categories:

### `/docs/architecture/` - Technical Architecture
* `API_DOCUMENTATION.md` - Complete API reference
* `AUDIT.md` - CTO audit checklist and compliance
* `REGEN_CORE_IMPLEMENTATION.md` - Regen Core implementation guide
* `VALIDATION_CHECKLIST.md` - Feature validation checklist
* `LEGACY_COMPONENTS.md` - Legacy component documentation
* `IMPROVEMENT_PLAN.md` - Systematic improvement plans

### `/docs/development/` - Development Logs
* `AI_SIDEBAR_COMPLETE.md` - AI Sidebar completion log
* `ALL_ENHANCEMENTS_COMPLETE.md` - All enhancements summary
* `COMPLETION_SUMMARY.md` - Overall completion summary
* `FINAL_IMPROVEMENTS_SUMMARY.md` - Final improvements
* `FIXES_SUMMARY.md` - Bug fixes summary
* `IMPROVEMENTS_COMPLETE.md` - Improvements log
* `IMPROVEMENTS_TO_5_5.md` - Plan to achieve 5/5 audit scores
* `UI_TRANSFORMATION_COMPLETE.md` - UI transformation log
* `UI_TRANSFORMATION_SUMMARY.md` - UI transformation summary
* `REGEN_CORE_DAY2_COMPLETE.md` - Regen Core Day 2
* `REGEN_CORE_DAY3_COMPLETE.md` - Regen Core Day 3
* `REGEN_CORE_FINAL.md` - Regen Core final implementation
* `SENTINEL_SPINE_COMPLETE.md` - Sentinel Spine implementation
* `REALTIME_IMPLEMENTATION_COMPLETE.md` - Real-time architecture
* `REALTIME_SUMMARY.md` - Real-time architecture summary

### `/docs/user-guides/` - User-Facing Documentation
* `BUILD_AND_RUN.md` - Build and run instructions

### `/docs/` - Vision & Strategy
* `VISION.md` - Project vision for investors and stakeholders

---

## Other Directories

### `/tests/` - Test Files
```
tests/
├── unit/             # Unit tests
├── integration/      # Integration tests
├── e2e/              # End-to-end tests
├── performance/      # Performance tests
└── ...
```

### `/scripts/` - Build & Utility Scripts
```
scripts/
├── build-production.cjs
├── generate-changelog.js
├── setup-playwright.js
└── ...
```

### `/tools/` - Development Tools
```
tools/
├── check-redis.js
└── ...
```

### `/config/` - Configuration Files
```
config/
├── vpn-profiles.json
└── ...
```

### `/extension/` - Browser Extension
```
extension/
├── manifest.json
├── background.js
├── content.js
└── ...
```

### `/branding/` - Branding Assets
```
branding/
└── regen-logo-source.png
```

### `/public/` - Public Assets
```
public/
├── fonts/
├── logo.png
└── ...
```

---

## Build Output Directories

These directories are generated during build and should not be committed:

* `/dist/` - Production build output (renderer)
* `/dist-web/` - Web build output
* `/node_modules/` - Node.js dependencies (gitignored)

---

## Key Principles

1. **Documentation Organization** - All docs in `/docs/` with clear categories
2. **Source Code Organization** - Logical grouping by feature/domain
3. **Configuration Centralization** - Config files in root or `/config/`
4. **Clean Root** - Only essential files in root directory
5. **Build Output Separation** - Generated files in separate directories

---

**Last Updated:** Today  
**Structure Version:** 1.0
