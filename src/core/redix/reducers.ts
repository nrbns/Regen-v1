/**
 * Redix Reducers
 * Deterministic state reducers for common Redix operations
 */

import { RedixState, RedixEvent, Reducer, registerReducer } from './event-log';

/**
 * Tab state reducer
 */
export const tabReducer: Reducer = (state: RedixState, event: RedixEvent): RedixState => {
  const tabs = state.tabs || {};

  switch (event.type) {
    case 'redix:tab:suspend':
      return {
        ...state,
        tabs: {
          ...tabs,
          [event.payload.tabId]: {
            ...tabs[event.payload.tabId],
            suspended: true,
            suspendedAt: event.timestamp,
          },
        },
      };

    case 'redix:tab:resume':
      return {
        ...state,
        tabs: {
          ...tabs,
          [event.payload.tabId]: {
            ...tabs[event.payload.tabId],
            suspended: false,
            resumedAt: event.timestamp,
          },
        },
      };

    case 'redix:tab:activate':
      return {
        ...state,
        tabs: {
          ...tabs,
          [event.payload.tabId]: {
            ...tabs[event.payload.tabId],
            active: true,
            lastActive: event.timestamp,
          },
        },
        activeTabId: event.payload.tabId,
      };

    case 'redix:tab:memory':
      return {
        ...state,
        tabs: {
          ...tabs,
          [event.payload.tabId]: {
            ...tabs[event.payload.tabId],
            memoryMB: event.payload.memoryMB,
            memoryUpdatedAt: event.timestamp,
          },
        },
      };

    default:
      return state;
  }
};

/**
 * Performance metrics reducer
 */
export const performanceReducer: Reducer = (state: RedixState, event: RedixEvent): RedixState => {
  const metrics = state.metrics || {};

  switch (event.type) {
    case 'redix:metrics:update':
      return {
        ...state,
        metrics: {
          ...metrics,
          cpu: event.payload.cpu,
          memory: event.payload.memory,
          battery: event.payload.battery,
          updatedAt: event.timestamp,
        },
      };

    case 'redix:metrics:threshold':
      return {
        ...state,
        metrics: {
          ...metrics,
          thresholds: {
            memory: event.payload.memoryThreshold,
            cpu: event.payload.cpuThreshold,
            battery: event.payload.batteryThreshold,
          },
        },
      };

    default:
      return state;
  }
};

/**
 * Policy reducer
 */
export const policyReducer: Reducer = (state: RedixState, event: RedixEvent): RedixState => {
  switch (event.type) {
    case 'redix:policy:update':
      return {
        ...state,
        policy: event.payload,
        policyUpdatedAt: event.timestamp,
      };

    case 'redix:policy:mode':
      return {
        ...state,
        policyMode: event.payload.mode,
        policy: event.payload.policy,
        policyUpdatedAt: event.timestamp,
      };

    default:
      return state;
  }
};

/**
 * AI-triggered optimization reducer
 */
export const aiOptimizationReducer: Reducer = (
  state: RedixState,
  event: RedixEvent
): RedixState => {
  switch (event.type) {
    case 'redix:ai:optimize':
      return {
        ...state,
        aiOptimizations: {
          ...(state.aiOptimizations || {}),
          [event.timestamp]: {
            suggestion: event.payload.suggestion,
            action: event.payload.action,
            confidence: event.payload.confidence,
            applied: event.payload.applied || false,
          },
        },
        lastAIOptimization: event.timestamp,
      };

    default:
      return state;
  }
};

/**
 * Resource allocation reducer
 */
export const resourceReducer: Reducer = (state: RedixState, event: RedixEvent): RedixState => {
  const resources = state.resources || {};

  switch (event.type) {
    case 'redix:resource:allocate':
      return {
        ...state,
        resources: {
          ...resources,
          [event.payload.resourceId]: {
            ...resources[event.payload.resourceId],
            allocated: true,
            allocatedAt: event.timestamp,
            priority: event.payload.priority || 0,
          },
        },
      };

    case 'redix:resource:release':
      return {
        ...state,
        resources: {
          ...resources,
          [event.payload.resourceId]: {
            ...resources[event.payload.resourceId],
            allocated: false,
            releasedAt: event.timestamp,
          },
        },
      };

    default:
      return state;
  }
};

/**
 * Register all default reducers
 */
export function registerDefaultReducers(): void {
  registerReducer('tab', tabReducer);
  registerReducer('performance', performanceReducer);
  registerReducer('policy', policyReducer);
  registerReducer('ai', aiOptimizationReducer);
  registerReducer('resource', resourceReducer);
}
