/**
 * Agent Orchestrator API - Week 1, Integration Layer + Week 3 Bull Queue
 * REST API endpoints for orchestrator service with distributed execution
 */

import express, { Request, Response } from 'express';
import { getIntentRouter } from '../../services/agentOrchestrator/intentRouter';
import { getTaskPlanner } from '../../services/agentOrchestrator/planner';
import { getTaskExecutor } from '../../services/agentOrchestrator/executor';
import { getPlanStore } from '../../services/agentOrchestrator/persistence/planStoreFactory';
import { extractUser, requireOrchestratorAction } from '../orchestrator/rbac';
import { globalPermissionControl } from '../../services/security/permissionControl';
import { 
  trackRouterPerformance, 
  trackPlannerPerformance, 
  trackExecutorPerformance, 
  trackOrchestratorError,
  getMonitoring 
} from '../monitoring/orchestrator';
import { 
  sendPlanCreated, 
  sendTaskStarted, 
  sendTaskCompleted, 
  sendTaskFailed,
  sendPlanCompleted,
  sendPlanFailed 
} from '../websocket/orchestrator';
import { 
  initializePlanQueue, 
  enqueuePlanExecution, 
  getJobStatus, 
  getQueueMetrics,
  cancelJob,
  retryJob 
} from '../../services/agentOrchestrator/queue/planQueue';

const router = express.Router();

// Apply RBAC middleware to all routes (Week 3)
router.use(extractUser as any);

// Initialize services
const intentRouter = getIntentRouter();
const taskPlanner = getTaskPlanner();
const taskExecutor = getTaskExecutor();

// Initialize queue (Week 3)
let queueInitialized = false;
try {
  initializePlanQueue();
  queueInitialized = true;
  console.log('[Orchestrator Routes] Bull queue initialized');
} catch (error: any) {
  console.warn('[Orchestrator Routes] Queue initialization failed, will use direct execution:', error?.message);
}

// Get planStore
const planStore = getPlanStore();

/**
 * POST /orchestrator/classify
 * Classify user intent
 */
