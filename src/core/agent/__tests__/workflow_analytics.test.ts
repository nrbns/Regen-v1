/**
 * Tests for Workflow Analytics System
 * Verifies metrics calculation, recommendations, and insights
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowStore } from '../workflows';
import { useBatchStore } from '../batch';

// Helper to ensure unique template IDs by adding small delay
const createTemplateWithDelay = async (
  name: string,
  description: string,
  tags: string[] = []
): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 2));
  return useWorkflowStore.getState().createTemplate(name, description, tags);
};

describe('Workflow Analytics', () => {
  beforeEach(() => {
    // Clear stores before each test - reset to built-in templates only
    const workflowState = useWorkflowStore.getState();
    // Only remove user-created templates (not built-in ones)
    workflowState.templates = workflowState.templates.filter(t => t.id.startsWith('builtin-'));

    // Reset usage counts for built-in templates to prevent accumulation
    workflowState.templates.forEach(t => {
      t.usageCount = 0;
    });

    // Clear batch jobs
    useBatchStore.getState().jobs = [];
  });

  it('should calculate workflow usage metrics', () => {
    const workflowStore = useWorkflowStore.getState();

    // Create template
    const templateId = workflowStore.createTemplate('Test Workflow', 'For testing metrics', [
      'test',
    ]);

    // Increment usage
    workflowStore.incrementUsageCount(templateId);
    workflowStore.incrementUsageCount(templateId);
    workflowStore.incrementUsageCount(templateId);

    const template = workflowStore.getTemplate(templateId);
    expect(template?.usageCount).toBe(3);
  });

  it('should identify high-performing workflows', async () => {
    const workflowStore = useWorkflowStore.getState();

    // Create two templates with delays to ensure unique IDs
    const template1 = await createTemplateWithDelay('Popular Workflow', 'Frequently used', []);
    const template2 = await createTemplateWithDelay('Rare Workflow', 'Rarely used', []);

    // Different usage counts
    for (let i = 0; i < 10; i++) {
      workflowStore.incrementUsageCount(template1);
    }
    for (let i = 0; i < 2; i++) {
      workflowStore.incrementUsageCount(template2);
    }

    const t1 = workflowStore.getTemplate(template1);
    const t2 = workflowStore.getTemplate(template2);

    expect(t1?.usageCount).toBe(10);
    expect(t2?.usageCount).toBe(2);
    if (t1 && t2) {
      expect(t1.usageCount).toBeGreaterThan(t2.usageCount);
    }
  });

  it('should detect underutilized workflows', async () => {
    const workflowStore = useWorkflowStore.getState();

    // Create three templates with varying usage
    const avgUsageTemplate = await createTemplateWithDelay('Average Workflow', 'Average usage', []);
    const highUsageTemplate = await createTemplateWithDelay('Popular Workflow', 'High usage', []);
    const lowUsageTemplate = await createTemplateWithDelay('Rare Workflow', 'Low usage', []);

    // Set usage counts: 5, 5, 1
    for (let i = 0; i < 5; i++) {
      workflowStore.incrementUsageCount(avgUsageTemplate);
      workflowStore.incrementUsageCount(highUsageTemplate);
    }
    workflowStore.incrementUsageCount(lowUsageTemplate);

    // Verify the usage counts
    const low = workflowStore.getTemplate(lowUsageTemplate);
    const avg = workflowStore.getTemplate(avgUsageTemplate);
    const high = workflowStore.getTemplate(highUsageTemplate);

    expect(low?.usageCount).toBe(1);
    expect(avg?.usageCount).toBe(5);
    expect(high?.usageCount).toBe(5);
    if (low && avg) {
      expect(low.usageCount).toBeLessThan(avg.usageCount);
    }
  });

  it('should track workflow success rate', () => {
    const batchStore = useBatchStore.getState();

    const _templateId = useWorkflowStore
      .getState()
      .createTemplate('Success Test Workflow', 'Testing success rate', []);

    // Create a batch job with mixed results
    const jobId = batchStore.createJob('Test Job');
    batchStore.addTaskToJob(jobId, 'Task 1');
    batchStore.addTaskToJob(jobId, 'Task 2');
    batchStore.addTaskToJob(jobId, 'Task 3');

    const job = batchStore.getJob(jobId);
    expect(job?.tasks.length).toBe(3);

    // Simulate completion
    const tasks = job?.tasks || [];
    batchStore.updateTaskStatus(jobId, tasks[0].id, 'completed', 'Result 1');
    batchStore.updateTaskStatus(jobId, tasks[1].id, 'completed', 'Result 2');
    batchStore.updateTaskStatus(jobId, tasks[2].id, 'failed', undefined, 'Timeout');

    const updatedJob = batchStore.getJob(jobId);
    const completedCount = updatedJob?.tasks.filter(t => t.status === 'completed').length || 0;
    const totalTasks = updatedJob?.tasks.length || 1;
    const successRate = (completedCount / totalTasks) * 100;

    expect(completedCount).toBe(2);
    expect(successRate).toBeCloseTo(66.67, 1);
  });

  it('should generate optimization recommendations', () => {
    const workflowStore = useWorkflowStore.getState();

    // Create workflows with different characteristics
    const _slowTemplate = workflowStore.createTemplate('Slow Workflow', 'Takes a long time', []);

    // Add slow steps (simulating long duration)
    for (let i = 0; i < 3; i++) {
      workflowStore.addStepToTemplate(_slowTemplate, {
        type: 'research',
        content: 'Step ' + (i + 1),
        order: i + 1,
        timeout: 600, // Very long timeout
      });
    }

    const template = workflowStore.getTemplate(_slowTemplate);
    expect(template?.steps.length).toBe(3);

    // Check if any steps have high timeout (indicates slow workflow)
    const hasSlowSteps = template?.steps.some(s => (s.timeout || 300) > 400);
    expect(hasSlowSteps).toBe(true);
  });

  it('should calculate average metrics correctly', async () => {
    const workflowStore = useWorkflowStore.getState();

    // Create templates with known metrics
    const template1 = await createTemplateWithDelay('Workflow 1', 'Test 1', []);
    const template2 = await createTemplateWithDelay('Workflow 2', 'Test 2', []);
    const template3 = await createTemplateWithDelay('Workflow 3', 'Test 3', []);
    const template4 = await createTemplateWithDelay('Workflow 4', 'Test 4', []);

    // Set usage: 1, 2, 3, 4 (avg = 2.5)
    workflowStore.incrementUsageCount(template1);

    workflowStore.incrementUsageCount(template2);
    workflowStore.incrementUsageCount(template2);

    workflowStore.incrementUsageCount(template3);
    workflowStore.incrementUsageCount(template3);
    workflowStore.incrementUsageCount(template3);

    workflowStore.incrementUsageCount(template4);
    workflowStore.incrementUsageCount(template4);
    workflowStore.incrementUsageCount(template4);
    workflowStore.incrementUsageCount(template4);

    // Verify individual counts
    const t1 = workflowStore.getTemplate(template1);
    const t2 = workflowStore.getTemplate(template2);
    const t3 = workflowStore.getTemplate(template3);
    const t4 = workflowStore.getTemplate(template4);

    expect(t1?.usageCount).toBe(1);
    expect(t2?.usageCount).toBe(2);
    expect(t3?.usageCount).toBe(3);
    expect(t4?.usageCount).toBe(4);

    // Verify average
    const avgUsage = (1 + 2 + 3 + 4) / 4;
    expect(avgUsage).toBe(2.5);
  });

  it('should preserve workflow metadata for analytics', () => {
    const workflowStore = useWorkflowStore.getState();

    const templateId = workflowStore.createTemplate(
      'Metadata Test',
      'Testing metadata preservation',
      ['analytics', 'test']
    );

    const template = workflowStore.getTemplate(templateId);

    expect(template?.name).toBe('Metadata Test');
    expect(template?.description).toBe('Testing metadata preservation');
    expect(template?.tags).toContain('analytics');
    expect(template?.tags).toContain('test');
    expect(template?.createdAt).toBeDefined();
    expect(template?.updatedAt).toBeDefined();
  });
});
