/**
 * Security Middleware
 * Express middleware for authentication, rate limiting, audit
 */

import type { Request, Response, NextFunction } from 'express';
import { globalTokenVault as _globalTokenVault } from './tokenVault';
import { globalTwoFactorAuth } from './twoFactorAuth';
import { globalPermissionControl } from './permissionControl';
import { globalRateLimiter } from './rateLimiter';

/**
 * Extended Express Request with auth info
 */
export interface AuthenticatedRequest extends Request {
  userId?: string;
  role?: string;
  token?: string;
}

/**
 * Authenticate request using bearer token
 */
export async function authenticateRequest(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);

  // In production: verify JWT and extract userId
  // For now: simple token validation
  if (token.length > 0) {
    req.userId = `user-${token.substring(0, 8)}`;
  }

  next();
}

/**
 * Require authentication
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

/**
 * Require specific role
 */
export function requireRole(role: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const perms = await globalPermissionControl.getPermissions(req.userId);
    if (!perms || perms.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}

/**
 * Rate limit middleware
 */
export function rateLimit(action: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return next();
    }

    // Check rate limit
    const allowed = await globalRateLimiter.isRequestAllowed(req.userId, action as any);
    if (!allowed) {
      const remaining = await globalRateLimiter.getRemainingRequests(req.userId, action as any);
      res.status(429).json({
        error: 'Rate limit exceeded',
        remainingRequests: remaining,
      });
      return;
    }

    // Check daily quota
    const hasQuota = await globalRateLimiter.checkDailyQuota(req.userId, action as any);
    if (!hasQuota) {
      res.status(429).json({
        error: 'Daily quota exceeded',
      });
      return;
    }

    next();
  };
}

/**
 * Require 2FA for action
 */
export function require2FA(action: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return next();
    }

    const needs2FA = await globalPermissionControl.requires2FA(req.userId, action as any);
    if (!needs2FA) {
      return next();
    }

    const has2FA = await globalTwoFactorAuth.isTwoFactorEnabled(req.userId as any);
    if (!has2FA) {
      res.status(403).json({ error: '2FA required but not configured' });
      return;
    }

    // Create 2FA challenge
    const challenge = await globalTwoFactorAuth.createChallenge(req.userId, action);

    res.status(403).json({
      error: '2FA required',
      challengeId: challenge.challengeId,
      expiresIn: challenge.expiresAt.getTime() - Date.now(),
    });
    return;
  };
}

/**
 * Verify 2FA challenge
 */
export async function verify2FA(
  userId: string,
  challengeId: string,
  code: string
): Promise<boolean> {
  return await globalTwoFactorAuth.verifyChallenge(challengeId, code);
}

/**
 * Audit action
 */
export async function auditAction(
  userId: string,
  action: string,
  resource: string,
  approved: boolean,
  metadata?: Record<string, any>
): Promise<void> {
  await globalPermissionControl.auditAction(userId, action as any, resource, approved, metadata);
  return;
}

/**
 * Request logging middleware
 */
export function requestLogger(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', async () => {
    const duration = Date.now() - start;
    const success = res.statusCode < 400;

    if (req.userId) {
      const action = req.method.toLowerCase();
      await globalRateLimiter.logRequest(req.userId, action, success);

      console.log(
        `[Security] ${req.userId} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
      );
    }
  });

  next();
}
