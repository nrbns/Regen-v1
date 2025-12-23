/**
 * Shared Context Store for Orchestrator (Week 2)
 * Provides per-plan context aggregation across tasks/agents
 */

export type PlanContext = Record<string, any>;

class ContextStore {
  private store: Map<string, PlanContext> = new Map();

  init(planId: string, base: PlanContext = {}): void {
    if (!this.store.has(planId)) this.store.set(planId, { ...base });
  }

  get(planId: string): PlanContext {
    return this.store.get(planId) || {};
  }

  set(planId: string, ctx: PlanContext): void {
    this.store.set(planId, { ...ctx });
  }

  mergeTaskOutput(planId: string, taskId: string, output: any): void {
    const current = this.get(planId);
    const merged = {
      ...current,
      [taskId]: output,
      lastUpdated: new Date().toISOString(),
    };
    this.store.set(planId, merged);
  }

  getPath(planId: string, path: string): any {
    const ctx = this.get(planId);
    const parts = path.split('.');
    let cursor: any = ctx;
    for (const p of parts) {
      if (cursor == null) return undefined;
      cursor = cursor[p];
    }
    return cursor;
  }

  clear(planId: string): void {
    this.store.delete(planId);
  }
}

let ctxInstance: ContextStore | null = null;
export function getContextStore(): ContextStore {
  if (!ctxInstance) ctxInstance = new ContextStore();
  return ctxInstance;
}

export default ContextStore;
