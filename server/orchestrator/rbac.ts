/**
 * RBAC middleware for orchestrator endpoints
 * Week 3 security hardening - optional role checks
 */

import { Request, Response, NextFunction } from 'express';
import { globalPermissionControl } from '../../services/security/permissionControl.js';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

/**
 * Extract user from request (mock: can be JWT in production)
 */
export function extractUser(req: AuthRequest, _res: Response, next: NextFunction) {
  // In production, extract from JWT token or session
  req.userId = req.headers['x-user-id'] as string || 'demo-user';
  req.userRole = req.headers['x-user-role'] as string || 'viewer';
  next();
}

/**
 * Require specific permission to execute orchestrator actions
 */
export function requireOrchestratorAction(action: 'create' | 'approve' | 'execute' | 'delete') {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.userId || 'demo-user';

    try {
      // Initialize user if not already done
      const perms = await globalPermissionControl.getPermissions(userId);
      if (!perms) {
        const role = (req.userRole || 'viewer') as any;
        await globalPermissionControl.initializeUser(userId, role);
      }

      // Check if user can perform action
      const canPerform = await globalPermissionControl.canPerformAction(userId, action);
      if (!canPerform) {
        return res.status(403).json({
          success: false,
          error: `Permission denied: user ${userId} cannot ${action}`,
        });
      }

      // Check if action requires approval/2FA
      const requiresApproval = await globalPermissionControl.requiresApproval(userId, action);
      const requires2FA = await globalPermissionControl.requires2FA(userId, action);

      // Store in request for later checks
      (req as any).requiresApproval = requiresApproval;
      (req as any).requires2FA = requires2FA;

      next();
    } catch (error: any) {
      console.error('[RBAC] Permission check error:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed',
      });
    }
  };
}

/**
 * Audit orchestrator action
 */
export async function auditAction(
  userId: string,
  action: string,
  resource: string,
  approved: boolean,
  metadata?: Record<string, any>
) {
  try {
    await globalPermissionControl.auditAction(userId, action as any, resource, approved, metadata);
  } catch (error) {
    console.error('[RBAC] Audit error:', error);
  }
}

export default {
  extractUser,
  requireOrchestratorAction,
  auditAction,
};
