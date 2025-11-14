# Release & Auto-Update Setup

## ✅ Completed

### 1. Auto-Update Configuration
- ✅ Added `electron-updater` dependency
- ✅ Configured auto-updater in `main.ts`:
  - Checks for updates on startup (production only)
  - Checks every 4 hours
  - Sends update events to renderer
- ✅ Added IPC handlers:
  - `update:check` - Manually check for updates
  - `update:install` - Install downloaded update
  - `update:restart` - Restart and install update

### 2. Release Workflow Enhancements
- ✅ Enhanced `.github/workflows/release.yml`:
  - Generates SHA-256 checksums for all artifacts
  - Includes checksums in release notes
  - Supports Windows, macOS, and Linux builds

### 3. Electron Builder Configuration
- ✅ Updated `package.json` build config:
  - Added GitHub publish provider
  - Configured macOS code signing (requires entitlements)
  - Configured Windows code signing (requires certificate)
  - Improved NSIS installer options

### 4. macOS Entitlements
- ✅ Created `build/entitlements.mac.plist` for code signing

## 🔧 Setup Required

### Code Signing Certificates

#### macOS
1. **Apple Developer Account** (required for distribution):
   - Sign up at https://developer.apple.com
   - Create a Developer ID Application certificate
   - Download and install in Keychain

2. **Configure in GitHub Secrets**:
   - `APPLE_ID` - Your Apple ID email
   - `APPLE_ID_PASSWORD` - App-specific password (not your regular password)
   - `APPLE_TEAM_ID` - Your Team ID from Apple Developer portal
   - `CSC_LINK` - Base64-encoded certificate (or path)
   - `CSC_KEY_PASSWORD` - Certificate password

#### Windows
1. **Code Signing Certificate**:
   - Purchase from: DigiCert, Sectigo, or GlobalSign
   - Or use self-signed for testing (not recommended for distribution)

2. **Configure in GitHub Secrets**:
   - `WIN_CERT_FILE` - Path to certificate file (or base64-encoded)
   - `WIN_CERT_PASSWORD` - Certificate password

### GitHub Secrets Setup

Add these secrets in your GitHub repository settings:

```
APPLE_ID=your@email.com
APPLE_ID_PASSWORD=app-specific-password
APPLE_TEAM_ID=XXXXXXXXXX
CSC_LINK=base64-encoded-certificate-or-path
CSC_KEY_PASSWORD=certificate-password

WIN_CERT_FILE=path-to-certificate
WIN_CERT_PASSWORD=certificate-password
```

## 🚀 Creating a Release

### Option 1: Tag-based Release
```bash
git tag v0.1.0-alpha
git push origin v0.1.0-alpha
```
This triggers the release workflow automatically.

### Option 2: Manual Release
1. Go to Actions → Release workflow
2. Click "Run workflow"
3. Enter version (e.g., `v0.1.0-alpha`)
4. Select platform (all, win, mac, or linux)
5. Click "Run workflow"

## 📦 Release Artifacts

Each release includes:
- **Windows**: `.exe` installer (NSIS)
- **macOS**: `.dmg` disk image
- **Linux**: `.AppImage` executable
- **SHA-256 checksums** in release notes

## 🔄 Auto-Update Flow

1. **Check for Updates**:
   - Automatic on startup (production builds)
   - Every 4 hours
   - Manual via `update:check` IPC

2. **Download Updates**:
   - Automatic in background
   - Notifies user when ready

3. **Install Updates**:
   - User can trigger via `update:install` IPC
   - Or restart via `update:restart` IPC

## 🧪 Testing Auto-Update

### Local Testing (Development)
Auto-updater is disabled in development mode. To test:

1. Build a production version:
   ```bash
   npm run build
   npm run build:app
   ```

2. Create a test release on GitHub

3. Install the built app

4. Create a new release with a higher version

5. The app should detect and download the update

### Testing Update UI
The renderer receives these events:
- `update:available` - New version available
- `update:downloaded` - Update downloaded, ready to install

You can listen for these in your React components and show update notifications.

## 📝 Release Notes

Release notes are automatically extracted from `CHANGELOG.md`:
- Looks for `## [version]` or `## version` section
- Falls back to `## [Unreleased]` if version not found
- Includes SHA-256 checksums automatically

## 🔒 Security Notes

- **Code signing is required** for macOS distribution outside the App Store
- **Windows code signing** prevents "Unknown Publisher" warnings
- **SHA-256 checksums** allow users to verify download integrity
- Auto-update only works in **production builds** (`app.isPackaged === true`)

## 🐛 Troubleshooting

### Auto-update not working
- Verify `app.isPackaged === true` in production builds
- Check GitHub token has release permissions
- Verify `publish.provider` is set to "github" in `package.json`

### Code signing fails
- Verify certificates are installed correctly
- Check GitHub secrets are set correctly
- For macOS: Ensure entitlements file exists at `build/entitlements.mac.plist`

### Release workflow fails
- Check build logs in GitHub Actions
- Verify all required secrets are set
- Ensure `package.json` version matches tag version

## 📚 Next Steps

1. **Set up code signing certificates** (see above)
2. **Create first release** using tag or manual workflow
3. **Test auto-update** with a second release
4. **Add update UI** in renderer to show update notifications
5. **Document release process** for your team

## 🔗 Resources

- [electron-updater docs](https://www.electron.build/auto-update)
- [electron-builder docs](https://www.electron.build/)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)
- [Apple Code Signing Guide](https://developer.apple.com/documentation/security/code_signing_services)

