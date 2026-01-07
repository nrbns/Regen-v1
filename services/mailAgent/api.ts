/**
 * Mail Agent Production Integration
 * Complete example with authentication, error handling, and monitoring
 */

import express from 'express';
import { AgentPlanner } from './agentPlanner';
import { AgentExecutor } from './executor';
import { AuditLogger } from './auditLog';
import type { ApprovalRequest } from './executor';
import {
  authenticateRequest,
  requireAuth,
  rateLimit,
  require2FA,
  auditAction,
  requestLogger,
  type AuthenticatedRequest,
} from '../security/middleware';
import { globalPermissionControl } from '../security/permissionControl';

const app = express();
app.use(express.json());
app.use(requestLogger);
app.use(authenticateRequest);

const planner = new AgentPlanner();
const executor = new AgentExecutor();
const auditLogger = new AuditLogger();

/**
 * POST /api/mail-agent/plan
 * Create an execution plan from user intent
 */
app.post('/api/mail-agent/plan', requireAuth, rateLimit('plan'), async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.userId!;
    const { intent } = req.body;

    if (!intent) {
      return res.status(400).json({ error: 'intent required' });
    }

    // Check permission
    const canPlan = await globalPermissionControl.canPerformAction(userId, 'create');
    if (!canPlan) {
      await auditAction(userId, 'create', 'plan', false);
      return res.status(403).json({ error: 'Permission denied' });
    }

    const plan = planner.createPlan(userId, intent);
    await auditAction(userId, 'create', 'plan', true, { planId: plan.id });

    return res.json({
      plan: {
        id: plan.id,
        intent: plan.intent,
        tasks: plan.tasks.map((t) => ({
          id: t.id,
          type: t.type,
          status: t.status,
        })),
        estimatedRiskLevel: plan.estimatedRiskLevel,
        requiresApproval: plan.requiresApproval,
      },
    });
  } catch (error) {
    console.error('Plan creation failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/mail-agent/execute
 * Execute a plan (with server-side approval handler)
 */
app.post(
  '/api/mail-agent/execute',
  requireAuth,
  rateLimit('execute'),
  require2FA('send'),
  async (req: AuthenticatedRequest, res) => {
    let planId: string | undefined;
    let approvalToken: string | undefined;
    let intent: string | undefined;
    try {
      const userId = req.userId!;
      ({ planId, approvalToken, intent } = req.body as { planId?: string; approvalToken?: string; intent?: string });

      if (!planId) {
        return res.status(400).json({ error: 'planId required' });
      }

      // Verify 2FA
      if (!approvalToken) {
        return res.status(403).json({ error: '2FA token required for execution' });
      }

      // Check permission
      const canExecute = await globalPermissionControl.canPerformAction(userId, 'send');
      if (!canExecute) {
        await auditAction(userId, 'send', planId, false);
        return res.status(403).json({ error: 'Permission denied' });
      }

      // Recreate plan (in production: fetch from DB)
      const plan = planner.createPlan(userId, intent || 'read emails');

      // Server-side approval handler
      const approvalHandler = async (request: ApprovalRequest) => {
        // Log approval request
        console.log(`Approval request: ${request.taskType} for plan ${planId}`);

        // In production:
        // 1. Verify 2FA token validates high-risk actions
        // 2. Check rate limits per action type
        // 3. Check user permissions
        // 4. Log approval decision
        // 5. Return user's decision (from DB or real-time WebSocket)

        // For demo: auto-approve unless requiresApproval is true
        if (request.requiresApproval) {
          // Would require explicit 2FA here
          return false; // Reject by default
        }

        return true;
      };

      // Execute plan
      const context = await executor.execute(userId, plan, approvalHandler);
      await auditAction(userId, 'send', planId, true, { tasksCompleted: context.results, approvalToken, intent });

      // Return results
      return res.json({
        success: true,
        results: {
          threadsRead: context.threads.length,
          summariesCreated: context.summaries.length,
          draftsCreated: context.drafts.length,
          emailsSent: context.results['sent'] || false,
        },
        errors: Object.keys(context.errors).map((taskId) => ({
          taskId,
          error: context.errors[taskId].message,
        })),
      });
    } catch (error) {
      console.error('Execution failed:', error);
      const errPlanId = typeof planId === 'string' ? planId : 'unknown';
      if (req.userId) {
        await auditAction(req.userId, 'send', errPlanId, false, { error: String(error) });
      }
      return res.status(500).json({ error: 'Execution failed' });
    }
  }
);

/**
 * GET /api/mail-agent/audit/:planId
 * Get audit trail for a plan
 */
app.get('/api/mail-agent/audit/:planId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { planId } = req.params;
    const userId = req.userId!;

    const trail = await auditLogger.getFullTrail(planId);
    await auditAction(userId, 'read', planId, true);

    return res.json({
      planId,
      trail: trail.map((entry) => ({
        timestamp: entry.timestamp,
        action: entry.action,
        status: entry.status,
        result: entry.result,
        error: entry.error,
      })),
    });
  } catch (error) {
    console.error('Audit query failed:', error);
    return res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

/**
 * GET /api/mail-agent/stats/:userId
 * Get user statistics
 */
app.get('/api/mail-agent/stats/:userId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    const requestUserId = req.userId!;

    // Users can only view their own stats unless they're admins
    if (userId !== requestUserId) {
      const perms = await globalPermissionControl.getPermissions(requestUserId);
      if (perms?.role !== 'admin') {
        await auditAction(requestUserId, 'read', `stats:${userId}`, false);
        return res.status(403).json({ error: 'Permission denied' });
      }
    }

    const stats = await auditLogger.getUserStats(userId);
    await auditAction(requestUserId, 'read', `stats:${userId}`, true);

    return res.json(stats);
  } catch (error) {
    console.error('Stats query failed:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * WebSocket handler for real-time approval
 * (Pseudo-code — use Socket.IO or similar in production)
 */
export function setupRealtimeApprovals(io: any): void {
  io.on('connection', (socket: any) => {
    console.log(`User connected: ${socket.id}`);

    // Handle approval decision
    socket.on('approval-decision', async (data: { planId: string; taskId: string; approved: boolean }) => {
      console.log(`Approval decision for ${data.planId}/${data.taskId}: ${data.approved}`);

      // Store decision in DB
      // Resume execution if waiting

      socket.emit('approval-recorded', { taskId: data.taskId, approved: data.approved });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
}

/**
 * Health check endpoint
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'mail-agent' });
});

/**
 * Start server
 */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Mail Agent API running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Docs: http://localhost:${PORT}/api-docs`);
});

export default app;
