# CI/CD Quality Gates

This document outlines the enforced quality gates for Regen Browser.

## 🔒 Quality Gate Enforcement

All code changes **MUST** pass these gates before merge:

### 1. Pre-Commit (Local)

- ✅ **ESLint** - Code quality and best practices
- ✅ **Prettier** - Code formatting
- ✅ **TypeScript** - Type checking
- ✅ **Unit Tests** - Fast feedback on staged changes

### 2. CI Pipeline (GitHub Actions)

#### Stage 1: Lint & Type Check

- ESLint validation
- TypeScript compilation check
- **Status:** Required ✅

#### Stage 2: Format Check

- Prettier format validation
- Ensures consistent code style
- **Status:** Required ✅

#### Stage 3: Unit & Integration Tests

- Full test suite execution
- Code coverage reporting
- **Status:** Required ✅
- **Minimum Coverage:** 70%

#### Stage 4: Security Scans

- Snyk vulnerability scanning
- TruffleHog secret detection
- **Status:** Advisory ⚠️ (non-blocking)

#### Stage 5: Build

- Frontend build
- Backend build
- Docker image creation
- **Status:** Required ✅

#### Stage 6: E2E Tests

- Playwright end-to-end tests
- Full user flow validation
- **Status:** Required ✅

#### Stage 7: K6 Load Tests (CRITICAL 🚨)

- **100 concurrent users**
- **WebSocket stress testing**
- **Redis persistence validation**
- **Worker crash recovery**
- **Status:** Required ✅

Load test thresholds:

```javascript
{
  http_req_duration: ['p(95)<500ms'],  // 95% under 500ms
  ws_connection_success: ['rate>0.95'], // 95% success
  errors: ['rate<0.05'],                // <5% error rate
}
```

## 🚫 Bypass Prevention

### Cannot Bypass

- `git commit --no-verify` is **tracked and flagged** in CI
- Direct pushes to `main`/`develop` are **blocked**
- All PRs **must pass CI** before merge
- No emergency bypass mechanism exists

### Protected Branches

- `main` - Production releases only
- `develop` - Integration branch
- All changes via **Pull Requests**

## 📊 Quality Metrics Dashboard

View real-time status:

- **CI Status:** [GitHub Actions](https://github.com/your-org/regen/actions)
- **Code Coverage:** [Codecov](https://codecov.io/gh/your-org/regen)
- **Performance:** [Benchmark History](https://your-org.github.io/regen/benchmarks)

## 🔧 Local Development

### Run All Checks Locally

```bash
# Before committing
npm run test:all

# Full CI simulation
npm run ci:validate
```

### Individual Checks

```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm run test:unit     # Unit tests
npm run test:e2e      # E2E tests
npm run test:load     # K6 load tests
```

## 🚨 Failed Build Resolution

### If Lint Fails

```bash
npm run lint -- --fix
```

### If Format Check Fails

```bash
npx prettier --write .
```

### If Tests Fail

- Fix failing tests
- Do NOT skip tests
- Do NOT lower thresholds

### If K6 Load Tests Fail

This is **CRITICAL** - indicates:

- Realtime instability
- Memory leaks
- Race conditions
- **DO NOT MERGE** until resolved

## 📝 Adding New Quality Gates

To add a new gate:

1. Add to `.github/workflows/main.yml`
2. Update `needs:` dependencies
3. Add to `status` job check
4. Document here
5. Announce to team

## 🎯 Launch Readiness Criteria

**NOT READY FOR LAUNCH** until:

- ✅ All CI gates passing
- ✅ K6 load tests pass 100 concurrent users
- ✅ Chaos tests pass (worker crash/restart)
- ✅ Code coverage >70%
- ✅ Zero critical security issues

## 🆘 Emergency Override

**There is NO emergency override.**

Quality gates exist to prevent:

- Silent failures
- Production bugs
- Bad user experience
- Credibility damage

If you need to bypass gates, you need to:

1. **Fix the underlying issue**
2. **Add tests to prevent recurrence**
3. **Get explicit team approval**

---

**Remember:** Bypassing quality gates today = firefighting tomorrow.
