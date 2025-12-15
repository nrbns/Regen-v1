/**
 * Security Module
 * Exports all security utilities
 */

export { TokenVault, globalTokenVault } from './tokenVault';
export type { EncryptedToken } from './tokenVault';

export { TwoFactorAuth, globalTwoFactorAuth } from './twoFactorAuth';
export type { TwoFactorMethod, TwoFactorConfig, TwoFactorChallenge } from './twoFactorAuth';

export { PermissionControl, globalPermissionControl } from './permissionControl';
export type { UserRole, ActionType, UserPermissions, ActionAudit } from './permissionControl';

export { RateLimiter, globalRateLimiter } from './rateLimiter';
export type { RateLimitConfig, RequestLog } from './rateLimiter';

export {
  authenticateRequest,
  requireAuth,
  requireRole,
  rateLimit,
  require2FA,
  verify2FA,
  auditAction,
  requestLogger,
} from './middleware';
export type { AuthenticatedRequest } from './middleware';
