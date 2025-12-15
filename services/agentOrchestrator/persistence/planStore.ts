import { ExecutionPlan } from '../planner.js';
import { ExecutionResult, TaskResult } from '../executor.js';

export type PlanStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface PlanRecord {
  plan: ExecutionPlan;
  status: PlanStatus;
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  result?: ExecutionResult;
  error?: string;
  // Optional live task results aggregation for streaming/status
  taskResults?: TaskResult[];
}

export interface PlanStore {
  saveNewPlan(record: PlanRecord): Promise<void>;
  get(planId: string): Promise<PlanRecord | null>;
  update(planId: string, updates: Partial<PlanRecord>): Promise<void>;
  appendTaskResult(planId: string, result: TaskResult): Promise<void>;
  list(limit?: number): Promise<PlanRecord[]>;
}

class InMemoryPlanStore implements PlanStore {
  private store = new Map<string, PlanRecord>();

  async saveNewPlan(record: PlanRecord): Promise<void> {
    this.store.set(record.plan.planId, {
      ...record,
      taskResults: record.taskResults || [],
    });
  }

  async get(planId: string): Promise<PlanRecord | null> {
    return this.store.get(planId) || null;
  }

  async update(planId: string, updates: Partial<PlanRecord>): Promise<void> {
    const existing = this.store.get(planId);
    if (!existing) return;
    this.store.set(planId, { ...existing, ...updates });
  }

  async appendTaskResult(planId: string, result: TaskResult): Promise<void> {
    const existing = this.store.get(planId);
    if (!existing) return;
    const taskResults = existing.taskResults ? [...existing.taskResults, result] : [result];
    this.store.set(planId, { ...existing, taskResults });
  }

  async list(limit: number = 100): Promise<PlanRecord[]> {
    const all = Array.from(this.store.values());
    all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return all.slice(0, limit);
  }
}

let singleton: PlanStore | null = null;
export function getPlanStore(): PlanStore {
  if (!singleton) singleton = new InMemoryPlanStore();
  return singleton;
}

export default PlanStore;
