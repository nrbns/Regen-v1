/**
 * Orchestrator Integration Tests
 * Tests full workflow: classify → plan → approve → execute with monitoring & WebSocket
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getIntentRouter } from '../services/agentOrchestrator/intentRouter';
import { getTaskPlanner } from '../services/agentOrchestrator/planner';
import { getTaskExecutor } from '../services/agentOrchestrator/executor';
import { getMonitoring } from '../server/monitoring/orchestrator';

describe('Orchestrator Integration Tests', () => {
  const intentRouter = getIntentRouter();
  const taskPlanner = getTaskPlanner();
  const taskExecutor = getTaskExecutor();
  const monitoring = getMonitoring();

  const testUserId = 'test-user-integration';

  beforeAll(() => {
    console.log('Starting orchestrator integration tests...');
  });

  afterAll(() => {
    console.log('Integration tests complete');

    // Print monitoring stats
    const stats = monitoring.getPerformanceStats();
    console.log('Performance Stats:', stats);

    const health = monitoring.getHealth();
    console.log('Health Status:', health);
  });

  describe('Full Workflow - Email', () => {
    it('should complete full email workflow with monitoring', async () => {
      const startTime = Date.now();

      // 1. Classify
      console.log('Step 1: Classifying intent...');
      const input = 'Send an email to john@example.com about the meeting tomorrow';
      const classification = await intentRouter.classify(input);

      expect(classification.primaryAgent).toBe('mail');
      expect(classification.confidence).toBeGreaterThan(0.8);
      console.log(
        `✓ Classification: ${classification.primaryAgent} (${classification.confidence.toFixed(2)})`
      );

      // 2. Plan
      console.log('Step 2: Creating execution plan...');
      const plan = await taskPlanner.createPlan(classification, testUserId, {
        to: 'john@example.com',
        subject: 'Meeting Tomorrow',
        body: 'Looking forward to our meeting tomorrow.',
      });

      expect(plan).toBeDefined();
      expect(plan.tasks.length).toBeGreaterThan(0);
      expect(plan.planId).toBeDefined();
      console.log(`✓ Plan created: ${plan.tasks.length} tasks`);

      // 3. Validate
      console.log('Step 3: Validating plan...');
      const validation = taskPlanner.validatePlan(plan);

      expect(validation.valid).toBe(true);
      console.log('✓ Plan validation passed');

      // 4. Execute (with monitoring)
      console.log('Step 4: Executing plan...');
      const result = await taskExecutor.executePlan(plan);

      expect(result.status).toBe('completed');
      expect(result.taskResults).toBeDefined();
      console.log(`✓ Execution complete: ${result.status}`);

      // 5. Check monitoring
      const totalTime = Date.now() - startTime;
      const perfStats = monitoring.getPerformanceStats();

      expect(perfStats.count).toBeGreaterThan(0);
      expect(perfStats.successRate).toBeGreaterThan(90);
      console.log(`✓ Monitoring: ${perfStats.count} operations tracked`);
      console.log(`  Total time: ${totalTime}ms`);
      console.log(`  Avg performance: ${perfStats.avgDurationMs.toFixed(0)}ms`);
      console.log(`  Success rate: ${perfStats.successRate.toFixed(1)}%`);
    }, 30000); // 30s timeout
  });

  describe('Full Workflow - PPT', () => {
    it('should complete full PPT workflow', async () => {
      const input = 'Create a PowerPoint presentation about AI trends in 2025';

      console.log('Step 1: Classifying intent...');
      const classification = await intentRouter.classify(input);
      expect(classification.primaryAgent).toBe('ppt');

      console.log('Step 2: Creating plan...');
      const plan = await taskPlanner.createPlan(classification, testUserId, {
        topic: 'AI Trends 2025',
        slides: 10,
      });
      expect(plan.tasks.length).toBeGreaterThan(0);

      console.log('Step 3: Executing...');
      const result = await taskExecutor.executePlan(plan);
      expect(result.status).toBe('completed');

      console.log('✓ PPT workflow complete');
    }, 30000);
  });

  describe('Full Workflow - Research', () => {
    it('should complete full research workflow', async () => {
      const input = 'Research the latest developments in quantum computing';

      console.log('Step 1: Classifying intent...');
      const classification = await intentRouter.classify(input);
      expect(classification.primaryAgent).toBe('research');

      console.log('Step 2: Creating plan...');
      const plan = await taskPlanner.createPlan(classification, testUserId, {
        query: 'quantum computing developments',
      });
      expect(plan.tasks.length).toBeGreaterThan(0);

      console.log('Step 3: Executing...');
      const result = await taskExecutor.executePlan(plan);
      expect(result.status).toBe('completed');

      console.log('✓ Research workflow complete');
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should track errors in monitoring', async () => {
      const errorsBefore = monitoring.getErrorStats().total;

      try {
        // Trigger error with invalid plan
        await taskExecutor.executePlan({
          planId: 'invalid',
          tasks: [],
          userId: testUserId,
        } as any);
      } catch (error) {
        // Expected to fail
      }

      const errorsAfter = monitoring.getErrorStats().total;
      expect(errorsAfter).toBeGreaterThan(errorsBefore);

      console.log('✓ Error tracking works');
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', async () => {
      const metricsBefore = monitoring.getPerformanceStats();

      // Run a classification
      await intentRouter.classify('Test input for metrics');

      const metricsAfter = monitoring.getPerformanceStats();

      expect(metricsAfter.count).toBeGreaterThan(metricsBefore.count);
      expect(metricsAfter.avgDurationMs).toBeDefined();
      expect(metricsAfter.p50).toBeDefined();
      expect(metricsAfter.p95).toBeDefined();
      expect(metricsAfter.p99).toBeDefined();

      console.log('✓ Performance metrics tracking works');
      console.log(`  p50: ${metricsAfter.p50.toFixed(0)}ms`);
      console.log(`  p95: ${metricsAfter.p95.toFixed(0)}ms`);
      console.log(`  p99: ${metricsAfter.p99.toFixed(0)}ms`);
    });
  });

  describe('Health Checks', () => {
    it('should provide health status', () => {
      const health = monitoring.getHealth();

      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(health.checks).toBeDefined();
      expect(health.metrics).toBeDefined();

      console.log('✓ Health check works');
      console.log(`  Status: ${health.status}`);
      console.log(`  Performance check: ${health.checks.performance ? 'PASS' : 'FAIL'}`);
      console.log(`  Success rate check: ${health.checks.successRate ? 'PASS' : 'FAIL'}`);
      console.log(`  Error rate check: ${health.checks.errorRate ? 'PASS' : 'FAIL'}`);
    });
  });

  describe('Usage Tracking', () => {
    it('should track usage statistics', async () => {
      const usageBefore = monitoring.getUsageStats();

      // Perform some operations
      await intentRouter.classify('Send email to test@example.com');
      await intentRouter.classify('Create a presentation');
      await intentRouter.classify('Search for AI news');

      const usageAfter = monitoring.getUsageStats();

      expect(usageAfter.total).toBeGreaterThan(usageBefore.total);
      expect(usageAfter.byAgent).toBeDefined();
      expect(usageAfter.byUser).toBeDefined();

      console.log('✓ Usage tracking works');
      console.log(`  Total operations: ${usageAfter.total}`);
      console.log(`  By agent:`, usageAfter.byAgent);
    });
  });

  describe('Performance Targets', () => {
    it('should meet classification performance target (<100ms)', async () => {
      const times: number[] = [];

      // Run 10 classifications
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await intentRouter.classify('Send email to test@example.com');
        times.push(Date.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

      console.log('✓ Classification performance:');
      console.log(`  Average: ${avgTime.toFixed(0)}ms`);
      console.log(`  p95: ${p95}ms`);
      console.log(`  Target: <100ms`);

      expect(avgTime).toBeLessThan(100);
      expect(p95).toBeLessThan(150);
    }, 15000);

    it('should meet planning performance target (<5s)', async () => {
      const classification = await intentRouter.classify('Send email');

      const start = Date.now();
      const plan = await taskPlanner.createPlan(classification, testUserId);
      const duration = Date.now() - start;

      console.log('✓ Planning performance:');
      console.log(`  Duration: ${duration}ms`);
      console.log(`  Target: <5000ms`);

      expect(duration).toBeLessThan(5000);
    }, 10000);
  });
});
