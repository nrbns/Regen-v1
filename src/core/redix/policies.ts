/**
 * Redix Policy Engine - Resource management and optimization policies
 * Applies rules for tab suspension, throttling, and prefetching based on system state
 */

import policiesConfig from './policies.json';
import { Redix, dispatch } from './runtime';

export type PolicyMode = 'default' | 'performance' | 'balanced' | 'battery';

export interface PolicyRules {
  suspendBackgroundTabs: boolean;
  suspendAfterMinutes: number;
  throttleHeavyTabs: boolean;
  memoryThreshold: number; // percentage
  cpuThreshold: number; // percentage
  batteryThreshold: number; // percentage
  prefetchEnabled: boolean;
  prefetchOnWifiOnly: boolean;
}

interface SystemMetrics {
  memoryUsage?: number; // percentage
  cpuUsage?: number; // percentage
  batteryLevel?: number; // percentage
  isWifi?: boolean;
  isBatteryLow?: boolean;
}

class PolicyEngine {
  private currentMode: PolicyMode = 'default';
  private metrics: SystemMetrics = {};
  private activePolicies: PolicyRules;

  constructor() {
    this.activePolicies = this.getPolicyRules('default');
    this.initializeMetrics();
  }

  /**
   * Get policy rules for a mode
   */
  getPolicyRules(mode: PolicyMode = this.currentMode): PolicyRules {
    const policies = (policiesConfig as any)[mode];
    if (!policies) {
      console.warn(`[RedixPolicies] Unknown policy mode: ${mode}, using default`);
      return (policiesConfig as any).default;
    }
    return policies as PolicyRules;
  }

  /**
   * Set active policy mode
   */
  setMode(mode: PolicyMode): void {
    this.currentMode = mode;
    this.activePolicies = this.getPolicyRules(mode);
    
    dispatch({
      type: 'redix:policy:mode-changed',
      payload: { mode, policies: this.activePolicies },
    });

    console.log(`[RedixPolicies] Mode changed to: ${mode}`);
  }

  /**
   * Get current policy mode
   */
  getMode(): PolicyMode {
    return this.currentMode;
  }

  /**
   * Update system metrics
   */
  updateMetrics(metrics: Partial<SystemMetrics>): void {
    this.metrics = { ...this.metrics, ...metrics };
    this.evaluatePolicies();
  }

