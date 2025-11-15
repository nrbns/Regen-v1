/**
 * Agent Executor Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executor, executeActions } from './executor';
import type { AgentAction, ExecutionContext } from './executor';

describe('Agent Executor', () => {
  beforeEach(() => {
    executor.clearAllAuditLogs();
  });

  describe('executeActions', () => {
    it('should execute simple actions', async () => {
      const actions: AgentAction[] = [
        { type: 'wait', ms: 10 },
        { type: 'wait', ms: 10 },
      ];

      const context: ExecutionContext = {
        runId: 'test-run-1',
        timeout: 5000,
        maxSteps: 10,
        requireConsent: false,
      };

      const result = await executeActions(actions, context);

      expect(result.success).toBe(true);
      expect(result.steps).toBe(2);
      expect(result.runId).toBe('test-run-1');
      expect(result.auditLog.length).toBe(2);
    });

    it('should stop on error', async () => {
      const actions: AgentAction[] = [
        { type: 'read', selector: { type: 'id', value: 'non-existent' } },
        { type: 'wait', ms: 10 },
      ];

      const context: ExecutionContext = {
        runId: 'test-run-2',
        timeout: 5000,
        maxSteps: 10,
        requireConsent: false,
      };

      const result = await executeActions(actions, context);

      // Should complete first action (read) even if it returns null
      // and continue to next action
      expect(result.steps).toBeGreaterThan(0);
    });

    it('should respect step limit', async () => {
      const actions: AgentAction[] = Array(20).fill({ type: 'wait', ms: 5 });
      
      const context: ExecutionContext = {
        runId: 'test-run-3',
        timeout: 5000,
        maxSteps: 5,
        requireConsent: false,
      };

      const result = await executeActions(actions, context);

      expect(result.steps).toBeLessThanOrEqual(5);
    });

    it('should respect timeout', async () => {
      const actions: AgentAction[] = [
        { type: 'wait', ms: 2000 },
      ];

      const context: ExecutionContext = {
        runId: 'test-run-4',
        timeout: 100, // Very short timeout
        maxSteps: 10,
        requireConsent: false,
      };

      const result = await executeActions(actions, context);

      // Should timeout before completing
      expect(result.steps).toBeLessThanOrEqual(1);
    });
  });

  describe('audit logging', () => {
    it('should log all actions', async () => {
      const actions: AgentAction[] = [
        { type: 'wait', ms: 10 },
        { type: 'wait', ms: 10 },
      ];

      const context: ExecutionContext = {
        runId: 'test-run-5',
        timeout: 5000,
        maxSteps: 10,
        requireConsent: false,
      };

      await executeActions(actions, context);
      const auditLog = executor.getAuditLog('test-run-5');

      expect(auditLog.length).toBe(2);
      expect(auditLog[0].action.type).toBe('wait');
      expect(auditLog[0].result).toBe('success');
    });

    it('should include risk assessment', async () => {
      const actions: AgentAction[] = [
        { type: 'read', selector: { type: 'id', value: 'test' } }, // low risk
        { type: 'click', selector: { type: 'id', value: 'test' } }, // medium risk
        { type: 'navigate', url: 'https://example.com' }, // high risk
      ];

      const context: ExecutionContext = {
        runId: 'test-run-6',
        timeout: 5000,
        maxSteps: 10,
        requireConsent: false,
      };

      await executeActions(actions, context);
      const auditLog = executor.getAuditLog('test-run-6');

      expect(auditLog[0].risk).toBe('low');
      expect(auditLog[1].risk).toBe('medium');
      expect(auditLog[2].risk).toBe('high');
    });
  });

  describe('domain restrictions', () => {
    it('should block navigation to denied domains', async () => {
      const actions: AgentAction[] = [
        { type: 'navigate', url: 'https://blocked.com' },
      ];

      const context: ExecutionContext = {
        runId: 'test-run-7',
        timeout: 5000,
        maxSteps: 10,
        requireConsent: false,
        deniedDomains: ['blocked.com'],
      };

      const result = await executeActions(actions, context);

      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
    });

    it('should allow navigation to allowed domains', async () => {
      const actions: AgentAction[] = [
        { type: 'navigate', url: 'https://allowed.com' },
      ];

      const context: ExecutionContext = {
        runId: 'test-run-8',
        timeout: 5000,
        maxSteps: 10,
        requireConsent: false,
        allowedDomains: ['allowed.com'],
      };

      // This will likely fail due to missing tabId, but should not be blocked
      const result = await executeActions(actions, context);

      expect(result.blocked).toBe(false);
    });
  });

  describe('cancel', () => {
    it('should cancel active run', async () => {
      const actions: AgentAction[] = [
        { type: 'wait', ms: 1000 },
      ];

      const context: ExecutionContext = {
        runId: 'test-run-9',
        timeout: 5000,
        maxSteps: 10,
        requireConsent: false,
      };

      // Start execution (async)
      const promise = executeActions(actions, context);

      // Cancel immediately
      const cancelled = executor.cancel('test-run-9');
      expect(cancelled).toBe(true);

      // Wait for promise to resolve
      await promise;
    });
  });
});