router.post('/classify', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { input } = req.body;

    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'Input text required' });
    }

    const classification = await intentRouter.classify(input);

    trackRouterPerformance(Date.now() - startTime, true, { 
      input,
      agent: classification.primaryAgent,
      confidence: classification.confidence 
    });

    res.json({
      success: true,
      classification,
    });
  } catch (error: any) {
    console.error('[Orchestrator API] Classification error:', error);
    trackRouterPerformance(Date.now() - startTime, false, { classificationError: true });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
/**
 * POST /orchestrator/plan
 * Create execution plan from intent
 */
router.post('/plan', requireOrchestratorAction('create') as any, async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { input, userId, context } = req.body;

    if (!input || !userId) {
      return res.status(400).json({ error: 'Input and userId required' });
    }

    // Classify intent
    const intent = await intentRouter.classify(input);

    // Create plan
    const plan = await taskPlanner.createPlan(intent, userId, context);

    // Validate plan
    const validation = taskPlanner.validatePlan(plan);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan',
        details: validation.errors,
      });
    }

    trackPlannerPerformance(Date.now() - startTime, true, {
      agent: intent.primaryAgent,
      taskCount: plan.tasks.length,
      planId: plan.planId
    });

    // Store for approval
    await planStore.saveNewPlan({
      plan,
      createdAt: new Date(),
      status: 'pending_approval',
    });

    sendPlanCreated(plan.planId, { 
      agent: intent.primaryAgent, 
      taskCount: plan.tasks.length,
      requiresApproval: plan.requiresApproval 
    });

    res.json({
      success: true,
      plan,
      requiresApproval: plan.requiresApproval,
    });
  } catch (error: any) {
    trackPlannerPerformance(Date.now() - startTime, false, { planCreateError: true });
    trackOrchestratorError('planner', error, { message: error?.message });
    console.error('[Orchestrator API] Planning error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /orchestrator/approve
 * Approve a plan for execution (uses Bull queue if available, checks quotas)
 */
router.post('/approve', requireOrchestratorAction('approve') as any, async (req: Request, res: Response) => {
  try {
    const { planId, userId } = req.body;

    if (!planId || !userId) {
      return res.status(400).json({ error: 'planId and userId required' });
    }

    const pending = await planStore.get(planId);
    if (!pending) {
      return res.status(404).json({ error: 'Plan not found or already executed' });
    }

    const { plan } = pending;

    // Check user quota before queueing
    const quotaCheck = await globalPermissionControl.checkQuota(userId);
    if (!quotaCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Quota exceeded',
        reason: quotaCheck.reason,
      });
    }

    // Update status
    await planStore.update(planId, {
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: userId,
    });

    // Increment execution count
    await globalPermissionControl.incrementExecution(userId);

    // Queue or execute directly
    if (queueInitialized) {
      // Get user priority for queue
      const priority = await globalPermissionControl.getUserPriority(userId);
      
      const job = await enqueuePlanExecution(planId, plan, userId, { priority });
      res.json({
        success: true,
        planId,
        jobId: job,
        priority,
        message: 'Plan approved and queued for execution',
      });
    } else {
      executeAsync(plan, userId);
      res.json({
        success: true,
        planId,
        message: 'Plan approved and executing directly (queue unavailable)',
      });
    }
  } catch (error: any) {
    console.error('[Orchestrator API] Approval error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /orchestrator/reject
 * Reject a plan
 */
router.post('/reject', async (req: Request, res: Response) => {
  try {
    const { planId, userId, reason } = req.body;

    if (!planId || !userId || !reason) {
      return res.status(400).json({ error: 'planId, userId, and reason required' });
    }

    const pending = await planStore.get(planId);
    if (!pending) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Update status
    await planStore.update(planId, {
      status: 'rejected',
      rejectedAt: new Date(),
      rejectedBy: userId,
      rejectionReason: reason,
    });

    res.json({
      success: true,
      planId,
      message: 'Plan rejected',
    });
  } catch (error: any) {
    console.error('[Orchestrator API] Rejection error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /orchestrator/status/:planId
 * Get execution status for a plan
 */
router.get('/status/:planId', async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;

    const pending = await planStore.get(planId);
    if (!pending) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({
      success: true,
      status: pending.status,
      plan: pending.plan,
      result: pending.result,
      createdAt: pending.createdAt,
      approvedAt: pending.approvedAt,
      completedAt: pending.completedAt,
    });
  } catch (error: any) {
    console.error('[Orchestrator API] Status error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /orchestrator/execute
 * Direct execution (bypass approval for low-risk plans, checks quotas)
 */
router.post('/execute', requireOrchestratorAction('execute') as any, async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { input, userId, context } = req.body;

    if (!input || !userId) {
      return res.status(400).json({ error: 'Input and userId required' });
    }

    // Check user quota before proceeding
    const quotaCheck = await globalPermissionControl.checkQuota(userId);
    if (!quotaCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Quota exceeded',
        reason: quotaCheck.reason,
      });
    }

    // Classify + plan
    const intent = await intentRouter.classify(input);
    const plan = await taskPlanner.createPlan(intent, userId, context);

    // Only allow low-risk plans to execute directly
    if (plan.requiresApproval || plan.riskLevel !== 'low') {
      return res.status(403).json({
        success: false,
        error: 'Plan requires approval',
        planId: plan.planId,
      });
    }

    // Save plan
    await planStore.saveNewPlan({
      plan,
      createdAt: new Date(),
      status: 'approved',
    });

    // Increment execution count
    await globalPermissionControl.incrementExecution(userId);

    // Queue or execute directly
    if (queueInitialized) {
      // Get user priority
      const priority = await globalPermissionControl.getUserPriority(userId);
      
      const job = await enqueuePlanExecution(plan.planId, plan, userId, { priority });
      trackExecutorPerformance(Date.now() - startTime, true, {
        planId: plan.planId,
        userId,
        direct: true,
        queued: true,
        priority
      });
      res.json({
        success: true,
        planId: plan.planId,
        jobId: job,
        priority,
        message: 'Plan queued for execution',
      });
    } else {
      const result = await taskExecutor.executePlan(plan);
      
      // Decrement on completion
      await globalPermissionControl.decrementExecution(userId);
      
      trackExecutorPerformance(Date.now() - startTime, true, {
        planId: plan.planId,
        userId,
        direct: true,
        queued: false
      });
      res.json({
        success: true,
        result,
      });
    }
  } catch (error: any) {
    trackExecutorPerformance(Date.now() - startTime, false, { executionError: true });
    trackOrchestratorError('executor', error, { message: error?.message });
    console.error('[Orchestrator API] Execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /orchestrator/health
 * Health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const routerHealth = await intentRouter.healthCheck();
    const monitoring = getMonitoring();
    const health = monitoring.getHealth();

    res.json({
      success: true,
      services: {
        intentRouter: routerHealth ? 'healthy' : 'degraded',
        planner: 'healthy',
        executor: 'healthy',
      },
      monitoring: health,
      timestamp: new Date(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /orchestrator/metrics
 * Get monitoring metrics
 */
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const monitoring = getMonitoring();
    
    res.json({
      success: true,
      performance: monitoring.getPerformanceStats(),
      errors: monitoring.getErrorStats(),
      usage: monitoring.getUsageStats(),
      health: monitoring.getHealth(),
      timestamp: new Date(),
    });
  } catch (error: any) {
    console.error('[Orchestrator API] Metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /orchestrator/cancel
 * Cancel an executing plan (cancels both queue job and execution)
 */
router.post('/cancel', async (req: Request, res: Response) => {
  try {
    const { planId, jobId } = req.body;
    if (!planId) {
      return res.status(400).json({ success: false, error: 'planId required' });
    }

    const pending = await planStore.get(planId);
    if (!pending) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }

    // Cancel queue job if provided
    if (jobId && queueInitialized) {
      await cancelJob(jobId);
    }

    // Cancel execution
    await taskExecutor.cancelExecution(planId);
    await planStore.update(planId, {
      status: 'cancelled',
      cancelledAt: new Date(),
    });

    res.json({ success: true, planId, status: 'cancelled' });
  } catch (error: any) {
    console.error('[Orchestrator API] Cancel error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /orchestrator/quota/:userId
 * Get user quota and rate limit status (Week 5)
 */
router.get('/quota/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId required' 
      });
    }

    const status = await globalPermissionControl.getRateLimitStatus(userId);
    
    res.json({
      success: true,
      userId,
      quota: status,
    });
  } catch (error: any) {
    console.error('[Orchestrator API] Quota status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /orchestrator/job/:jobId
 * Get job status from queue (Week 3)
 */
// Removed invalid duplicate handler declaration (fixed below)
  // Fix: missing arrow in async handler
  router.get('/job/:jobId', async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;

      if (!queueInitialized) {
        return res.status(503).json({ 
          success: false, 
          error: 'Queue not available' 
        });
      }

      const jobStatus = await getJobStatus(jobId);
      if (!jobStatus) {
        return res.status(404).json({ 
          success: false, 
          error: 'Job not found' 
        });
      }

      res.json({
        success: true,
        job: jobStatus,
      });
    } catch (error: any) {
      console.error('[Orchestrator API] Job status error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

/**
 * POST /orchestrator/retry/:jobId
 * Retry a failed job (Week 3)
 */
router.post('/retry/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    if (!queueInitialized) {
      return res.status(503).json({ 
        success: false, 
        error: 'Queue not available' 
      });
    }

    const retried = await retryJob(jobId);
    res.json({
      success: retried,
      jobId,
      message: retried ? 'Job retry queued' : 'Retry failed',
    });
  } catch (error: any) {
    console.error('[Orchestrator API] Retry error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /orchestrator/queue/metrics
 * Get queue metrics (Week 3)
 */
router.get('/queue/metrics', async (req: Request, res: Response) => {
  try {
    if (!queueInitialized) {
      return res.json({
        success: true,
        available: false,
        message: 'Queue not initialized',
      });
    }

    const metrics = await getQueueMetrics();
    res.json({
      success: true,
      available: true,
      metrics,
    });
  } catch (error: any) {
    console.error('[Orchestrator API] Queue metrics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Async execution helper
 */
async function executeAsync(plan: any, userId: string) {
  const startTime = Date.now();
  const pending = await planStore.get(plan.planId);
  if (!pending) return;

  try {
    // Update status
    await planStore.update(plan.planId, {
      status: 'executing',
      startedAt: new Date(),
    });

    // Execute with WebSocket callbacks
    const result = await taskExecutor.executePlan(plan, {
      onTaskStart: (taskId: string) => {
        sendTaskStarted(plan.planId, taskId, `Executing task ${taskId}`);
      },
      onTaskComplete: (taskId: string, data: any) => {
        sendTaskCompleted(plan.planId, taskId, data);
      },
      onTaskFail: (taskId: string, error: Error) => {
        sendTaskFailed(plan.planId, taskId, error.message);
      },
    });

    trackExecutorPerformance(Date.now() - startTime, true, {
      planId: plan.planId,
      userId,
      totalDurationMs: result.totalDurationMs,
      successRate: result.successRate,
    });

    // Update with result
    await planStore.update(plan.planId, {
      status: 'completed',
      completedAt: new Date(),
      result,
    });

    sendPlanCompleted(plan.planId, result);
    console.log(`[Orchestrator] Plan ${plan.planId} completed:`, result.status);
  } catch (error: any) {
    trackExecutorPerformance(Date.now() - startTime, false, { planId: plan.planId, userId });
    trackOrchestratorError('executor', error, { planId: plan.planId, userId });
    console.error(`[Orchestrator] Plan ${plan.planId} execution error:`, error);

    await planStore.update(plan.planId, {
      status: 'failed',
      completedAt: new Date(),
      error: error.message,
    });

    sendPlanFailed(plan.planId, error.message);
  }
}

export default router;
