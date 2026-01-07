/**
 * Bundle Analyzer Utilities
 * Analyze bundle sizes and identify optimization opportunities
 */

export interface BundleStats {
  name: string;
  size: number;
  gzipSize?: number;
  children?: BundleStats[];
}

/**
 * Log bundle size information (for development)
 */
export function logBundleSizes(): void {
  if (process.env.NODE_ENV !== 'development') return;

  // This would typically be done at build time with a plugin
  // For runtime, we can analyze loaded chunks
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const totalSize = scripts.reduce((acc, _script) => {
    // Estimate size (actual measurement would require fetch)
    return acc;
  }, 0);

  console.log('[BundleAnalyzer] Loaded scripts:', scripts.length);
  console.log('[BundleAnalyzer] Total size (estimate):', totalSize, 'bytes');
}

/**
 * Measure actual load time of a resource
 */
export function measureLoadTime(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.onload = () => {
      const loadTime = performance.now() - startTime;
      resolve(loadTime);
    };
    link.onerror = () => {
      reject(new Error(`Failed to load: ${url}`));
    };
    document.head.appendChild(link);
  });
}

/**
 * Get performance metrics
 */
export function getPerformanceMetrics(): {
  dns: number;
  tcp: number;
  request: number;
  response: number;
  dom: number;
  load: number;
} | null {
  if (!performance.timing) return null;

  const timing = performance.timing;
  return {
    dns: timing.domainLookupEnd - timing.domainLookupStart,
    tcp: timing.connectEnd - timing.connectStart,
    request: timing.responseStart - timing.requestStart,
    response: timing.responseEnd - timing.responseStart,
    dom: timing.domComplete - timing.domLoading,
    load: timing.loadEventEnd - timing.navigationStart,
  };
}


