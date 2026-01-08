/**
 * Tests for Workflow Optimization Engine
 * Verifies optimization detection, suggestion generation, and application
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useOptimizerStore } from '../optimizer';
import { useWorkflowStore } from '../workflows';

describe('Workflow Optimizer', () => {
  beforeEach(() => {
    // Reset stores
    useOptimizerStore.setState({
      suggestions: [],
      history: [],
    });

    const workflowState = useWorkflowStore.getState();
    workflowState.templates = workflowState.templates.filter(t => t.id.startsWith('builtin-'));
    workflowState.templates.forEach(t => {
      t.usageCount = 0;
    });
  });

  it('should detect parallel execution opportunities', () => {
    const workflowStore = useWorkflowStore.getState();
    const optimizerStore = useOptimizerStore.getState();

    // Create workflow with parallel-able steps
    const templateId = workflowStore.createTemplate(
      'Research Workflow',
      'Multiple independent searches',
      []
    );

    workflowStore.addStepToTemplate(templateId, {
      type: 'goal',
      content: 'Research company A background',
      order: 1,
    });

    workflowStore.addStepToTemplate(templateId, {
      type: 'goal',
      content: 'Research company B background',
      order: 2,
    });

    const template = workflowStore.getTemplate(templateId);
    expect(template?.steps.length).toBe(2);

    // Generate suggestions
    const suggestions = optimizerStore.generateSuggestions(template!);

    // Should find parallel opportunity
    const parallelSuggestions = suggestions.filter(s => s.type === 'parallel_execution');
    expect(parallelSuggestions.length).toBeGreaterThan(0);
    expect(parallelSuggestions[0].impact).toBe('high');
    expect(parallelSuggestions[0].autoApplicable).toBe(true);
  });

  it('should detect timeout optimization opportunities', () => {
    const workflowStore = useWorkflowStore.getState();
    const optimizerStore = useOptimizerStore.getState();

    // Create workflow with excessive timeouts
    const templateId = workflowStore.createTemplate(
      'Slow Workflow',
      'Has unnecessarily long timeouts',
      []
    );

    workflowStore.addStepToTemplate(templateId, {
      type: 'goal',
      content: 'Quick search',
      timeout: 60000, // 60 seconds
      order: 1,
    });

    workflowStore.addStepToTemplate(templateId, {
      type: 'goal',
      content: 'Another quick task',
      timeout: 90000, // 90 seconds
      order: 2,
    });

    const template = workflowStore.getTemplate(templateId);

    // Generate suggestions with actual metrics
    const suggestions = optimizerStore.generateSuggestions(template!, {
      avgDuration: 10000, // 10 seconds actual
      successRate: 95,
      usageCount: 5,
    });

    // Should find timeout opportunity
    const timeoutSuggestions = suggestions.filter(s => s.type === 'timeout_adjustment');
    expect(timeoutSuggestions.length).toBeGreaterThan(0);
    expect(timeoutSuggestions[0].impact).toBe('medium');
    expect(timeoutSuggestions[0].autoApplicable).toBe(false); // Requires review
  });

  it('should detect duplicate steps', () => {
    const workflowStore = useWorkflowStore.getState();
    const optimizerStore = useOptimizerStore.getState();

    const templateId = workflowStore.createTemplate(
      'Redundant Workflow',
      'Has duplicate steps',
      []
    );

    // Add duplicate steps
    workflowStore.addStepToTemplate(templateId, {
      type: 'goal',
      content: 'Search for AI trends',
      order: 1,
    });

    workflowStore.addStepToTemplate(templateId, {
      type: 'goal',
      content: 'Search for AI trends', // Exact duplicate
      order: 2,
    });

    const template = workflowStore.getTemplate(templateId);
    const suggestions = optimizerStore.generateSuggestions(template!);

    const duplicateSuggestions = suggestions.filter(s => s.type === 'duplicate_removal');
    expect(duplicateSuggestions.length).toBeGreaterThan(0);
    expect(duplicateSuggestions[0].changes.before.length).toBe(2);
    expect(duplicateSuggestions[0].changes.after.length).toBe(1);
  });

  it('should detect consolidation opportunities', () => {
    const workflowStore = useWorkflowStore.getState();
    const optimizerStore = useOptimizerStore.getState();

    const templateId = workflowStore.createTemplate(
      'Similar Steps Workflow',
      'Has steps that could be merged',
      []
    );

    // Add similar consecutive steps
    workflowStore.addStepToTemplate(templateId, {
      type: 'goal',
      content: 'Research artificial intelligence applications',
      order: 1,
    });

    workflowStore.addStepToTemplate(templateId, {
      type: 'goal',
      content: 'Research artificial intelligence use cases',
      order: 2,
    });

    const template = workflowStore.getTemplate(templateId);
    const suggestions = optimizerStore.generateSuggestions(template!);

    const consolidationSuggestions = suggestions.filter(s => s.type === 'step_consolidation');
    expect(consolidationSuggestions.length).toBeGreaterThan(0);
    expect(consolidationSuggestions[0].impact).toBe('low');
  });

  it('should apply optimization suggestions', () => {
    const optimizerStore = useOptimizerStore.getState();
    const workflowStore = useWorkflowStore.getState();

    // Create a template
    const templateId = workflowStore.createTemplate('Test Workflow', 'For testing', []);
    workflowStore.addStepToTemplate(templateId, {
      type: 'goal',
      content: 'Step 1',
      order: 1,
    });
    workflowStore.addStepToTemplate(templateId, {
      type: 'goal',
      content: 'Step 2',
      order: 2,
    });

    const template = workflowStore.getTemplate(templateId);

    // Generate suggestions
    const suggestions = optimizerStore.generateSuggestions(template!);
    expect(suggestions.length).toBeGreaterThan(0);

    // Apply first suggestion
    const firstSuggestion = suggestions[0];
    const result = optimizerStore.applySuggestion(firstSuggestion.id);

    expect(result.success).toBe(true);
    expect(result.changes.length).toBeGreaterThan(0);

    // Check it's marked as applied
    const updatedSuggestion = optimizerStore
      .getSuggestionsForTemplate(templateId)
      .find(s => s.id === firstSuggestion.id);
    expect(updatedSuggestion?.appliedAt).toBeDefined();

    // Check history
    const history = useOptimizerStore.getState().history;
    expect(history.length).toBe(1);
    expect(history[0].suggestionId).toBe(firstSuggestion.id);

    // Verify template was updated for applicable types
    const updatedTemplate = workflowStore.getTemplate(templateId)!;
    if (firstSuggestion.type === 'parallel_execution') {
      const parallelMarked = updatedTemplate.steps.some(s =>
        (s.description || '').includes('[parallel]')
      );
      expect(parallelMarked).toBe(true);
    }
  });

  it('should apply multiple suggestions', () => {
    const optimizerStore = useOptimizerStore.getState();
    const workflowStore = useWorkflowStore.getState();

    // Create workflow with multiple issues
    const templateId = workflowStore.createTemplate(
      'Multi-Issue Workflow',
      'Multiple problems',
      []
    );

    workflowStore.addStepToTemplate(templateId, {
      type: 'goal',
      content: 'Research topic A',
      order: 1,
    });
    workflowStore.addStepToTemplate(templateId, {
      type: 'goal',
      content: 'Research topic B',
      order: 2,
    });
    workflowStore.addStepToTemplate(templateId, {
      type: 'goal',
      content: 'Research topic A', // Duplicate
      order: 3,
    });

    const template = workflowStore.getTemplate(templateId);
    const suggestions = optimizerStore.generateSuggestions(template!);

    expect(suggestions.length).toBeGreaterThanOrEqual(2);

    // Apply multiple
    const suggestionIds = suggestions.slice(0, 2).map(s => s.id);
    const results = optimizerStore.applyMultiple(suggestionIds);

    expect(results.length).toBe(2);
    expect(results.every(r => r.success)).toBe(true);

    // Check history
    const history = useOptimizerStore.getState().history;
    expect(history.length).toBe(2);
  });

  it('should dismiss suggestions', () => {
    const optimizerStore = useOptimizerStore.getState();
    const workflowStore = useWorkflowStore.getState();

    const templateId = workflowStore.createTemplate('Test', 'Test', []);
    workflowStore.addStepToTemplate(templateId, {
      type: 'goal',
      content: 'Step 1',
      order: 1,
    });
    workflowStore.addStepToTemplate(templateId, {
      type: 'goal',
      content: 'Step 2',
      order: 2,
    });

    const template = workflowStore.getTemplate(templateId);
    const suggestions = optimizerStore.generateSuggestions(template!);
    const initialCount = suggestions.length;

    expect(initialCount).toBeGreaterThan(0);

    // Dismiss first suggestion
    optimizerStore.dismissSuggestion(suggestions[0].id);

    const remainingSuggestions = useOptimizerStore.getState().suggestions;
    expect(remainingSuggestions.length).toBe(initialCount - 1);
    expect(remainingSuggestions.find(s => s.id === suggestions[0].id)).toBeUndefined();
  });

  it('should filter suggestions by template', () => {
    const optimizerStore = useOptimizerStore.getState();
    const workflowStore = useWorkflowStore.getState();

    // Create two templates
    const template1 = workflowStore.createTemplate('Workflow 1', 'First', []);
    const template2 = workflowStore.createTemplate('Workflow 2', 'Second', []);

    // Add steps to both
    [template1, template2].forEach(id => {
      workflowStore.addStepToTemplate(id, {
        type: 'goal',
        content: 'Step A',
        order: 1,
      });
      workflowStore.addStepToTemplate(id, {
        type: 'goal',
        content: 'Step B',
        order: 2,
      });
    });

    // Generate suggestions for both
    const t1 = workflowStore.getTemplate(template1);
    const t2 = workflowStore.getTemplate(template2);

    optimizerStore.generateSuggestions(t1!);
    optimizerStore.generateSuggestions(t2!);

    // Get suggestions for template1 only
    const template1Suggestions = optimizerStore.getSuggestionsForTemplate(template1);

    expect(template1Suggestions.length).toBeGreaterThan(0);
    expect(template1Suggestions.every(s => s.templateId === template1)).toBe(true);
  });

  it('should estimate improvement correctly', () => {
    const optimizerStore = useOptimizerStore.getState();
    const workflowStore = useWorkflowStore.getState();

    const templateId = workflowStore.createTemplate('Performance Test', 'Testing estimates', []);

    workflowStore.addStepToTemplate(templateId, {
      type: 'goal',
      content: 'Task 1',
      order: 1,
    });
    workflowStore.addStepToTemplate(templateId, {
      type: 'goal',
      content: 'Task 2',
      order: 2,
    });

    const template = workflowStore.getTemplate(templateId);
    const suggestions = optimizerStore.generateSuggestions(template!);

    // Every suggestion should have an improvement estimate
    suggestions.forEach(s => {
      expect(s.estimatedImprovement).toBeDefined();
      expect(s.estimatedImprovement.length).toBeGreaterThan(0);
    });
  });
});
