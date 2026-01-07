/**
 * Rate Limiting Service
 * Prevent abuse and enforce quotas
 */

export interface RateLimitConfig {
  userId: string;
  action: string;
  maxRequests: number;
  windowSizeSeconds: number;
  quotaPerDay?: number;
}

export interface RequestLog {
  userId: string;
  action: string;
  timestamp: Date;
  success: boolean;
}

const requestLogs: RequestLog[] = [];
const rateLimitConfigs = new Map<string, RateLimitConfig>();

export class RateLimiter {
  /**
   * Configure rate limit for action
   */
  async configureLimit(config: RateLimitConfig): Promise<void> {
    const key = `${config.userId}:${config.action}`;
    rateLimitConfigs.set(key, config);
    console.log(`[RateLimiter] Configured limit: ${key}`);
  }

  /**
   * Check if request is allowed
   */
  async isRequestAllowed(userId: string, action: string): Promise<boolean> {
    const key = `${userId}:${action}`;
    const config = rateLimitConfigs.get(key) || this.getDefaultConfig(userId, action);

    // Count requests in window
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowSizeSeconds * 1000);

    const recentRequests = requestLogs.filter(
      (log) =>
        log.userId === userId &&
        log.action === action &&
        log.timestamp >= windowStart &&
        log.success
    );

    return recentRequests.length < config.maxRequests;
  }

  /**
   * Get remaining requests in window
   */
  async getRemainingRequests(userId: string, action: string): Promise<number> {
    const key = `${userId}:${action}`;
    const config = rateLimitConfigs.get(key) || this.getDefaultConfig(userId, action);

    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowSizeSeconds * 1000);

    const recentRequests = requestLogs.filter(
      (log) =>
        log.userId === userId &&
        log.action === action &&
        log.timestamp >= windowStart &&
        log.success
    );

    return Math.max(0, config.maxRequests - recentRequests.length);
  }

  /**
   * Check daily quota
   */
  async checkDailyQuota(userId: string, action: string): Promise<boolean> {
    const key = `${userId}:${action}`;
    const config = rateLimitConfigs.get(key) || this.getDefaultConfig(userId, action);

    if (!config.quotaPerDay) {
      return true;
    }

    // Count requests today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRequests = requestLogs.filter(
      (log) =>
        log.userId === userId &&
        log.action === action &&
        log.timestamp >= today &&
        log.success
    );

    return todayRequests.length < config.quotaPerDay;
  }

  /**
   * Log request
   */
  async logRequest(userId: string, action: string, success: boolean): Promise<void> {
    requestLogs.push({
      userId,
      action,
      timestamp: new Date(),
      success,
    });

    // Clean up old logs (keep last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const index = requestLogs.findIndex((log) => log.timestamp < oneDayAgo);
    if (index > 0) {
      requestLogs.splice(0, index);
    }
  }

  /**
   * Get statistics
   */
  async getStats(userId: string, action: string): Promise<{
    requestsThisHour: number;
    requestsToday: number;
    limit: RateLimitConfig;
  }> {
    const key = `${userId}:${action}`;
    const config = rateLimitConfigs.get(key) || this.getDefaultConfig(userId, action);

    const now = new Date();

    // Last hour
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const hourlyRequests = requestLogs.filter(
      (log) =>
        log.userId === userId &&
        log.action === action &&
        log.timestamp >= hourAgo &&
        log.success
    );

    // Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyRequests = requestLogs.filter(
      (log) =>
        log.userId === userId &&
        log.action === action &&
        log.timestamp >= today &&
        log.success
    );

    return {
      requestsThisHour: hourlyRequests.length,
      requestsToday: dailyRequests.length,
      limit: config,
    };
  }

  /**
   * Default config
   */
  private getDefaultConfig(userId: string, action: string): RateLimitConfig {
    // Defaults: 100 requests per minute, 1000 per day
    return {
      userId,
      action,
      maxRequests: 100,
      windowSizeSeconds: 60,
      quotaPerDay: 1000,
    };
  }
}

export const globalRateLimiter = new RateLimiter();
