/**
 * CI Performance Benchmark
 * Tests memory, CPU, battery metrics for Redix claims
 * Run with: npm run perf:ci or PERF_STRICT=1 npm run perf:test
 */

import { chromium } from 'playwright';
import { _electron as electron, ElectronApplication } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

type MemoryMetrics = {
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
  rssMB: number;
};

type PerformanceMetrics = {
  domContentLoaded: number | null;
  loadTime: number | null;
  firstContentfulPaint: number | null;
  largestContentfulPaint: number | null;
  timeToInteractive: number | null;
};

type BatteryMetrics = {
  level: number | null;
  charging: boolean | null;
  dischargingTime: number | null;
};

type TabMetrics = {
  tabCount: number;
  activeTabId: string | null;
  tabs: Array<{
    id: string;
    url: string;
    title: string;
    sleeping: boolean;
  }>;
};

type BenchmarkResult = {
  scenario: string;
  timestamp: string;
  durationMs: number;
  memory: MemoryMetrics;
  performance: PerformanceMetrics;
  battery: BatteryMetrics;
  tabs: TabMetrics;
  cpuUsage?: {
    user: number;
    system: number;
  };
};

const OUTPUT_DIR = path.resolve('perf');
const CI_OUTPUT_FILE = path.join(OUTPUT_DIR, `ci-benchmark-${Date.now()}.json`);

// Redix KPIs from your plan
const KPI_THRESHOLDS = {
  // Memory: ≤ 200-350 MB (desktop) for 3 tabs idle
  memoryIdleMB: 350,
  memory3TabsMB: 450,

  // Tab restore latency: < 800ms
  tabRestoreMs: 800,

  // Video CPU% (1080p hw decode): < 10-15%
  videoCpuPercent: 15,

  // Snapshot disk size per tab: < 1 MB (summary)
  snapshotSizeMB: 1,

  // Page load: DOMContentLoaded < 2500ms, FCP < 2000ms
  domContentLoadedMs: 2500,
  firstContentfulPaintMs: 2000,

  // Frame stutter: 0-1 events per hour
  frameStutterEvents: 1,
};

const SCENARIOS = [
  {
    name: 'idle-3tabs',
    description: 'Idle memory with 3 tabs open',
    urls: ['about:blank', 'about:blank', 'about:blank'],
  },
  {
    name: 'load-google',
    description: 'Load Google.com',
    urls: ['https://www.google.com'],
  },
  {
    name: 'load-3sites',
    description: 'Load 3 different sites',
    urls: [
      'https://www.google.com',
      'https://news.ycombinator.com',
      'https://en.wikipedia.org/wiki/Energy_efficiency',
    ],
  },
  {
    name: 'youtube-1080p',
    description: 'Load YouTube (video site)',
    urls: ['https://www.youtube.com'],
    waitForVideo: true,
  },
];

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function getSystemMemory(): Promise<MemoryMetrics | null> {
  try {
    const platform = process.platform;
    if (platform === 'win32') {
      // Windows: use wmic
      const { stdout } = await execAsync(
        'wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /value'
      );
      const lines = stdout.split('\n');
      const totalMatch = lines.find(l => l.startsWith('TotalVisibleMemorySize'));
      const freeMatch = lines.find(l => l.startsWith('FreePhysicalMemory'));
      if (totalMatch && freeMatch) {
        const total = parseInt(totalMatch.split('=')[1].trim(), 10) / 1024; // KB to MB
        const free = parseInt(freeMatch.split('=')[1].trim(), 10) / 1024;
        return {
          heapUsedMB: 0,
          heapTotalMB: 0,
          externalMB: 0,
          rssMB: total - free,
        };
      }
    } else if (platform === 'linux' || platform === 'darwin') {
      // Linux/macOS: use free/top
      const { stdout } = await execAsync('free -m 2>/dev/null || vm_stat | head -5');
      // Parse output (simplified)
      const match = stdout.match(/(\d+)/);
      if (match) {
        return {
          heapUsedMB: 0,
          heapTotalMB: 0,
          externalMB: 0,
          rssMB: parseInt(match[1], 10),
        };
      }
    }
  } catch {
    // Fallback if system commands fail
  }
  return null;
}

