export function recordMetric(type: string, value: number): void;
export function getMetrics(): {
  uptime: number;
  memory: NodeJS.MemoryUsage;
  performance: {
    tabCreation: number[];
    ipcLatency: number[];
    agentExecution: number[];
  };
  counts: {
    tabs: number;
    agents: number;
    workers: number;
  };
  averages: {
    tabCreation: number;
    ipcLatency: number;
    agentExecution: number;
  };
  timestamp: string;
};
export function updateCounts(
  counts: Partial<{ tabs: number; agents: number; workers: number }>
): void;

