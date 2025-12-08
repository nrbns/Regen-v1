# Release Checklist

## ✅ Pre-Release Verification

### Build & Packaging

- [ ] **Frontend build succeeds**
  ```bash
  npm run build
  ```
  - Verify `dist/` directory is created
  - Check `dist/index.html` exists
  - Verify assets are bundled

- [ ] **Tauri build succeeds**
  ```bash
  cd tauri-migration
  npm run tauri build
  ```
  - Verify Rust toolchain is installed (`rustup --version`)
  - Check `src-tauri/target/release/bundle/` contains installers
  - Verify installer size is reasonable (< 200MB)

- [ ] **Build verification passes**
  ```bash
  npm run verify:build
  ```
  - All checks should pass
  - No critical errors

### Code Quality

- [ ] **Linting passes**
  ```bash
  npm run lint
  ```

- [ ] **Type checking passes**
  ```bash
  npm run build:types
  ```

- [ ] **Tests pass**
  ```bash
  npm run test:unit
  ```

### Features Verification

- [ ] **Search works**
  - Test production search API
  - Verify results display correctly
  - Check caching works

- [ ] **Summarization works**
  - Test summarize API
  - Verify on-device AI fallback
  - Check cloud fallback

- [ ] **Research Agent works**
  - Test research agent pipeline
  - Verify Search → Fetch → Summarize flow
  - Check error handling

- [ ] **Multilingual support**
  - Test language switching
  - Verify translations load
  - Check query translation

- [ ] **Redix mode**
  - Test Redix mode toggle
  - Verify memory reduction
  - Check tab eviction

- [ ] **Error handling**
  - Test ErrorBoundary
  - Verify Sentry integration
  - Check crash reporting

### Security & Privacy

- [ ] **CSP headers configured**
  - Check `tauri.conf.json` CSP settings
  - Verify no unsafe-eval in production

- [ ] **API keys secured**
  - Verify no keys in code
  - Check `.env.example` is updated
  - Ensure keys are in environment variables

- [ ] **Privacy compliance**
  - Verify consent flows
  - Check data collection transparency
  - Ensure GDPR compliance

## 📦 Release Process

### Step 1: Version Update

1. Update version in `package.json`
2. Update version in `tauri-migration/src-tauri/tauri.conf.json`
3. Update `CHANGELOG.md` with release notes

### Step 2: Build

```bash
# Build frontend
npm run build

# Build Tauri app
cd tauri-migration
npm run tauri build
```

### Step 3: Test Installer

1. Test installer on clean Windows system
2. Verify app launches correctly
3. Test all major features
4. Check for crashes or errors

### Step 4: Create Release

1. Create GitHub release tag
   ```bash
   git tag -a v0.3.0 -m "Release v0.3.0"
   git push origin v0.3.0
   ```

2. Create GitHub Release
   - Go to GitHub → Releases → Draft new release
   - Tag: `v0.3.0`
   - Title: `RegenBrowser v0.3.0`
   - Description: Copy from `CHANGELOG.md`

3. Upload Installer
   - Upload `.exe` or `.msi` from `tauri-migration/src-tauri/target/release/bundle/`
   - Add release notes
   - Publish release

### Step 5: Post-Release

- [ ] **Monitor Sentry**
  - Check for crash reports
  - Monitor error rates
  - Fix critical issues

- [ ] **Update Documentation**
  - Update README.md if needed
  - Update installation instructions
  - Update feature documentation

- [ ] **Announce Release**
  - Post on Product Hunt (if applicable)
  - Share on social media
  - Update website/landing page

## 🐛 Known Issues & Workarounds

### Build Issues

**Issue:** Tauri build fails with Rust errors
- **Solution:** Run `rustup update` and rebuild

**Issue:** Frontend build fails
- **Solution:** Clear `node_modules` and `dist`, reinstall dependencies

**Issue:** Installer too large
- **Solution:** Enable code splitting, remove unused dependencies

### Runtime Issues

**Issue:** App crashes on startup
- **Solution:** Check ErrorBoundary logs, verify Sentry reports

**Issue:** Search API not working
- **Solution:** Verify server is running, check API keys

**Issue:** On-device AI not working
- **Solution:** Verify model is downloaded, check Tauri commands

## 📊 Release Metrics

Track these metrics after release:

- **Crash rate:** Target < 0.1%
- **Search latency:** Target < 3s (cached), < 6s (uncached)
- **Memory usage:** Redix mode < 250MB, Full mode < 600MB
- **User adoption:** Track downloads, active users
- **Error rate:** Monitor Sentry for new errors

## ✅ Launch Criteria

Before public release, ensure:

- [ ] All critical features work
- [ ] No blocking bugs
- [ ] Crash rate < 0.1%
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] Installer tested
- [ ] Release notes written

## 🚀 Quick Release Commands

```bash
# Full production build
npm run build:production

# Verify build
npm run verify:build

# Create release tag
git tag -a v0.3.0 -m "Release v0.3.0"
git push origin v0.3.0
```

The release checklist is ready! Follow these steps for a smooth launch.


