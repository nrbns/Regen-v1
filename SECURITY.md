# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < 1.0   | :x:                |

## Security Features

### 1. **Sandboxing**
- **Renderer Isolation**: Each tab runs in isolated BrowserView
- **Context Isolation**: `contextIsolation: true` prevents node access
- **Sandbox Mode**: Enabled where possible
- **Preload Scripts**: Minimal API exposure via `contextBridge`

### 2. **Content Security Policy (CSP)**
- Strict CSP headers for internal pages
- No inline scripts in production
- Restricted resource loading

### 3. **IPC Security**
- **Typed IPC**: Zod validation for all IPC requests
- **Versioned Channels**: `ob://ipc/v1/*` with schema validation
- **Request Validation**: All handlers validate input
- **Error Handling**: No sensitive data in error messages

### 4. **Network Security**
- **HTTPS-Only Mode**: Force secure connections
- **Certificate Validation**: Standard Electron cert pinning
- **DNS-over-HTTPS**: Encrypted DNS queries
- **Tor Support**: Route traffic through Tor network
- **Proxy Validation**: Verify proxy endpoints

### 5. **Data Protection**
- **Encrypted Storage**: Use system keychain/safeStorage for secrets
- **Partition Isolation**: Separate sessions per profile/tab
- **Secure Deletion**: Overwrite on "Burn Tab" / "Forensic Cleanse"
- **Checksum Verification**: SHA-256 for downloads

### 6. **Permission System**
- **Granular Permissions**: Camera, mic, filesystem, notifications
- **Per-Origin TTL**: Permissions expire after set time
- **Explicit Consent**: No auto-approval for sensitive operations
- **Consent Ledger**: Audit trail of all approvals

### 7. **Fingerprint Protection**
- **Canvas Noise**: Randomize canvas fingerprinting
- **Audio Fingerprinting**: Add noise to audio context
- **WebGL Spoofing**: Standardized GPU strings
- **User-Agent Randomization**: Per-tab UA strings
- **Screen Resolution**: Normalize screen metrics

### 8. **Update Security**
- **Signed Releases**: GitHub Releases with checksums
- **Auto-Update Verification**: Verify signatures before install
- **No Telemetry**: Updates check GitHub only, no tracking

## Reporting Security Issues

**DO NOT** open a public issue for security vulnerabilities.

### How to Report

1. **Email**: Open a private security advisory on GitHub
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Fix Timeline**: Depends on severity
  - **Critical**: < 7 days
  - **High**: < 14 days
  - **Medium**: < 30 days
  - **Low**: Next release cycle

### Disclosure Policy

- We will disclose after a fix is available
- Credit will be given (if desired)
- We will coordinate with you on timing

## Known Limitations

1. **Electron Base**: Inherits Electron security considerations
   - Keep Electron updated
   - Use latest Chromium version
   
2. **Native Modules**: Some features require native code
   - Tor client (optional)
   - Adblocker engines (optional)

3. **System Integration**: Requires OS permissions for:
   - Keychain access (macOS)
   - Screen recording prevention (macOS)
   - File system access (downloads)

## Best Practices for Users

1. **Keep Updated**: Always use latest version
2. **Enable Shields**: Use privacy shields by default
3. **Use Private Mode**: For sensitive browsing
4. **Verify Downloads**: Check SHA-256 checksums
5. **Review Permissions**: Audit consent ledger regularly
6. **Use DoH/Tor**: For maximum privacy

## Security Checklist

Before each release:
- [ ] Update Electron to latest stable
- [ ] Update all dependencies (`npm audit`)
- [ ] Review IPC handlers for validation
- [ ] Test sandboxing in all modes
- [ ] Verify CSP headers
- [ ] Test permission flows
- [ ] Review consent ledger integrity
- [ ] Sign release artifacts
- [ ] Publish security notes if needed

---

**Last Updated**: 2024-12
