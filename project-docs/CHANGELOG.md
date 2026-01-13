# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-01-XX

### Added
- **AI Performance Enhancements**: Parallel AI execution (4 concurrent requests)
- **Character-by-Character Streaming**: Smooth AI response streaming
- **Global Mode Sync Hub**: WebSocket hub for state synchronization across mode switches
- **Parallel Reasoning & Summarization**: Independent AI tasks run simultaneously
- **New Utilities**: `parallelTasks.ts` and `streamEnhancer.ts` for optimized AI processing

### Changed
- Increased AI engine concurrency from 2 to 4
- Improved Trade Mode WebSocket reconnection with exponential backoff
- YouTube direct navigation (removed Bing proxy)
- Tor warning only shows when Tor is enabled but fails

### Fixed
- Trade Mode WebSocket connection status messaging
- Search engine default (DuckDuckGo instead of Bing)
- Tor warning display logic

## [Unreleased]

### Added

- Comprehensive CI/CD pipeline with GitHub Actions
- Visual regression testing with Playwright
- Pre-commit hooks with Husky and lint-staged
- Semantic release automation
- Design system with LayoutEngine and Skeleton components
- Chrome Extension API adapter foundation
- Session persistence with SQLite
- OmniKernel unified API
- Browser-level optimizations
- Security hardening with sandboxing

### Changed

- Migrated Research mode to use LayoutEngine
- Replaced loading states with Skeleton components
- Improved TypeScript type safety across codebase

### Fixed

- Google/YouTube tab loading issues
- TypeScript compilation errors
- Navigation policies for external sites

## [0.1.0-alpha] - 2025-11-20

### Added

- Initial alpha release
- Core browser functionality
- Research, Trade, and Dev modes
- AI Dock integration
- Cursor AI integration
