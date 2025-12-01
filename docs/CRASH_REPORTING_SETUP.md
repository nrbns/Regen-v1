# Crash Reporting Setup Guide

Complete guide for setting up and using crash reporting in RegenBrowser.

## Overview

RegenBrowser uses **Sentry** for crash reporting and error monitoring. This provides:
- Automatic crash detection
- Error tracking
- Performance monitoring
- Memory leak detection
- OOM (Out of Memory) monitoring

## Setup

### 1. Get Sentry DSN

1. Sign up at [sentry.io](https://sentry.io)
2. Create a new project (choose "Tauri" or "React")
3. Copy your DSN (Data Source Name)

### 2. Configure Environment

Add to `.env` file:

```env
# Sentry DSN for crash reporting
SENTRY_DSN=your-sentry-dsn-here
VITE_SENTRY_DSN=your-sentry-dsn-here

# Optional: Sentry configuration
SENTRY_ENV=production
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### 3. Verify Setup

Run the app and check console for:
```
[Sentry] Renderer crash reporting enabled
```

## Features

### Automatic Crash Detection

**Backend (Rust)**:
- Panic handler captures all Rust panics
- Logs to local file: `%APPDATA%/RegenBrowser/crashes.log`
- Sends to Sentry if configured

**Frontend (React)**:
- Error boundaries catch React errors
- Global error handlers catch unhandled errors
- Unhandled promise rejections captured

### Memory Monitoring

**Backend**:
- Monitors system memory every 30 seconds
- Warns if memory usage > 90%
- Logs to Sentry

**Frontend**:
- Monitors JavaScript heap size
- Warns if usage > 85%
- Critical alert if > 95%

### Performance Monitoring

Startup time metrics automatically tracked:
- DOMContentLoaded
- Load event
- First Paint
- First Contentful Paint
- Time to Interactive

## Testing

### Test Crash Reporting

1. **Test Panic Handler** (Rust):
   ```rust
   // Add to main.rs temporarily
   panic!("Test panic");
   ```

2. **Test Error Boundary** (React):
   ```typescript
   // In any component
   throw new Error("Test error");
   ```

3. **Test Unhandled Error**:
   ```javascript
   // In browser console
   throw new Error("Test unhandled error");
   ```

### Test Memory Monitoring

1. Open DevTools → Performance
2. Record for 5 minutes
3. Check console for memory warnings
4. Check Sentry for memory alerts

## Logs

### Local Crash Logs

**Windows**: `%APPDATA%\RegenBrowser\crashes.log`  
**macOS**: `~/Library/Application Support/RegenBrowser/crashes.log`  
**Linux**: `~/.local/share/RegenBrowser/crashes.log`

### Console Logs

All crashes logged to console with `[PANIC]` or `[Global Error]` prefix.

## Disabling Crash Reporting

To disable Sentry:

1. Remove `SENTRY_DSN` from `.env`
2. Or set `SENTRY_DSN=""`
3. Restart app

Crash reporting is **opt-in** - only works if DSN is configured.

## Privacy

- **No data sent without DSN**: If DSN not configured, nothing is sent
- **Local-first**: All crashes logged locally
- **User control**: Can disable via environment variable
- **No PII**: URLs and user data sanitized before sending

## Troubleshooting

### Sentry Not Initializing

1. Check DSN is correct in `.env`
2. Check console for errors
3. Verify network connection
4. Check Sentry project settings

### Memory Warnings Too Frequent

Adjust thresholds in:
- `tauri-migration/src-tauri/src/main.rs` (backend)
- `src/main.tsx` (frontend)

### Performance Impact

Sentry has minimal performance impact:
- Async error reporting
- Batched uploads
- Local-first logging

---

**Last Updated**: 2024-12

