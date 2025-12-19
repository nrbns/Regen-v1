import type { Redis } from 'ioredis';

export interface ReasoningEntry {
  step: string;
  decision: string;
  reasoning: string;
  confidence?: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export class ReasoningLogManager {
  private redis: Redis | null;
  private prefix = 'job:reasoning:';

  constructor(redis: Redis | null) {
    this.redis = redis;
  }

  private key(jobId: string) {
    return `${this.prefix}${jobId}`;
  }

  async append(jobId: string, entry: ReasoningEntry): Promise<void> {
    try {
      if (!this.redis) return;
      await this.redis.xadd(this.key(jobId), '*', 'payload', JSON.stringify(entry));
    } catch (err) {
      // Best-effort; swallow to avoid impacting app flow
    }
  }

  async get(jobId: string, count = 100): Promise<ReasoningEntry[]> {
    try {
      if (!this.redis) return [];
      const records = await this.redis.xrevrange(this.key(jobId), '+', '-', 'COUNT', count);
      return records
        .map(([, fields]) => {
          const idx = fields.findIndex(f => f === 'payload');
          const payload = idx >= 0 ? (fields[idx + 1] as string) : '';
          try {
            return JSON.parse(payload) as ReasoningEntry;
          } catch {
            return null;
          }
        })
        .filter((e): e is ReasoningEntry => !!e)
        .reverse();
    } catch {
      return [];
    }
  }
}
