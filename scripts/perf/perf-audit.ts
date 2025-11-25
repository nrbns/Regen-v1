import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

type ScenarioResult = {
  scenario: string;
  url: string;
  durationMs: number;
  metrics: {
    heapUsedMB: number | null;
    heapTotalMB: number | null;
    domContentLoaded: number | null;
    loadTime: number | null;
    firstContentfulPaint: number | null;
    cpuTime: number | null;
  };
};

const SCENARIOS: Array<{ name: string; url: string }> = [
  { name: 'news-lite', url: 'https://lite.cnn.com/' },
  { name: 'reference-wiki', url: 'https://en.wikipedia.org/wiki/Energy_efficiency' },
  { name: 'research-hacker-news', url: 'https://news.ycombinator.com/' },
];

const OUTPUT_DIR = path.resolve('perf');
const OUTPUT_FILE = path.join(OUTPUT_DIR, `latest-${Date.now()}.json`);

const PERF_BUDGETS = {
  durationMs: 4000,
  domContentLoaded: 2500,
  loadTime: 3500,
  firstContentfulPaint: 2000,
  heapUsedMB: 256,
};

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function runScenario(name: string, url: string) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();
  const start = Date.now();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const metrics = await page.evaluate(() => {
    const navEntry = performance.getEntriesByType('navigation')[0] as any;
    const paintEntries = performance.getEntriesByType('paint') as any[];
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    const memory = (
      performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }
    ).memory;
    const cpu = (performance as unknown as { now?: () => number }).now?.() ?? null;

    return {
      domContentLoaded: navEntry?.domContentLoadedEventEnd ?? null,
      loadTime: navEntry?.duration ?? null,
      firstContentfulPaint: fcp?.startTime ?? null,
      heapUsedMB: memory?.usedJSHeapSize ? memory.usedJSHeapSize / (1024 * 1024) : null,
      heapTotalMB: memory?.totalJSHeapSize ? memory.totalJSHeapSize / (1024 * 1024) : null,
      cpuTime: cpu,
    };
  });

  const end = Date.now();
  await browser.close();

  const result: ScenarioResult = {
    scenario: name,
    url,
    durationMs: end - start,
    metrics: {
      heapUsedMB: metrics.heapUsedMB,
      heapTotalMB: metrics.heapTotalMB,
      domContentLoaded: metrics.domContentLoaded,
      loadTime: metrics.loadTime,
      firstContentfulPaint: metrics.firstContentfulPaint,
      cpuTime: metrics.cpuTime,
    },
  };

  return result;
}

function formatNumber(value: number | null, digits = 2): string {
  if (value === null || Number.isNaN(value)) {
    return 'n/a';
  }
  return value.toFixed(digits);
}

function budgetViolations(result: ScenarioResult): string[] {
  const violations: string[] = [];
  if (result.durationMs > PERF_BUDGETS.durationMs) {
    violations.push(
      `duration ${result.durationMs.toFixed(0)}ms > budget ${PERF_BUDGETS.durationMs}ms`
    );
  }
  const { metrics } = result;
  if (
    metrics.domContentLoaded !== null &&
    metrics.domContentLoaded > PERF_BUDGETS.domContentLoaded
  ) {
    violations.push(
      `DOMContentLoaded ${metrics.domContentLoaded.toFixed(0)}ms > ${PERF_BUDGETS.domContentLoaded}ms`
    );
  }
  if (metrics.loadTime !== null && metrics.loadTime > PERF_BUDGETS.loadTime) {
    violations.push(`load ${metrics.loadTime.toFixed(0)}ms > ${PERF_BUDGETS.loadTime}ms`);
  }
  if (
    metrics.firstContentfulPaint !== null &&
    metrics.firstContentfulPaint > PERF_BUDGETS.firstContentfulPaint
  ) {
    violations.push(
      `FCP ${metrics.firstContentfulPaint.toFixed(0)}ms > ${PERF_BUDGETS.firstContentfulPaint}ms`
    );
  }
  if (metrics.heapUsedMB !== null && metrics.heapUsedMB > PERF_BUDGETS.heapUsedMB) {
    violations.push(`heap ${metrics.heapUsedMB.toFixed(1)}MB > ${PERF_BUDGETS.heapUsedMB}MB`);
  }
  return violations;
}

async function main() {
  console.log('🔍 Running Regen performance audit scenarios...');
  await ensureOutputDir();
  const results: ScenarioResult[] = [];
  const failures: Array<{ scenario: string; issues: string[] }> = [];

  for (const scenario of SCENARIOS) {
    console.log(`  • ${scenario.name} → ${scenario.url}`);
    try {
      const result = await runScenario(scenario.name, scenario.url);
      results.push(result);
      console.log(
        `    duration=${formatNumber(result.durationMs, 0)}ms heap=${formatNumber(result.metrics.heapUsedMB)}MB FCP=${formatNumber(result.metrics.firstContentfulPaint)}ms`
      );
      const issues = budgetViolations(result);
      if (issues.length > 0) {
        failures.push({ scenario: scenario.name, issues });
        issues.forEach(issue => console.warn(`    ⚠ budget violation: ${issue}`));
      }
    } catch (error) {
      console.error(`    ✖ scenario failed: ${(error as Error).message}`);
    }
  }

  if (results.length === 0) {
    console.error('No scenarios completed successfully.');
    process.exitCode = 1;
    return;
  }

  const summary = {
    timestamp: new Date().toISOString(),
    results,
  };

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`\n✅ Performance audit complete. Results written to ${OUTPUT_FILE}`);

  if (failures.length > 0) {
    console.error('\n⛔ Performance budgets exceeded:');
    failures.forEach(({ scenario, issues }) => {
      console.error(`  - ${scenario}:`);
      issues.forEach(issue => console.error(`      • ${issue}`));
    });
    // In CI/dev we only log budget violations; do not fail the process
    // so that perf audits are informative but non-blocking.
    // If you want strict enforcement, call this script directly with
    // PERF_STRICT=1 and handle exitCode in a separate pipeline.
    if (process.env.PERF_STRICT === '1') {
      process.exitCode = 1;
    }
  }
}

main().catch(error => {
  console.error('Performance audit failed:', error);
  process.exitCode = 1;
});
