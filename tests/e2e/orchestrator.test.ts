import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * End-to-End Test Suite: Mail Agent Flow
 *
 * Tests the complete workflow:
 * 1. Create plan (read emails, summarize)
 * 2. User approves
 * 3. Execute plan
 * 4. Verify results
 * 5. Check audit log
 */

describe('E2E: Mail Agent Flow', () => {
  let apiUrl = 'http://localhost:3001';
  let userId = 'test@example.com';
  let planId: string;
  let executionId: string;

  beforeAll(async () => {
    // Ensure backend is running
    const response = await fetch(`${apiUrl}/health`);
    expect(response.status).toBe(200);
  });

  afterAll(async () => {
    // Cleanup: No cleanup needed for demo
  });

  it('should create a plan to summarize emails', async () => {
    const response = await fetch(`${apiUrl}/api/orchestrate/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        intent: 'Summarize my unread emails',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data).toHaveProperty('planId');
    expect(data).toHaveProperty('agent', 'mail');
    expect(data).toHaveProperty('tasks');
    expect(data.tasks.length).toBeGreaterThan(0);
    expect(data).toHaveProperty('requiresApproval');

    planId = data.planId;

    // Verify plan structure
    expect(data.tasks[0]).toHaveProperty('id');
    expect(data.tasks[0]).toHaveProperty('type');
  });

  it('should show plan preview with risk level', () => {
    expect(planId).toBeDefined();

    // In real test, would verify UI shows preview
    // For now, just verify plan was created
  });

  it('should execute plan with approval token', async () => {
    expect(planId).toBeDefined();

    const response = await fetch(`${apiUrl}/api/orchestrate/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId,
        userId,
        approvalToken: 'mock_approval_token',
      }),
    });

    expect(response.status).toBeOneOf([200, 202]); // 200 = completed, 202 = in progress
    const data = await response.json();

    expect(data).toHaveProperty('executionId');
    expect(data).toHaveProperty('status');

    executionId = data.executionId;
  });

  it('should poll execution status', async () => {
    expect(executionId).toBeDefined();

    // Poll with retries
    let maxRetries = 10;
    let status = 'running';

    for (let i = 0; i < maxRetries; i++) {
      const response = await fetch(`${apiUrl}/api/orchestrate/status/${executionId}`);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('executionId');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('progress');

      status = data.status;

      if (status === 'completed' || status === 'failed') {
        break;
      }

      // Wait 1s before retry
      await new Promise(r => setTimeout(r, 1000));
    }

    expect(['completed', 'failed']).toContain(status);
  });

  it('should retrieve audit trail', async () => {
    expect(planId).toBeDefined();

    const response = await fetch(`${apiUrl}/api/orchestrate/audit/${planId}`);

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data).toHaveProperty('planId', planId);
    expect(data).toHaveProperty('audit');
    expect(Array.isArray(data.audit)).toBe(true);

    // Verify audit entries
    const actions = data.audit.map((entry: any) => entry.action);
    expect(actions).toContain('plan_created');
  });

  it('should have complete audit trail with timestamps', async () => {
    expect(planId).toBeDefined();

    const response = await fetch(`${apiUrl}/api/orchestrate/audit/${planId}`);
    const data = await response.json();

    expect(data.audit.length).toBeGreaterThan(0);

    // Verify each entry has required fields
    data.audit.forEach((entry: any) => {
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('status');
    });
  });
});

describe('E2E: PPT Agent Flow', () => {
  let apiUrl = 'http://localhost:3001';
  let userId = 'test@example.com';
  let planId: string;

  it('should create a plan to generate presentation', async () => {
    const response = await fetch(`${apiUrl}/api/orchestrate/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        intent: 'Create a 5-slide presentation about Q4 results',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data).toHaveProperty('planId');
    expect(data).toHaveProperty('agent', 'ppt');
    expect(data.tasks.length).toBeGreaterThan(0);

    planId = data.planId;
  });

  it('should execute presentation plan', async () => {
    expect(planId).toBeDefined();

    const response = await fetch(`${apiUrl}/api/orchestrate/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId,
        userId,
        approvalToken: 'mock_approval_token',
      }),
    });

    expect(response.status).toBeOneOf([200, 202]);
    const data = await response.json();

    expect(data).toHaveProperty('executionId');
  });
});

describe('E2E: Error Handling', () => {
  let apiUrl = 'http://localhost:3001';
  let userId = 'test@example.com';

  it('should reject invalid intent', async () => {
    const response = await fetch(`${apiUrl}/api/orchestrate/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        intent: '', // Empty intent
      }),
    });

    expect(response.status).toBeOneOf([400, 422]);
  });

  it('should reject execution without approval token', async () => {
    const response = await fetch(`${apiUrl}/api/orchestrate/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: 'invalid_plan',
        userId,
        // Missing approvalToken
      }),
    });

    expect(response.status).toBe(400);
  });

  it('should handle non-existent plan', async () => {
    const response = await fetch(`${apiUrl}/api/orchestrate/audit/non_existent_plan`);

    expect(response.status).toBe(404);
  });
});

describe('E2E: Performance SLOs', () => {
  let apiUrl = 'http://localhost:3001';
  let userId = 'test@example.com';

  it('should create plan in <500ms', async () => {
    const start = Date.now();

    const response = await fetch(`${apiUrl}/api/orchestrate/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        intent: 'Summarize my emails',
      }),
    });

    const duration = Date.now() - start;
    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(500); // SLO: <500ms
  });

  it('should execute plan in <10s', async () => {
    // First create plan
    const planResponse = await fetch(`${apiUrl}/api/orchestrate/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        intent: 'Summarize my emails',
      }),
    });

    const planData = await planResponse.json();
    const planId = planData.planId;

    // Then execute
    const start = Date.now();

    const response = await fetch(`${apiUrl}/api/orchestrate/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId,
        userId,
        approvalToken: 'mock_token',
      }),
    });

    const duration = Date.now() - start;
    expect(response.status).toBeOneOf([200, 202]);
    expect(duration).toBeLessThan(10000); // SLO: <10s
  });
});
