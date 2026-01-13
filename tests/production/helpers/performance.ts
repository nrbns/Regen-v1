/**
 * Performance monitoring helpers for production tests
 */

export interface PerformanceMetrics {
  ram: number; // MB
  cpu: number; // percentage
  timestamp: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private startTime: number = 0;

  start(): void {
    this.startTime = Date.now();
    this.metrics = [];
  }

  record(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {
      ram: this.getRAMUsage(),
      cpu: this.getCPUUsage(),
      timestamp: Date.now() - this.startTime,
    };
    this.metrics.push(metrics);
    return metrics;
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getAverageRAM(): number {
    if (this.metrics.length === 0) return 0;
    const sum = this.metrics.reduce((acc, m) => acc + m.ram, 0);
    return sum / this.metrics.length;
  }

  getMaxRAM(): number {
    if (this.metrics.length === 0) return 0;
    return Math.max(...this.metrics.map(m => m.ram));
  }

  getAverageCPU(): number {
    if (this.metrics.length === 0) return 0;
    const sum = this.metrics.reduce((acc, m) => acc + m.cpu, 0);
    return sum / this.metrics.length;
  }

  getMaxCPU(): number {
    if (this.metrics.length === 0) return 0;
    return Math.max(...this.metrics.map(m => m.cpu));
  }

  hasMemoryLeak(thresholdMB: number = 100): boolean {
    if (this.metrics.length < 2) return false;
    const first = this.metrics[0].ram;
    const last = this.metrics[this.metrics.length - 1].ram;
    return last - first > thresholdMB;
  }

  private getRAMUsage(): number {
    // In browser: performance.memory?.usedJSHeapSize / 1024 / 1024
    // In Node: process.memoryUsage().heapUsed / 1024 / 1024
    if (typeof process !== 'undefined') {
      return process.memoryUsage().heapUsed / 1024 / 1024;
    }
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return ((performance as any).memory.usedJSHeapSize) / 1024 / 1024;
    }
    return 0;
  }

  private getCPUUsage(): number {
    // CPU usage is harder to measure in JS
    // This is a placeholder - real implementation would use system APIs
    return 0;
  }
}

export function measureTabSwitchTime(switchFn: () => Promise<void>): Promise<number> {
  return new Promise(async (resolve) => {
    const start = performance.now();
    await switchFn();
    const end = performance.now();
    resolve(end - start);
  });
}

export function measurePageLoadTime(loadFn: () => Promise<void>): Promise<number> {
  return new Promise(async (resolve) => {
    const start = performance.now();
    await loadFn();
    const end = performance.now();
    resolve(end - start);
  });
}
