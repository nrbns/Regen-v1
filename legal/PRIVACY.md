# Privacy Policy

**Regen** is designed with privacy as a core principle. This document explains how we handle your data.

## Data Collection

### What We Don't Collect

- **Browsing History**: Stored locally only, never transmitted
- **Passwords**: Handled by your system keychain/browser password manager
- **Personal Data**: No telemetry, analytics, or tracking
- **Cookies/Storage**: Managed per-profile/partition, isolated from other sessions

### What We Store Locally

- **Browser Settings**: Preferences, extensions, profiles
- **Download History**: Local records with checksums (optional)
- **Session Data**: Workspaces, tabs, notes (stored locally)
- **Agent Tasks**: Research logs, consent ledger (local only)

## Privacy Features

### 1. Private/Incognito Mode

- **Ephemeral Partitions**: Each private window uses a temporary, in-memory session
- **Auto-Cleanup**: All data cleared on window close
- **Content Protection**: macOS screen recording prevention
- **Fingerprint Protection**: Canvas/audio noise, WebRTC blocking

### 2. Ghost Mode

- **Isolated Tabs**: Ghost tabs use separate partitions
- **No Persistence**: Cookies, storage, cache cleared on close
- **Timer-Based Auto-Close**: Optional automatic cleanup

### 3. Shields

- **Ad/Tracker Blocking**: Local filters, no external requests
- **HTTPS-Only Mode**: Force secure connections
- **3rd-Party Cookie Blocking**: Per-site configuration
- **Fingerprint Protection**: Canvas noise, audio randomization
- **WebRTC Leak Prevention**: Block unauthorized peer connections

### 4. Network Privacy

- **DNS-over-HTTPS (DoH)**: Encrypted DNS queries
- **Tor Integration**: Route traffic through Tor network
- **Proxy Support**: Per-tab/proxy routing
- **IPv6 Leak Protection**: Disable IPv6 to prevent leaks

### 5. Consent Ledger

- **Explicit Approvals**: All sensitive operations require user consent
- **Audit Trail**: SHA-256 hashed ledger of all consent actions
- **No Auto-Approval**: Nothing happens without your permission

## Data Sharing

**We do not share your data with anyone.** All data stays on your device unless you explicitly:

- Export workspaces/research notes
- Share via system clipboard
- Use cloud sync (if enabled in settings)

## Updates & Telemetry

- **Auto-Updates**: Optional, checks GitHub Releases only
- **No Telemetry**: Zero analytics or usage tracking
- **No Crash Reports**: Crashes logged locally only

## Your Rights

- **Delete All Data**: Use "Panic Wipe" or "Forensic Cleanse"
- **Export Data**: Export workspaces, notes, history
- **Audit Trail**: View consent ledger anytime
- **Source Code**: Fully open-source, inspectable

## Contact

For privacy concerns: Open an issue on [GitHub](https://github.com/nrbns/Omnibrowser).

**Last Updated**: 2024-12
