/**
 * Orchestrator Agent Load Balancer (Week 6)
 * Distributes plan execution across multiple agent instances with health monitoring
 */

import { AgentType } from '../intentRouter';

export interface AgentInstance {
  id: string;
  type: AgentType;
  endpoint: string;
  capacity: number;
  currentLoad: number;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number; // Average in ms
  successRate: number; // 0-1
  lastHealthCheck: Date;
  failureCount: number;
  totalRequests: number;
  metadata?: Record<string, any>;
}

export interface LoadBalancingStrategy {
  name: 'round-robin' | 'least-connections' | 'weighted' | 'health-based';
  weights?: Record<string, number>;
}

export interface HealthCheckConfig {
  interval: number; // ms
  timeout: number; // ms
  unhealthyThreshold: number; // consecutive failures
  healthyThreshold: number; // consecutive successes
  degradedThreshold: number; // success rate below this (0-1)
}

export interface LoadBalancerMetrics {
  totalInstances: number;
  healthyInstances: number;
  degradedInstances: number;
  unhealthyInstances: number;
  totalCapacity: number;
  totalLoad: number;
  utilizationRate: number; // 0-1
  avgSuccessRate: number;
  avgResponseTime: number;
  requestsPerSecond: number;
}

export class AgentLoadBalancer {
  private instances: Map<string, AgentInstance> = new Map();
  private strategy: LoadBalancingStrategy;
  private roundRobinIndex: Map<AgentType, number> = new Map();
  private healthCheckConfig: HealthCheckConfig;
  private healthCheckInterval?: NodeJS.Timeout;
  private requestCounter: Map<string, number> = new Map();
  private lastMetricsTime: number = Date.now();

  constructor(
    strategy: LoadBalancingStrategy = { name: 'least-connections' },
    healthCheckConfig?: Partial<HealthCheckConfig>
  ) {
    this.strategy = strategy;
    this.healthCheckConfig = {
      interval: healthCheckConfig?.interval || 30000, // 30s
      timeout: healthCheckConfig?.timeout || 5000, // 5s
      unhealthyThreshold: healthCheckConfig?.unhealthyThreshold || 3,
      healthyThreshold: healthCheckConfig?.healthyThreshold || 2,
      degradedThreshold: healthCheckConfig?.degradedThreshold || 0.9,
    };
  }

  /**
   * Start health check monitoring
   */
  startHealthChecks(): void {
    if (this.healthCheckInterval) {
      return; // Already started
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.healthCheckConfig.interval);

    console.log('[LoadBalancer] Health checks started');
  }

  /**
   * Stop health check monitoring
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      console.log('[LoadBalancer] Health checks stopped');
    }
  }

  /**
   * Perform health checks on all instances
   */
  private async performHealthChecks(): Promise<void> {
    const instances = Array.from(this.instances.values());

    await Promise.all(
      instances.map(async instance => {
        try {
          const startTime = Date.now();
          await this.checkInstanceHealth(instance);
          const responseTime = Date.now() - startTime;

          // Update response time (exponential moving average)
          instance.responseTime = instance.responseTime * 0.7 + responseTime * 0.3;

          // Check if instance should be marked degraded
          if (instance.successRate < this.healthCheckConfig.degradedThreshold) {
            instance.healthStatus = 'degraded';
          } else if (instance.healthStatus === 'degraded') {
            // Recover to healthy if success rate improves
            instance.healthStatus = 'healthy';
          }

          instance.lastHealthCheck = new Date();
        } catch {
          instance.failureCount++;

          if (instance.failureCount >= this.healthCheckConfig.unhealthyThreshold) {
            instance.healthStatus = 'unhealthy';
            console.warn(
              `[LoadBalancer] Instance ${instance.id} marked unhealthy after ${instance.failureCount} failures`
            );
          }
        }
      })
    );
  }

