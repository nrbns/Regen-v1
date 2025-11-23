/**
 * Metrics Server
 * Provides /metrics endpoint for observability (Prometheus-compatible format)
 */

import { createServer, Server } from 'http';
import { createLogger } from './utils/logger';
import { getPerformanceStats } from './performance/markers';

const log = createLogger('metrics-server');

let server: Server | null = null;
const PORT = 9090; // Default Prometheus port

/**
 * Format metrics in Prometheus format
 */
function formatMetrics(): string {
  const lines: string[] = [];

  // Performance markers
  const ipcStats = getPerformanceStats('ipc');
  if (ipcStats.count > 0) {
    lines.push(`# HELP ipc_latency_seconds IPC call latency in seconds`);
    lines.push(`# TYPE ipc_latency_seconds summary`);
    lines.push(`ipc_latency_seconds{quantile="0.5"} ${ipcStats.avgDuration / 1000}`);
    lines.push(`ipc_latency_seconds{quantile="0.95"} ${ipcStats.p95Duration / 1000}`);
    lines.push(`ipc_latency_seconds_sum ${(ipcStats.avgDuration * ipcStats.count) / 1000}`);
    lines.push(`ipc_latency_seconds_count ${ipcStats.count}`);
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  lines.push(`# HELP process_memory_bytes Process memory usage in bytes`);
  lines.push(`# TYPE process_memory_bytes gauge`);
  lines.push(`process_memory_bytes{type="heapUsed"} ${memUsage.heapUsed}`);
  lines.push(`process_memory_bytes{type="heapTotal"} ${memUsage.heapTotal}`);
  lines.push(`process_memory_bytes{type="external"} ${memUsage.external}`);
  lines.push(`process_memory_bytes{type="rss"} ${memUsage.rss}`);

  // Uptime
  const uptime = process.uptime();
  lines.push(`# HELP process_uptime_seconds Process uptime in seconds`);
  lines.push(`# TYPE process_uptime_seconds gauge`);
  lines.push(`process_uptime_seconds ${uptime}`);

  return lines.join('\n') + '\n';
}

/**
 * Start metrics server
 */
export function startMetricsServer(): void {
  if (server) {
    log.warn('Metrics server already running');
    return;
  }

  server = createServer((req, res) => {
    if (req.url === '/metrics' && req.method === 'GET') {
      try {
        const metrics = formatMetrics();
        res.writeHead(200, {
          'Content-Type': 'text/plain; version=0.0.4',
        });
        res.end(metrics);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        log.error('Failed to generate metrics', { error: err.message });
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(PORT, '127.0.0.1', () => {
    log.info('Metrics server started', { port: PORT, url: `http://127.0.0.1:${PORT}/metrics` });
  });

  server.on('error', error => {
    log.error('Metrics server error', { error: error.message });
  });
}

/**
 * Stop metrics server
 */
export function stopMetricsServer(): void {
  if (server) {
    server.close();
    server = null;
    log.info('Metrics server stopped');
  }
}
