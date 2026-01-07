/**
 * PlanStore factory with environment-based selection
 * 
 * PLAN_STORE_TYPE environment variable controls implementation:
 * - 'memory' (default for dev): InMemoryPlanStore (fast, non-persistent)
 * - 'redis' (production): RedisPlanStore (persistent, distributed)
 * 
 * This allows seamless switching between implementations
 * without changing application code
 */

import { PlanStore, getPlanStore as getInMemoryPlanStore } from './planStore.js';
import { RedisPlanStore } from './redisPlanStore.js';
import { createRedisConnection, testRedisConnection } from './redisFactory.js';

let planStoreInstance: PlanStore | null = null;

/**
 * Initialize and return PlanStore singleton
 * Auto-selects implementation based on environment + Redis availability
 */
export async function initializePlanStore(): Promise<PlanStore> {
  if (planStoreInstance) {
    return planStoreInstance;
  }

  const storeType = (process.env.PLAN_STORE_TYPE || 'memory').toLowerCase();

  console.log(`[PlanStore] Initializing with type: ${storeType}`);

  if (storeType === 'redis') {
    // Test Redis availability first
    const isRedisAvailable = await testRedisConnection();

    if (!isRedisAvailable) {
      console.warn('[PlanStore] Redis unavailable, falling back to in-memory store');
      planStoreInstance = getInMemoryPlanStore();
    } else {
      const redis = createRedisConnection();
      planStoreInstance = new RedisPlanStore(redis);
      console.log('[PlanStore] Using Redis adapter');
    }
  } else {
    planStoreInstance = getInMemoryPlanStore();
    console.log('[PlanStore] Using in-memory store');
  }

  return planStoreInstance;
}

/**
 * Get existing PlanStore or initialize if needed
 */
export function getPlanStore(): PlanStore {
  if (!planStoreInstance) {
    throw new Error('PlanStore not initialized. Call initializePlanStore() first.');
  }
  return planStoreInstance as PlanStore;
}

/**
 * Reset PlanStore (for testing)
 */
export async function resetPlanStore(): Promise<void> {
  if (planStoreInstance) {
    if (planStoreInstance instanceof RedisPlanStore) {
      await planStoreInstance.close();
    }
    planStoreInstance = null;
  }
}

/**
 * Get store information
 */
export function getPlanStoreInfo(): {
  type: string;
  implementation: string;
  initialized: boolean;
} {
  return {
    type: process.env.PLAN_STORE_TYPE || 'memory',
    implementation: planStoreInstance?.constructor.name || 'None',
    initialized: planStoreInstance !== null,
  };
}

export default {
  initializePlanStore,
  getPlanStore,
  resetPlanStore,
  getPlanStoreInfo,
};
