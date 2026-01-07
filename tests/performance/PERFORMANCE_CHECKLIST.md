# Performance Checklist & Scripts

**Last Updated**: December 2025  
**Purpose**: Automated performance testing for Regen Browser

---

## 📋 Performance Checklist

### Quick Wins (Sprint 0)

#### Initial Load Performance

- [ ] **Time to Interactive (TTI)**: < 3s
  - ✅ Target: 3s on low-end device (4GB RAM, 3G network)
  - ❌ Fail: > 5s
  - **Tool**: Lighthouse CI
  - **Script**: `npm run perf:tti`

- [ ] **First Contentful Paint (FCP)**: < 1.5s
  - ✅ Target: 1.5s
  - ❌ Fail: > 2.5s
  - **Tool**: Lighthouse CI
  - **Script**: `npm run perf:fcp`

- [ ] **JS Bundle Size**: < 500KB gzipped
  - ✅ Target: 500KB
  - ❌ Fail: > 700KB
  - **Tool**: Bundle analyzer
  - **Script**: `npm run perf:bundle-size`

- [ ] **CSS Bundle Size**: < 50KB gzipped
  - ✅ Target: 50KB
  - ❌ Fail: > 80KB
  - **Tool**: Bundle analyzer
  - **Script**: `npm run perf:css-size`

#### Runtime Performance

- [ ] **Memory per Tab**: < 100MB average
  - ✅ Target: 100MB
  - ❌ Fail: > 150MB
  - **Tool**: Chrome DevTools Performance Monitor
  - **Script**: `npm run perf:memory`

- [ ] **Crash Rate**: < 1% of sessions
  - ✅ Target: 1%
  - ❌ Fail: > 2%
  - **Tool**: Crash reporting (Sentry)
  - **Script**: Monitor in production

- [ ] **Jank Rate**: < 1% (smooth scrolling)
  - ✅ Target: 1%
  - ❌ Fail: > 3%
  - **Tool**: Chrome DevTools Performance
  - **Script**: `npm run perf:jank`

---

### Medium Term (Sprint 1-2)

#### Tab Management Performance

- [ ] **Tab Resume Time**: < 1s
  - ✅ Target: 1s
  - ❌ Fail: > 2s
  - **Tool**: Custom performance test
  - **Script**: `npm run perf:tab-resume`

- [ ] **Average Memory per Workspace**: < 200MB
  - ✅ Target: 200MB
  - ❌ Fail: > 300MB
  - **Tool**: Chrome DevTools Memory Profiler
  - **Script**: `npm run perf:workspace-memory`

- [ ] **Tab Suspension Time**: < 500ms
  - ✅ Target: 500ms
  - ❌ Fail: > 1s
  - **Tool**: Custom performance test
  - **Script**: `npm run perf:tab-suspend`

#### Network Performance

- [ ] **Blocked Requests per Page**: > 30%
  - ✅ Target: 30% (ad/tracker blocking)
  - ❌ Fail: < 20%
  - **Tool**: Chrome DevTools Network
  - **Script**: `npm run perf:blocked-requests`

- [ ] **Bandwidth Saved (Low-Data Mode)**: > 50%
  - ✅ Target: 50% reduction
  - ❌ Fail: < 30%
  - **Tool**: Chrome DevTools Network
  - **Script**: `npm run perf:bandwidth`

---

### Long-Term (Sprint 3+)

#### AI Features Performance

- [ ] **Summarizer Response Time**: < 2s
  - ✅ Target: 2s
  - ❌ Fail: > 5s
  - **Tool**: Custom performance test
  - **Script**: `npm run perf:summarizer`

- [ ] **Reading Mode Load Time**: < 500ms
  - ✅ Target: 500ms
  - ❌ Fail: > 1s
  - **Tool**: Custom performance test
  - **Script**: `npm run perf:reading-mode`

#### User Engagement

- [ ] **7-Day Retention**: > 60%
  - ✅ Target: 60%
  - ❌ Fail: < 40%
  - **Tool**: Analytics
  - **Script**: Monitor in production

- [ ] **Average Daily Sessions**: > 3
  - ✅ Target: 3 sessions/day
  - ❌ Fail: < 2
  - **Tool**: Analytics
  - **Script**: Monitor in production

---

## 🔧 Automated Performance Scripts

### Setup

```bash
# Install dependencies
npm install --save-dev lighthouse @lhci/cli chrome-launcher
```

### Scripts to Add to `package.json`

```json
{
  "scripts": {
    "perf:tti": "node tests/performance/lighthouse-tti.js",
    "perf:fcp": "node tests/performance/lighthouse-fcp.js",
    "perf:bundle-size": "node tests/performance/bundle-size.js",
    "perf:css-size": "node tests/performance/css-size.js",
    "perf:memory": "node tests/performance/memory-monitor.js",
    "perf:jank": "node tests/performance/jank-test.js",
    "perf:all": "npm run perf:tti && npm run perf:fcp && npm run perf:bundle-size && npm run perf:css-size && npm run perf:memory",
    "perf:ci": "lhci autorun"
  }
}
```

---

## 📝 Script Implementations

### 1. Lighthouse CI Configuration

**File**: `.lighthouserc.js`

```javascript
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:5173'],
      numberOfRuns: 3,
      settings: {
        emulatedFormFactor: 'mobile',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4, // 3G
          cpuSlowdownMultiplier: 4,
        },
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
        interactive: ['error', { maxNumericValue: 3000 }],
        'total-byte-weight': ['error', { maxNumericValue: 500000 }], // 500KB
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

---

### 2. Bundle Size Check

**File**: `tests/performance/bundle-size.js`

```javascript
const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

const DIST_DIR = path.join(__dirname, '../../dist');
const MAX_SIZE = 500 * 1024; // 500KB

