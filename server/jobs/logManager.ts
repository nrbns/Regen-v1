/**
 * Job Log Manager
 * Stores and retrieves job execution logs
 */

import type Redis from 'ioredis';

export interface JobLogEntry {
  timestamp: number;
  type: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, any>;
}

export class JobLogManager {
  private redis: Redis | null;
  private logKeyPrefix = 'job:logs:';
  private maxLogsPerJob = 200; // Keep last 200 log entries
  private logTTL = 7 * 24 * 60 * 60; // 7 days

  constructor(redis: Redis | null = null) {
    this.redis = redis;
  }

  /**
   * Append log entry to job logs
   */
  async appendLog(jobId: string, entry: JobLogEntry): Promise<void> {
    if (!this.redis) {
      console.log(`[JobLogManager] [${jobId}] ${entry.type.toUpperCase()}: ${entry.message}`);
      return;
    }

    try {
      const key = `${this.logKeyPrefix}${jobId}`;
      const data = JSON.stringify(entry);

      // Use Redis list to store logs
      await this.redis.rpush(key, data);

      // Trim to max size
      await this.redis.ltrim(key, -this.maxLogsPerJob, -1);

      // Set expiry
      await this.redis.expire(key, this.logTTL);
    } catch (error) {
      console.error('[JobLogManager] Failed to append log:', error);
    }
  }

  /**
   * Get logs for a job
   */
  async getLogs(jobId: string, limit = 100): Promise<JobLogEntry[]> {
    if (!this.redis) {
      return [];
    }

    try {
      const key = `${this.logKeyPrefix}${jobId}`;
      const logs = await this.redis.lrange(key, -limit, -1);

      return logs.map(log => JSON.parse(log) as JobLogEntry);
    } catch (error) {
      console.error('[JobLogManager] Failed to get logs:', error);
      return [];
    }
  }

  /**
   * Delete logs for a job
   */
  async deleteLogs(jobId: string): Promise<void> {
    if (!this.redis) return;

    try {
      const key = `${this.logKeyPrefix}${jobId}`;
      await this.redis.del(key);
    } catch (error) {
      console.error('[JobLogManager] Failed to delete logs:', error);
    }
  }

  /**
   * Helper: log info
   */
  async info(jobId: string, message: string, metadata?: Record<string, any>): Promise<void> {
    await this.appendLog(jobId, {
      timestamp: Date.now(),
      type: 'info',
      message,
      metadata,
    });
  }

  /**
   * Helper: log warning
   */
  async warn(jobId: string, message: string, metadata?: Record<string, any>): Promise<void> {
    await this.appendLog(jobId, {
      timestamp: Date.now(),
      type: 'warn',
      message,
      metadata,
    });
  }

  /**
   * Helper: log error
   */
  async error(jobId: string, message: string, metadata?: Record<string, any>): Promise<void> {
    await this.appendLog(jobId, {
      timestamp: Date.now(),
      type: 'error',
      message,
      metadata,
    });
  }

  /**
   * Helper: log debug
   */
  async debug(jobId: string, message: string, metadata?: Record<string, any>): Promise<void> {
    await this.appendLog(jobId, {
      timestamp: Date.now(),
      type: 'debug',
      message,
      metadata,
    });
  }
}