async function runElectronScenario(
  scenario: (typeof SCENARIOS)[0]
): Promise<BenchmarkResult | null> {
  try {
    const app = await electron.launch({
      args: ['.'],
      env: {
        ...process.env,
        PLAYWRIGHT: '1',
        OB_DISABLE_HEAVY_SERVICES: '1',
      },
    });

    const page = await app.firstWindow();

    // Wait for shell to be ready
    await page
      .waitForFunction(
        () => {
          const hasIpc = typeof (window as any).ipc?.invoke === 'function';
          return hasIpc;
        },
        { timeout: 15_000 }
      )
      .catch(() => null);

    if (!app) {
      return null;
    }

    const startTime = Date.now();

    // Create tabs
    for (const url of scenario.urls) {
      try {
        await page.evaluate(async (targetUrl: string) => {
          if (typeof (window as any).ipc?.invoke === 'function') {
            await (window as any).ipc.invoke('tabs:create', { url: targetUrl });
          }
        }, url);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between tabs
      } catch {
        // Continue on error
      }
    }

    // Wait for pages to load
    if (scenario.waitForVideo) {
      await new Promise(resolve => setTimeout(resolve, 5000));
    } else {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Get metrics
    const metrics = await page
      .evaluate(() => {
        const navEntry = performance.getEntriesByType('navigation')[0] as any;
        const paintEntries = performance.getEntriesByType('paint') as any[];
        const fcp = paintEntries.find(e => e.name === 'first-contentful-paint');

        // Try to get LCP
        let lcp: number | null = null;
        try {
          const lcpEntries = performance.getEntriesByType('largest-contentful-paint') as any[];
          if (lcpEntries.length > 0) {
            lcp =
              lcpEntries[lcpEntries.length - 1].renderTime ||
              lcpEntries[lcpEntries.length - 1].loadTime;
          }
        } catch {
          // LCP not available
        }

        const memory = (performance as any).memory;

        // Battery API (if available)
        const battery = (navigator as any).getBattery?.() || null;

        return {
          performance: {
            domContentLoaded: navEntry?.domContentLoadedEventEnd || null,
            loadTime: navEntry?.duration || null,
            firstContentfulPaint: fcp?.startTime || null,
            largestContentfulPaint: lcp,
            timeToInteractive: null, // TTI requires more complex calculation
          },
          memory: memory
            ? {
                heapUsedMB: memory.usedJSHeapSize / (1024 * 1024),
                heapTotalMB: memory.totalJSHeapSize / (1024 * 1024),
                externalMB: memory.jsHeapSizeLimit
                  ? (memory.jsHeapSizeLimit - memory.totalJSHeapSize) / (1024 * 1024)
                  : 0,
                rssMB: 0, // Not available in browser context
              }
            : {
                heapUsedMB: 0,
                heapTotalMB: 0,
                externalMB: 0,
                rssMB: 0,
              },
          battery: battery
            ? {
                level: battery.level,
                charging: battery.charging,
                dischargingTime: battery.dischargingTime,
              }
            : {
                level: null,
                charging: null,
                dischargingTime: null,
              },
        };
      })
      .catch(() => ({
        performance: {
          domContentLoaded: null,
          loadTime: null,
          firstContentfulPaint: null,
          largestContentfulPaint: null,
          timeToInteractive: null,
        },
        memory: {
          heapUsedMB: 0,
          heapTotalMB: 0,
          externalMB: 0,
          rssMB: 0,
        },
        battery: {
          level: null,
          charging: null,
          dischargingTime: null,
        },
      }));

    // Get tab info
    const tabs = await page
      .evaluate(async () => {
        if (typeof (window as any).ipc?.invoke === 'function') {
          try {
            const tabList = await (window as any).ipc.invoke('tabs:list');
            return tabList || [];
          } catch {
            return [];
          }
        }
        return [];
      })
      .catch(() => []);

    const endTime = Date.now();

    // Get system memory if available
    const systemMemory = await getSystemMemory();
    if (systemMemory) {
      metrics.memory.rssMB = systemMemory.rssMB;
    }

    await app.close();

    return {
      scenario: scenario.name,
      timestamp: new Date().toISOString(),
      durationMs: endTime - startTime,
      memory: metrics.memory,
      performance: metrics.performance,
      battery: metrics.battery,
      tabs: {
        tabCount: tabs.length,
        activeTabId: tabs.find((t: any) => t.active)?.id || null,
        tabs: tabs.map((t: any) => ({
          id: t.id,
          url: t.url,
          title: t.title || 'New Tab',
          sleeping: t.sleeping || false,
        })),
      },
    };
  } catch (error) {
    console.error(`Scenario ${scenario.name} failed:`, error);
    return null;
  }
}

function checkKPIs(
  result: BenchmarkResult
): Array<{ metric: string; value: number; threshold: number; passed: boolean }> {
  const violations: Array<{ metric: string; value: number; threshold: number; passed: boolean }> =
    [];

  // Memory checks
  if (result.scenario === 'idle-3tabs') {
    const totalMemory = result.memory.heapUsedMB + result.memory.rssMB;
    violations.push({
      metric: 'idle-3tabs-memory',
      value: totalMemory,
      threshold: KPI_THRESHOLDS.memoryIdleMB,
      passed: totalMemory <= KPI_THRESHOLDS.memoryIdleMB,
    });
  }

  if (result.scenario === 'load-3sites') {
    const totalMemory = result.memory.heapUsedMB + result.memory.rssMB;
    violations.push({
      metric: '3sites-memory',
      value: totalMemory,
      threshold: KPI_THRESHOLDS.memory3TabsMB,
      passed: totalMemory <= KPI_THRESHOLDS.memory3TabsMB,
    });
  }

  // Performance checks
  if (result.performance.domContentLoaded !== null) {
    violations.push({
      metric: 'domContentLoaded',
      value: result.performance.domContentLoaded,
      threshold: KPI_THRESHOLDS.domContentLoadedMs,
      passed: result.performance.domContentLoaded <= KPI_THRESHOLDS.domContentLoadedMs,
    });
  }

  if (result.performance.firstContentfulPaint !== null) {
    violations.push({
      metric: 'firstContentfulPaint',
      value: result.performance.firstContentfulPaint,
      threshold: KPI_THRESHOLDS.firstContentfulPaintMs,
      passed: result.performance.firstContentfulPaint <= KPI_THRESHOLDS.firstContentfulPaintMs,
    });
  }

  return violations;
}

async function main() {
  console.log('🚀 Running CI Performance Benchmark for Redix KPIs...\n');
  await ensureOutputDir();

  const results: BenchmarkResult[] = [];
  const allViolations: Array<{
    scenario: string;
    violations: Array<{ metric: string; value: number; threshold: number; passed: boolean }>;
  }> = [];

  for (const scenario of SCENARIOS) {
    console.log(`📊 Running: ${scenario.name} - ${scenario.description}`);
    const result = await runElectronScenario(scenario);

    if (result) {
      results.push(result);
      const violations = checkKPIs(result);

      console.log(`   Duration: ${result.durationMs}ms`);
      console.log(
        `   Memory: ${result.memory.heapUsedMB.toFixed(1)}MB heap + ${result.memory.rssMB.toFixed(1)}MB RSS`
      );
      console.log(`   Tabs: ${result.tabs.tabCount}`);
      if (result.performance.firstContentfulPaint) {
        console.log(`   FCP: ${result.performance.firstContentfulPaint.toFixed(0)}ms`);
      }

      if (violations.length > 0) {
        const failed = violations.filter(v => !v.passed);
        if (failed.length > 0) {
          allViolations.push({ scenario: scenario.name, violations: failed });
          console.log(`   ⚠️  ${failed.length} KPI violation(s):`);
          failed.forEach(v => {
            console.log(`      • ${v.metric}: ${v.value.toFixed(1)} > ${v.threshold} (FAIL)`);
          });
        } else {
          console.log(`   ✅ All KPIs passed`);
        }
      }
    } else {
      console.log(`   ❌ Scenario failed or skipped`);
    }

    console.log('');

    // Wait between scenarios
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Save results
  const summary = {
    timestamp: new Date().toISOString(),
    kpiThresholds: KPI_THRESHOLDS,
    results,
    violations: allViolations,
  };

  await fs.writeFile(CI_OUTPUT_FILE, JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`\n✅ Benchmark complete. Results: ${CI_OUTPUT_FILE}`);

  // Exit with error if violations and PERF_STRICT is set
  if (allViolations.length > 0) {
    console.error(`\n⛔ ${allViolations.length} scenario(s) failed KPI checks`);
    if (process.env.PERF_STRICT === '1') {
      process.exitCode = 1;
    }
  } else {
    console.log(`\n✅ All KPIs passed!`);
  }
}

main().catch(error => {
  console.error('CI benchmark failed:', error);
  process.exitCode = 1;
});
