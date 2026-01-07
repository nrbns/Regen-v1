/**
 * Orchestrator Test Suite - Week 1 Validation
 * Tests for Intent Router, Planner, Executor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntentRouter } from '../services/agentOrchestrator/intentRouter';
import { TaskPlanner } from '../services/agentOrchestrator/planner';
import { TaskExecutor } from '../services/agentOrchestrator/executor';

describe('IntentRouter', () => {
  let router: IntentRouter;

  beforeEach(() => {
    router = new IntentRouter();
  });

  it('should classify email intent correctly', async () => {
    const result = await router.classify('Send an email to john@example.com');

    expect(result.primaryAgent).toBe('mail');
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.intent).toContain('email');
  });

  it('should classify presentation intent correctly', async () => {
    const result = await router.classify('Create a presentation about Q4 results');

    expect(result.primaryAgent).toBe('ppt');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('should classify booking intent correctly', async () => {
    const result = await router.classify('Book a flight to New York next week');

    expect(result.primaryAgent).toBe('booking');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('should classify research intent correctly', async () => {
    const result = await router.classify('What is quantum computing?');

    expect(result.primaryAgent).toBe('research');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('should classify trading intent correctly', async () => {
    const result = await router.classify('Buy 100 shares of AAPL');

    expect(result.primaryAgent).toBe('trading');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('should handle batch classification', async () => {
    const inputs = ['Send email', 'Create slides', 'Book flight'];

    const results = await router.classifyBatch(inputs);

    expect(results).toHaveLength(3);
    expect(results[0].primaryAgent).toBe('mail');
    expect(results[1].primaryAgent).toBe('ppt');
    expect(results[2].primaryAgent).toBe('booking');
  });

  it('should complete classification under 100ms', async () => {
    const start = Date.now();
    await router.classify('Quick test');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('should provide alternative agents', async () => {
    const result = await router.classify('Search for something');

    expect(result.alternativeAgents).toBeDefined();
    expect(Array.isArray(result.alternativeAgents)).toBe(true);
  });

  it('should pass health check', async () => {
    const healthy = await router.healthCheck();
    expect(healthy).toBe(true);
  });
});

describe('TaskPlanner', () => {
  let planner: TaskPlanner;

  beforeEach(() => {
    planner = new TaskPlanner();
  });

  it('should create plan for email intent', async () => {
    const intent = {
      primaryAgent: 'mail' as const,
      intent: 'send_email',
      confidence: 0.95,
      alternativeAgents: [],
      parameters: { to: 'test@example.com', subject: 'Test' },
      reasoning: 'Email keywords detected',
    };

    const plan = await planner.createPlan(intent, 'user123');

    expect(plan.planId).toBeDefined();
    expect(plan.tasks.length).toBeGreaterThan(0);
    expect(plan.intent).toBe(intent);
    expect(plan.userId).toBe('user123');
  });

  it('should create DAG with dependencies', async () => {
    const intent = {
      primaryAgent: 'ppt' as const,
      intent: 'create_presentation',
      confidence: 0.92,
      alternativeAgents: [],
      parameters: { topic: 'AI' },
      reasoning: 'PPT keywords',
    };

    const plan = await planner.createPlan(intent, 'user123');

    // PPT plan should have multiple tasks with dependencies
    expect(plan.tasks.length).toBeGreaterThan(1);

    const hasDependent = plan.tasks.some(t => t.dependencies.length > 0);
    expect(hasDependent).toBe(true);
  });

  it('should mark high-risk plans correctly', async () => {
    const intent = {
      primaryAgent: 'booking' as const,
      intent: 'search_and_book',
      confidence: 0.9,
      alternativeAgents: [],
      parameters: { type: 'flight' },
      reasoning: 'Booking keywords',
    };

    const plan = await planner.createPlan(intent, 'user123');

    expect(plan.riskLevel).toBe('high');
    expect(plan.requiresApproval).toBe(true);
  });

  it('should validate plan without cycles', async () => {
    const intent = {
      primaryAgent: 'research' as const,
      intent: 'web_search',
      confidence: 0.88,
      alternativeAgents: [],
      parameters: { query: 'test' },
      reasoning: 'Research',
    };

    const plan = await planner.createPlan(intent, 'user123');
    const validation = planner.validatePlan(plan);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should get execution order', async () => {
    const intent = {
      primaryAgent: 'ppt' as const,
      intent: 'create_presentation',
      confidence: 0.92,
      alternativeAgents: [],
      parameters: { topic: 'test' },
      reasoning: 'PPT',
    };

    const plan = await planner.createPlan(intent, 'user123');
    const order = planner.getExecutionOrder(plan);

    expect(order.length).toBe(plan.tasks.length);

    // First task should have no dependencies
    expect(order[0].dependencies).toHaveLength(0);
  });

  it('should estimate duration', async () => {
    const intent = {
      primaryAgent: 'mail' as const,
      intent: 'send_email',
      confidence: 0.95,
      alternativeAgents: [],
      parameters: {},
      reasoning: 'Email',
    };

    const plan = await planner.createPlan(intent, 'user123');

    expect(plan.totalEstimatedDuration).toBeGreaterThan(0);
    expect(plan.totalEstimatedDuration).toBeLessThan(300); // Under 5 min
  });

  it('should create plan under 5s', async () => {
    const intent = {
      primaryAgent: 'research' as const,
      intent: 'web_search',
      confidence: 0.9,
      alternativeAgents: [],
      parameters: { query: 'test' },
      reasoning: 'Research',
    };

    const start = Date.now();
    await planner.createPlan(intent, 'user123');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000);
  });
});

describe('TaskExecutor', () => {
  let executor: TaskExecutor;

  beforeEach(() => {
    executor = new TaskExecutor();

    // Register mock agents
    executor.registerAgent('mail', {
      execute: async (action: string, params: any) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { success: true, action, params };
      },
    });

    executor.registerAgent('research', {
      execute: async (action: string, params: any) => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return { results: ['result1', 'result2'] };
      },
    });

    executor.registerAgent('ppt', {
      execute: async (action: string, params: any) => {
        await new Promise(resolve => setTimeout(resolve, 15));
        return { slides: 5 };
      },
    });
  });

  it('should execute simple plan successfully', async () => {
    const plan = {
      planId: 'test_plan_1',
      userId: 'user123',
      intent: {} as any,
      tasks: [
        {
          id: 'task_1',
          agentType: 'mail' as const,
          action: 'send_email',
          parameters: { to: 'test@example.com' },
          dependencies: [],
          estimatedDuration: 5,
          retryable: true,
          criticalPath: true,
        },
      ],
      totalEstimatedDuration: 5,
      riskLevel: 'low' as const,
      requiresApproval: false,
      createdAt: new Date(),
    };

    const result = await executor.executePlan(plan);

    expect(result.status).toBe('completed');
    expect(result.taskResults).toHaveLength(1);
    expect(result.taskResults[0].status).toBe('success');
    expect(result.successRate).toBe(1);
  });

  it('should handle task dependencies', async () => {
    const plan = {
      planId: 'test_plan_2',
      userId: 'user123',
      intent: {} as any,
      tasks: [
        {
          id: 'task_1',
          agentType: 'research' as const,
          action: 'search',
          parameters: { query: 'test' },
          dependencies: [],
          estimatedDuration: 5,
          retryable: true,
          criticalPath: true,
        },
        {
          id: 'task_2',
          agentType: 'ppt' as const,
          action: 'create_slides',
          parameters: { data: 'task_1_output' },
          dependencies: ['task_1'],
          estimatedDuration: 10,
          retryable: true,
          criticalPath: true,
        },
      ],
      totalEstimatedDuration: 15,
      riskLevel: 'low' as const,
      requiresApproval: false,
      createdAt: new Date(),
    };

    const result = await executor.executePlan(plan);

    expect(result.status).toBe('completed');
    expect(result.taskResults).toHaveLength(2);

    // Task 2 should execute after task 1
    const task1End = result.taskResults[0].endTime.getTime();
    const task2Start = result.taskResults[1].startTime.getTime();
    expect(task2Start).toBeGreaterThanOrEqual(task1End);
  });

  it('should retry failed tasks', async () => {
    let attemptCount = 0;

    executor.registerAgent('flaky', {
      execute: async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Flaky error');
        }
        return { success: true };
      },
    });

    const plan = {
      planId: 'test_plan_3',
      userId: 'user123',
      intent: {} as any,
      tasks: [
        {
          id: 'task_1',
          agentType: 'flaky' as any,
          action: 'flaky_action',
          parameters: {},
          dependencies: [],
          estimatedDuration: 5,
          retryable: true,
          criticalPath: true,
        },
      ],
      totalEstimatedDuration: 5,
      riskLevel: 'low' as const,
      requiresApproval: false,
      createdAt: new Date(),
    };

    const result = await executor.executePlan(plan);

    expect(result.taskResults[0].status).toBe('success');
    expect(result.taskResults[0].retryCount).toBeGreaterThan(0);
    expect(attemptCount).toBe(3);
  });

  it('should skip dependent tasks when parent fails', async () => {
    executor.registerAgent('failing', {
      execute: async () => {
        throw new Error('Always fails');
      },
    });

    const plan = {
      planId: 'test_plan_4',
      userId: 'user123',
      intent: {} as any,
      tasks: [
        {
          id: 'task_1',
          agentType: 'failing' as any,
          action: 'fail',
          parameters: {},
          dependencies: [],
          estimatedDuration: 5,
          retryable: false,
          criticalPath: true,
        },
        {
          id: 'task_2',
          agentType: 'mail' as const,
          action: 'send',
          parameters: {},
          dependencies: ['task_1'],
          estimatedDuration: 5,
          retryable: true,
          criticalPath: false,
        },
      ],
      totalEstimatedDuration: 10,
      riskLevel: 'low' as const,
      requiresApproval: false,
      createdAt: new Date(),
    };

    const result = await executor.executePlan(plan);

    expect(result.taskResults[0].status).toBe('failure');
    expect(result.taskResults[1].status).toBe('skipped');
  });

  it('should track execution state', async () => {
    const plan = {
      planId: 'test_plan_5',
      userId: 'user123',
      intent: {} as any,
      tasks: [
        {
          id: 'task_1',
          agentType: 'mail' as const,
          action: 'send',
          parameters: {},
          dependencies: [],
          estimatedDuration: 5,
          retryable: true,
          criticalPath: true,
        },
      ],
      totalEstimatedDuration: 5,
      riskLevel: 'low' as const,
      requiresApproval: false,
      createdAt: new Date(),
    };

    await executor.executePlan(plan);

    const state = executor.getExecutionState('task_1');
    expect(state).toBe('completed');
  });
});

describe('End-to-End Integration', () => {
  it('should complete full orchestration flow', async () => {
    const router = new IntentRouter();
    const planner = new TaskPlanner();
    const executor = new TaskExecutor();

    // Register agents
    executor.registerAgent('research', {
      execute: async () => ({ results: ['data'] }),
    });

    // 1. Classify intent
    const intent = await router.classify('Search for quantum computing');
    expect(intent.primaryAgent).toBe('research');

    // 2. Create plan
    const plan = await planner.createPlan(intent, 'user123');
    expect(plan.tasks.length).toBeGreaterThan(0);

    // 3. Validate plan
    const validation = planner.validatePlan(plan);
    expect(validation.valid).toBe(true);

    // 4. Execute plan
    const result = await executor.executePlan(plan);
    expect(result.status).toBe('completed');
    expect(result.successRate).toBeGreaterThan(0.8);
  }, 30000); // 30s timeout
});