  /**
   * Initialize metrics from system APIs
   */
  private async initializeMetrics(): Promise<void> {
    // Battery API (if available)
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        this.updateMetrics({
          batteryLevel: battery.level * 100,
          isBatteryLow: battery.level < 0.2,
        });

        // Listen for battery changes
        battery.addEventListener('levelchange', () => {
          this.updateMetrics({
            batteryLevel: battery.level * 100,
            isBatteryLow: battery.level < 0.2,
          });
        });
      } catch (error) {
        console.warn('[RedixPolicies] Battery API unavailable:', error);
      }
    }

    // Network API (if available)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.updateMetrics({
          isWifi: connection.effectiveType === 'wifi' || connection.type === 'wifi',
        });

        connection.addEventListener('change', () => {
          this.updateMetrics({
            isWifi: connection.effectiveType === 'wifi' || connection.type === 'wifi',
          });
        });
      }
    }

    // Memory API (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory) {
        const memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        this.updateMetrics({ memoryUsage });
      }
    }
  }

  /**
   * Evaluate policies based on current metrics
   */
  private evaluatePolicies(): void {
    const { memoryUsage, cpuUsage, batteryLevel, isWifi } = this.metrics;
    const {
      memoryThreshold,
      cpuThreshold,
      batteryThreshold,
      prefetchEnabled,
      prefetchOnWifiOnly,
    } = this.activePolicies;

    // Check if we should disable prefetch due to battery or network
    if (prefetchEnabled) {
      const shouldDisablePrefetch =
        (prefetchOnWifiOnly && !isWifi) ||
        (batteryLevel !== undefined && batteryLevel < batteryThreshold);

      if (shouldDisablePrefetch) {
        dispatch({
          type: 'redix:policy:prefetch-disabled',
          payload: {
            reason: prefetchOnWifiOnly && !isWifi ? 'not_wifi' : 'battery_low',
            batteryLevel,
            isWifi,
          },
        });
      }
    }

    // Check if we should throttle tabs due to resource constraints
    if (memoryUsage !== undefined && memoryUsage > memoryThreshold) {
      dispatch({
        type: 'redix:policy:memory-high',
        payload: {
          usage: memoryUsage,
          threshold: memoryThreshold,
          action: 'throttle_tabs',
        },
      });
    }

    if (cpuUsage !== undefined && cpuUsage > cpuThreshold) {
      dispatch({
        type: 'redix:policy:cpu-high',
        payload: {
          usage: cpuUsage,
          threshold: cpuThreshold,
          action: 'throttle_tabs',
        },
      });
    }

    // Check if battery is low
    if (batteryLevel !== undefined && batteryLevel < batteryThreshold) {
      dispatch({
        type: 'redix:policy:battery-low',
        payload: {
          level: batteryLevel,
          threshold: batteryThreshold,
          action: 'suspend_background_tabs',
        },
      });
    }
  }

  /**
   * Check if an action is allowed by current policies
   */
  shouldAllow(action: string, _context?: Record<string, any>): boolean {
    const { suspendBackgroundTabs, prefetchEnabled, prefetchOnWifiOnly } = this.activePolicies;
    const { isWifi, batteryLevel } = this.metrics;
    const { batteryThreshold } = this.activePolicies;

    switch (action) {
      case 'prefetch':
        if (!prefetchEnabled) return false;
        if (prefetchOnWifiOnly && !isWifi) return false;
        if (batteryLevel !== undefined && batteryLevel < batteryThreshold) return false;
        return true;

      case 'suspend_tab':
        return suspendBackgroundTabs;

      case 'throttle_tab':
        return this.activePolicies.throttleHeavyTabs;

      default:
        return true;
    }
  }

  /**
   * Get recommendations based on current metrics
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const { memoryUsage, cpuUsage, batteryLevel } = this.metrics;
    const { memoryThreshold, cpuThreshold, batteryThreshold: batteryThresh } = this.activePolicies;

    if (memoryUsage !== undefined && memoryUsage > memoryThreshold) {
      recommendations.push('Consider closing unused tabs to reduce memory usage');
    }

    if (cpuUsage !== undefined && cpuUsage > cpuThreshold) {
      recommendations.push('CPU usage is high - heavy tabs will be throttled');
    }

    if (batteryLevel !== undefined && batteryLevel < batteryThresh) {
      recommendations.push('Battery is low - background tabs will be suspended');
    }

    return recommendations;
  }

  /**
   * Get current metrics
   */
  getMetrics(): SystemMetrics {
    return { ...this.metrics };
  }

  /**
   * Get active policies
   */
  getActivePolicies(): PolicyRules {
    return { ...this.activePolicies };
  }
}

// Singleton instance
export const policyEngine = new PolicyEngine();

// Export convenience functions
export const setPolicyMode = (mode: PolicyMode) => policyEngine.setMode(mode);
export const getPolicyMode = () => policyEngine.getMode();
export const updatePolicyMetrics = (metrics: Partial<SystemMetrics>) =>
  policyEngine.updateMetrics(metrics);
export const shouldAllowPolicy = (action: string, context?: Record<string, any>) =>
  policyEngine.shouldAllow(action, context);
export const getPolicyRecommendations = () => policyEngine.getRecommendations();
export const getPolicyMetrics = () => policyEngine.getMetrics();
export const getPolicyRules = (mode?: PolicyMode) => policyEngine.getPolicyRules(mode);

// Listen for performance events
Redix.watch('redix:performance:low', (event) => {
  const { memory, cpu, battery } = event.payload;
  policyEngine.updateMetrics({
    memoryUsage: memory,
    cpuUsage: cpu,
    batteryLevel: battery,
  });
});

