# Changelog

All notable changes to OmniBrowser will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- GitHub Actions CI/CD workflows
- Issue templates for bugs, features, and tasks
- Project status tracking documentation

### Changed
- Updated documentation structure

## [0.1.0-alpha] - 2025-01-27

### Added
- **Core Browser**
  - Session persistence with atomic JSONL store (auto-save every 2s)
  - Download manager with pause/resume/cancel functionality
  - Privacy blocklists (EasyList, EasyPrivacy, uBO annoyances, badware)
  - Tab keyboard navigation (←/→/Home/End/Ctrl+Tab)
  - Omnibox quick actions (/ai, /calc, /yt, /g, /t)
  - Window state restoration (positions, sizes, maximized state)

- **Research Mode v1**
  - Multi-source retrieval (5-12 sources, parallel fetching)
  - Source voting mechanism with type diversification
  - Summarization with inline citations and confidence scores
  - Verification service with hallucination detection
  - Contradiction detection for expert disagreements
  - Research Mode UI with confidence bars and source classification

- **Document Review v1**
  - Document ingestion (PDF, DOCX, Web URL)
  - Section TOC generation
  - Entity extraction (persons, organizations, locations, dates)
  - Timeline extraction from documents
  - Cross-check pipeline (3-8 sources per claim)
  - Claim verification (verified/unverified/disputed status)
  - Export functionality (Markdown, HTML)
  - Citation styles (APA, MLA, Chicago, IEEE, Harvard)

### Changed
- Enhanced security policies (popup/nav guards, deny-by-default permissions)
- Improved IPC error handling
- Better session management

### Fixed
- Tab strip keyboard navigation
- Download progress tracking
- Session restore on crash

### Known Limitations
- Auto-update not yet implemented
- Code signing not configured
- Settings UI incomplete
- Performance optimization needed (cold start)
- Test coverage < 50%
- Accessibility improvements needed

## [0.0.1] - 2024-12-01

### Added
- Initial project setup
- Basic Electron + React + Vite architecture
- Core browser functionality
- Security hardening

[Unreleased]: https://github.com/nrbns/Omnibrowser/compare/v0.1.0-alpha...HEAD
[0.1.0-alpha]: https://github.com/nrbns/Omnibrowser/releases/tag/v0.1.0-alpha
