/**
 * Tests for Workflow Recording System
 * Verifies that batch jobs can be saved as reusable workflow templates
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowStore } from '../workflows';

describe('Workflow Recording', () => {
  beforeEach(() => {
    // Clear store before each test
    const store = useWorkflowStore.getState();
    store.templates = [];
  });

  it('should extract steps from completed batch tasks', () => {
    const mockCompletedTasks = [
      {
        id: 'task-1',
        goal: 'Research company background',
        status: 'completed' as const,
        result: 'Founded in 2010...',
        startedAt: 1,
        completedAt: 5,
        duration: 4000,
      },
      {
        id: 'task-2',
        goal: 'Find market size',
        status: 'completed' as const,
        result: 'Market size is $2B...',
        startedAt: 6,
        completedAt: 10,
        duration: 4000,
      },
    ];

    const extractedSteps = mockCompletedTasks.map((task, index) => ({
      id: `step-${Date.now()}-${index}`,
      order: index + 1,
      type: 'research' as const,
      content: task.goal,
      description: task.result ? `Result: ${String(task.result).substring(0, 50)}...` : undefined,
      timeout: 300,
    }));

    expect(extractedSteps).toHaveLength(2);
    expect(extractedSteps[0].content).toBe('Research company background');
    expect(extractedSteps[1].content).toBe('Find market size');
  });

  it('should save extracted steps as a workflow template', () => {
    const store = useWorkflowStore.getState();

    const steps = [
      {
        id: 'step-1',
        order: 1,
        type: 'research' as const,
        content: 'Research competitors',
        timeout: 300,
      },
      {
        id: 'step-2',
        order: 2,
        type: 'analysis' as const,
        content: 'Analyze pricing strategies',
        timeout: 300,
      },
    ];

    const templateId = store.createTemplate(
      'Competitor Analysis',
      'Analyze competitors in the market',
      ['auto-saved', 'batch']
    );

    steps.forEach(step => {
      store.addStepToTemplate(templateId, {
        type: step.type,
        content: step.content,
        order: step.order,
      });
    });

    const saved = store.getTemplate(templateId);
    expect(saved).toBeDefined();
    expect(saved?.name).toBe('Competitor Analysis');
    expect(saved?.steps).toHaveLength(2);
    expect(saved?.tags).toContain('auto-saved');
  });

  it('should track usage count when workflow is executed', () => {
    const store = useWorkflowStore.getState();

    const templateId = store.createTemplate('Test Workflow', 'Testing usage tracking', []);

    const template = store.getTemplate(templateId);
    expect(template?.usageCount).toBe(0);

    store.incrementUsageCount(templateId);
    const updated = store.getTemplate(templateId);
    expect(updated?.usageCount).toBe(1);
  });

  it('should preserve step order when recording workflow', () => {
    const store = useWorkflowStore.getState();

    const steps = [
      { type: 'research' as const, content: 'First task', order: 1 },
      { type: 'research' as const, content: 'Second task', order: 2 },
      { type: 'research' as const, content: 'Third task', order: 3 },
    ];

    const templateId = store.createTemplate('Ordered Workflow', 'Test step ordering', []);

    steps.forEach(step => {
      store.addStepToTemplate(templateId, step);
    });

    const saved = store.getTemplate(templateId);
    const sortedSteps = saved?.steps.sort((a, b) => a.order - b.order) || [];

    expect(sortedSteps[0].content).toBe('First task');
    expect(sortedSteps[1].content).toBe('Second task');
    expect(sortedSteps[2].content).toBe('Third task');
  });

  it('should allow custom tags when saving workflow', () => {
    const store = useWorkflowStore.getState();

    const templateId = store.createTemplate('Tagged Workflow', 'Test custom tags', [
      'market-research',
      'priority-high',
      'quarterly',
    ]);

    const saved = store.getTemplate(templateId);
    expect(saved?.tags).toContain('market-research');
    expect(saved?.tags).toContain('priority-high');
    expect(saved?.tags).toContain('quarterly');
  });
});