  /**
   * Check health of a single instance
   */
  private async checkInstanceHealth(_instance: AgentInstance): Promise<void> {
    // Mock health check - in production, this would ping the endpoint
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate occasional failures
        if (Math.random() > 0.95) {
          reject(new Error('Health check failed'));
        } else {
          resolve();
        }
      }, 10);
    });
  }

  /**
   * Register agent instance
   */
  registerInstance(instance: AgentInstance): void {
    // Set defaults if not provided
    const fullInstance: AgentInstance = {
      ...instance,
      failureCount: instance.failureCount || 0,
      totalRequests: instance.totalRequests || 0,
      healthStatus: instance.healthStatus || 'healthy',
      successRate: instance.successRate || 1.0,
      responseTime: instance.responseTime || 0,
      lastHealthCheck: instance.lastHealthCheck || new Date(),
    };

    this.instances.set(fullInstance.id, fullInstance);
    this.requestCounter.set(fullInstance.id, 0);

    console.log(
      `[LoadBalancer] Registered ${fullInstance.type} instance: ${fullInstance.id} at ${fullInstance.endpoint}`
    );
  }

  /**
   * Unregister agent instance
   */
  unregisterInstance(instanceId: string): boolean {
    const removed = this.instances.delete(instanceId);
    this.requestCounter.delete(instanceId);

    if (removed) {
      console.log(`[LoadBalancer] Unregistered instance: ${instanceId}`);
    }

    return removed;
  }

  /**
   * Get instance by ID
   */
  getInstance(instanceId: string): AgentInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * List all instances
   */
  listInstances(agentType?: AgentType): AgentInstance[] {
    const instances = Array.from(this.instances.values());

    if (agentType) {
      return instances.filter(i => i.type === agentType);
    }

    return instances;
  }

  /**
   * Select best instance for task
   */
  selectInstance(agentType: AgentType): AgentInstance | null {
    const candidates = Array.from(this.instances.values()).filter(
      i => i.type === agentType && i.healthStatus !== 'unhealthy' && i.currentLoad < i.capacity
    );

    if (candidates.length === 0) {
      console.warn(`[LoadBalancer] No available instances for ${agentType}`);
      return null;
    }

    // Prefer healthy over degraded
    const healthy = candidates.filter(i => i.healthStatus === 'healthy');
    const finalCandidates = healthy.length > 0 ? healthy : candidates;

    let selected: AgentInstance;

    switch (this.strategy.name) {
      case 'round-robin':
        selected = this.selectRoundRobin(finalCandidates, agentType);
        break;
      case 'least-connections':
        selected = this.selectLeastConnections(finalCandidates);
        break;
      case 'weighted':
        selected = this.selectWeighted(finalCandidates);
        break;
      case 'health-based':
        selected = this.selectHealthBased(finalCandidates);
        break;
      default:
        selected = finalCandidates[0];
    }

    // Increment load and request counter
    selected.currentLoad++;
    selected.totalRequests++;
    this.requestCounter.set(selected.id, (this.requestCounter.get(selected.id) || 0) + 1);

    return selected;
  }

  /**
   * Release instance after task completion
   */
  releaseInstance(instanceId: string, success: boolean, responseTime: number): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    // Decrement load
    instance.currentLoad = Math.max(0, instance.currentLoad - 1);

    // Update success rate (exponential moving average)
    const successValue = success ? 1.0 : 0.0;
    instance.successRate = instance.successRate * 0.9 + successValue * 0.1;

    // Update response time (exponential moving average)
    instance.responseTime = instance.responseTime * 0.8 + responseTime * 0.2;

    // Reset failure count on success
    if (success) {
      instance.failureCount = Math.max(0, instance.failureCount - 1);
    } else {
      instance.failureCount++;
    }

    // Check health status
    if (instance.failureCount >= this.healthCheckConfig.unhealthyThreshold) {
      instance.healthStatus = 'unhealthy';
    } else if (instance.successRate < this.healthCheckConfig.degradedThreshold) {
      instance.healthStatus = 'degraded';
    } else if (
      instance.failureCount === 0 &&
      instance.successRate >= this.healthCheckConfig.degradedThreshold
    ) {
      instance.healthStatus = 'healthy';
    }
  }

  /**
   * Update instance metrics
   */
  updateMetrics(
    instanceId: string,
    metrics: {
      currentLoad?: number;
      responseTime?: number;
      successRate?: number;
      healthStatus?: 'healthy' | 'degraded' | 'unhealthy';
    }
  ): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    Object.assign(instance, metrics, { lastHealthCheck: new Date() });
  }

  /**
   * Set load balancing strategy
   */
  setStrategy(strategy: LoadBalancingStrategy): void {
    this.strategy = strategy;
    console.log(`[LoadBalancer] Strategy changed to: ${strategy.name}`);
  }

  /**
   * Get current strategy
   */
  getStrategy(): LoadBalancingStrategy {
    return { ...this.strategy };
  }

  /**
   * Get instance stats
   */
  getStats(agentType?: AgentType): LoadBalancerMetrics {
    const filtered = agentType
      ? Array.from(this.instances.values()).filter(i => i.type === agentType)
      : Array.from(this.instances.values());

    const totalCapacity = filtered.reduce((sum, i) => sum + i.capacity, 0);
    const totalLoad = filtered.reduce((sum, i) => sum + i.currentLoad, 0);

    // Calculate requests per second
    const now = Date.now();
    const timeDelta = (now - this.lastMetricsTime) / 1000; // seconds
    const totalRequests = filtered.reduce((sum, i) => this.requestCounter.get(i.id) || 0, 0);
    const requestsPerSecond = timeDelta > 0 ? totalRequests / timeDelta : 0;

    // Reset counters
    this.lastMetricsTime = now;
    filtered.forEach(i => this.requestCounter.set(i.id, 0));

    return {
      totalInstances: filtered.length,
      healthyInstances: filtered.filter(i => i.healthStatus === 'healthy').length,
      degradedInstances: filtered.filter(i => i.healthStatus === 'degraded').length,
      unhealthyInstances: filtered.filter(i => i.healthStatus === 'unhealthy').length,
      totalCapacity,
      totalLoad,
      utilizationRate: totalCapacity > 0 ? totalLoad / totalCapacity : 0,
      avgSuccessRate: filtered.reduce((sum, i) => sum + i.successRate, 0) / filtered.length || 0,
      avgResponseTime: filtered.reduce((sum, i) => sum + i.responseTime, 0) / filtered.length || 0,
      requestsPerSecond,
    };
  }

  /**
   * Get detailed metrics for all instances
   */
  getDetailedMetrics(agentType?: AgentType): Array<AgentInstance & { requestsPerSecond: number }> {
    const filtered = agentType
      ? Array.from(this.instances.values()).filter(i => i.type === agentType)
      : Array.from(this.instances.values());

    const now = Date.now();
    const timeDelta = (now - this.lastMetricsTime) / 1000;

    return filtered.map(instance => ({
      ...instance,
      requestsPerSecond:
        timeDelta > 0 ? (this.requestCounter.get(instance.id) || 0) / timeDelta : 0,
    }));
  }

  // Private selection strategies

  private selectRoundRobin(candidates: AgentInstance[], agentType: AgentType): AgentInstance {
    const idx = this.roundRobinIndex.get(agentType) || 0;
    const selected = candidates[idx % candidates.length];
    this.roundRobinIndex.set(agentType, (idx + 1) % candidates.length);
    return selected;
  }

  private selectLeastConnections(candidates: AgentInstance[]): AgentInstance {
    return candidates.reduce((prev, curr) => {
      const prevUtilization = prev.currentLoad / prev.capacity;
      const currUtilization = curr.currentLoad / curr.capacity;
      return prevUtilization < currUtilization ? prev : curr;
    });
  }

  private selectWeighted(candidates: AgentInstance[]): AgentInstance {
    const weights = this.strategy.weights || {};
    const scored = candidates.map(c => ({
      instance: c,
      score: (weights[c.id] || 1) * (1 - c.currentLoad / c.capacity) * c.successRate,
    }));
    return scored.reduce((prev, curr) => (prev.score > curr.score ? prev : curr)).instance;
  }

  private selectHealthBased(candidates: AgentInstance[]): AgentInstance {
    // Score based on health metrics: success rate (60%), response time (30%), utilization (10%)
    const scored = candidates.map(c => {
      const successScore = c.successRate * 0.6;
      const latencyScore = (1 - Math.min(c.responseTime / 1000, 1)) * 0.3; // Normalize to 0-1
      const utilizationScore = (1 - c.currentLoad / c.capacity) * 0.1;

      return {
        instance: c,
        score: successScore + latencyScore + utilizationScore,
      };
    });

    return scored.reduce((prev, curr) => (prev.score > curr.score ? prev : curr)).instance;
  }
}

// Global load balancer instance
export const globalLoadBalancer = new AgentLoadBalancer(
  { name: 'health-based' },
  {
    interval: 30000, // 30s
    timeout: 5000, // 5s
    unhealthyThreshold: 3,
    healthyThreshold: 2,
    degradedThreshold: 0.85,
  }
);

export default AgentLoadBalancer;