function getBundleSize(filePath) {
  const content = fs.readFileSync(filePath);
  const gzipped = gzipSync(content);
  return gzipped.length;
}

function checkBundleSize() {
  const jsFiles = fs
    .readdirSync(DIST_DIR)
    .filter(file => file.endsWith('.js'))
    .map(file => path.join(DIST_DIR, file));

  let totalSize = 0;
  const sizes = {};

  jsFiles.forEach(file => {
    const size = getBundleSize(file);
    const fileName = path.basename(file);
    sizes[fileName] = size;
    totalSize += size;
  });

  console.log('\n📦 Bundle Size Report:');
  console.log('=====================\n');

  Object.entries(sizes).forEach(([file, size]) => {
    const sizeKB = (size / 1024).toFixed(2);
    const status = size > MAX_SIZE ? '❌' : '✅';
    console.log(`${status} ${file}: ${sizeKB} KB`);
  });

  console.log(`\nTotal: ${(totalSize / 1024).toFixed(2)} KB\n`);

  if (totalSize > MAX_SIZE) {
    console.error(`❌ FAIL: Total bundle size exceeds ${MAX_SIZE / 1024}KB`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: Bundle size under ${MAX_SIZE / 1024}KB`);
    process.exit(0);
  }
}

checkBundleSize();
```

---

### 3. Memory Monitor

**File**: `tests/performance/memory-monitor.js`

```javascript
const { chromium } = require('playwright');

const MAX_MEMORY_PER_TAB = 100 * 1024 * 1024; // 100MB

async function measureMemoryPerTab() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to app
  await page.goto('http://localhost:5173');

  // Open 5 tabs
  const tabs = [];
  for (let i = 0; i < 5; i++) {
    const newPage = await context.newPage();
    await newPage.goto('http://localhost:5173');
    tabs.push(newPage);
  }

  // Measure memory
  const memoryMetrics = [];
  for (const tab of tabs) {
    const metrics = await tab.evaluate(() => {
      return performance.memory
        ? {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
          }
        : null;
    });
    if (metrics) {
      memoryMetrics.push(metrics.usedJSHeapSize);
    }
  }

  const avgMemory = memoryMetrics.reduce((a, b) => a + b, 0) / memoryMetrics.length;

  console.log('\n💾 Memory Per Tab Report:');
  console.log('=========================\n');
  console.log(`Average: ${(avgMemory / 1024 / 1024).toFixed(2)} MB\n`);

  if (avgMemory > MAX_MEMORY_PER_TAB) {
    console.error(`❌ FAIL: Average memory per tab exceeds ${MAX_MEMORY_PER_TAB / 1024 / 1024}MB`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: Average memory per tab under ${MAX_MEMORY_PER_TAB / 1024 / 1024}MB`);
    process.exit(0);
  }

  await browser.close();
}

measureMemoryPerTab().catch(console.error);
```

---

### 4. Jank Test

**File**: `tests/performance/jank-test.js`

```javascript
const { chromium } = require('playwright');

const MAX_JANK_RATE = 0.01; // 1%

async function measureJank() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:5173');

  // Measure frame rendering
  const frameTimings = [];
  let lastFrameTime = Date.now();

  await page.evaluate(() => {
    let frameCount = 0;
    let droppedFrames = 0;

    function measureFrame() {
      const now = Date.now();
      const delta = now - lastFrameTime;

      if (delta > 20) {
        // Frame should be ~16.67ms (60fps)
        droppedFrames++;
      }

      frameCount++;
      lastFrameTime = now;

      if (frameCount < 300) {
        // Measure for 5 seconds (300 frames)
        requestAnimationFrame(measureFrame);
      } else {
        return { frameCount, droppedFrames };
      }
    }

    requestAnimationFrame(measureFrame);
  });

  // Scroll page to trigger rendering
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });

  await page.waitForTimeout(1000);

  const jankRate = droppedFrames / frameCount;

  console.log('\n🎬 Jank Rate Report:');
  console.log('===================\n');
  console.log(`Dropped Frames: ${droppedFrames}`);
  console.log(`Total Frames: ${frameCount}`);
  console.log(`Jank Rate: ${(jankRate * 100).toFixed(2)}%\n`);

  if (jankRate > MAX_JANK_RATE) {
    console.error(`❌ FAIL: Jank rate exceeds ${MAX_JANK_RATE * 100}%`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: Jank rate under ${MAX_JANK_RATE * 100}%`);
    process.exit(0);
  }

  await browser.close();
}

measureJank().catch(console.error);
```

---

## 🔄 CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/performance.yml`

```yaml
name: Performance Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Start server
        run: npm run preview &

      - name: Wait for server
        run: npx wait-on http://localhost:4173

      - name: Run performance tests
        run: npm run perf:all

      - name: Run Lighthouse CI
        run: npm run perf:ci
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

---

## 📊 Performance Dashboard

### Metrics to Track Daily

1. **TTI** (Time to Interactive)
2. **FCP** (First Contentful Paint)
3. **Bundle Size** (JS + CSS)
4. **Memory per Tab**
5. **Crash Rate**
6. **Jank Rate**

### Tools

- **Lighthouse CI**: Automated performance testing
- **Chrome DevTools**: Manual profiling
- **Bundle Analyzer**: Bundle size visualization
- **Sentry**: Crash reporting

---

## ✅ Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] All performance tests pass (TTI, FCP, bundle size, memory)
- [ ] Lighthouse score > 80
- [ ] No performance regressions from previous version
- [ ] Memory usage within budget (< 100MB per tab)
- [ ] Crash rate < 1%

---

**Last Updated**: December 2025  
**Next Review**: After Sprint 0 completion
