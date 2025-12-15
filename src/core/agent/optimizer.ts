/**
 * Workflow Optimization Engine
 * Automatically applies performance improvements based on analytics
 */

import { create } from 'zustand';
import type { WorkflowTemplate, WorkflowStep } from './workflows';
import { useWorkflowStore } from './workflows';

export type OptimizationType = 
  | 'parallel_execution'    // Run independent steps in parallel
  | 'timeout_adjustment'    // Optimize timeout values
  | 'step_consolidation'    // Merge similar consecutive steps
  | 'step_reordering'       // Reorder for better efficiency
  | 'duplicate_removal';    // Remove redundant steps

export interface OptimizationSuggestion {
  id: string;
  type: OptimizationType;
  templateId: string;
  templateName: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  estimatedImprovement: string; // e.g., "30% faster", "2 fewer steps"
  changes: {
    before: Partial<WorkflowStep>[];
    after: Partial<WorkflowStep>[];
  };
  autoApplicable: boolean; // Can be applied without user review
  createdAt: number;
  appliedAt?: number;
}

export interface OptimizationResult {
  suggestionId: string;
  success: boolean;
  error?: string;
  newTemplateId?: string;
  changes: string[];
}

interface OptimizerState {
  suggestions: OptimizationSuggestion[];
  history: OptimizationResult[];
  
  // Analysis
  generateSuggestions: (template: WorkflowTemplate, executionMetrics?: {
    avgDuration: number;
    successRate: number;
    usageCount: number;
  }) => OptimizationSuggestion[];
  
  // Application
  applySuggestion: (suggestionId: string) => OptimizationResult;
  applyMultiple: (suggestionIds: string[]) => OptimizationResult[];
  
  // Management
  dismissSuggestion: (suggestionId: string) => void;
  clearHistory: () => void;
  getSuggestionsForTemplate: (templateId: string) => OptimizationSuggestion[];
}

/**
 * Detect steps that can run in parallel
 */
function detectParallelOpportunities(steps: WorkflowStep[]): WorkflowStep[][] {
  const groups: WorkflowStep[][] = [];
  let currentGroup: WorkflowStep[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const nextStep = steps[i + 1];

    // Steps can run in parallel if they don't depend on each other's output
    // For simplicity, we check if consecutive steps are both 'goal' type
    // and don't reference each other
    if (nextStep && 
        step.type === 'goal' && 
        nextStep.type === 'goal' &&
        !nextStep.content.toLowerCase().includes('previous') &&
        !nextStep.content.toLowerCase().includes('above')) {
      currentGroup.push(step, nextStep);
      i++; // Skip next since we've added it
    } else if (currentGroup.length > 0) {
      groups.push([...currentGroup]);
      currentGroup = [];
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups.filter(g => g.length >= 2);
}

/**
 * Analyze timeout values and suggest optimizations
 */
function analyzeTimeouts(steps: WorkflowStep[], avgDuration: number): {
  tooLong: WorkflowStep[];
  tooShort: WorkflowStep[];
  optimal: number;
} {
  const DEFAULT_TIMEOUT = 300;
  const avgPerStep = avgDuration / steps.length;
  const optimalTimeout = Math.max(avgPerStep * 1.5, 5000); // 150% of avg, min 5s

  const tooLong = steps.filter(s => (s.timeout || DEFAULT_TIMEOUT) > optimalTimeout * 2);
  const tooShort = steps.filter(s => (s.timeout || DEFAULT_TIMEOUT) < avgPerStep * 0.5);

  return { tooLong, tooShort, optimal: Math.round(optimalTimeout / 1000) };
}

/**
 * Find duplicate or very similar steps
 */
function findDuplicates(steps: WorkflowStep[]): WorkflowStep[][] {
  const duplicates: WorkflowStep[][] = [];
  const seen = new Map<string, WorkflowStep[]>();

  for (const step of steps) {
    // Normalize content for comparison
    const normalized = step.content.toLowerCase().trim().replace(/\s+/g, ' ');
    
    if (seen.has(normalized)) {
      const group = seen.get(normalized)!;
      group.push(step);
      if (group.length === 2) {
        duplicates.push(group);
      }
    } else {
      seen.set(normalized, [step]);
    }
  }

  return duplicates;
}

/**
 * Detect steps that should be consolidated
 */
function detectConsolidationOpportunities(steps: WorkflowStep[]): WorkflowStep[][] {
  const consolidatable: WorkflowStep[][] = [];

  for (let i = 0; i < steps.length - 1; i++) {
    const step = steps[i];
    const nextStep = steps[i + 1];

    // Check if consecutive steps are very similar (e.g., both search same topic)
    if (step.type === nextStep.type) {
      const words1 = new Set(step.content.toLowerCase().split(/\s+/));
      const words2 = new Set(nextStep.content.toLowerCase().split(/\s+/));
      
      // Calculate word overlap
      const overlap = [...words1].filter(w => words2.has(w)).length;
      const total = Math.max(words1.size, words2.size);
      
      if (overlap / total > 0.5) { // 50% word overlap
        consolidatable.push([step, nextStep]);
        i++; // Skip next
      }
    }
  }

  return consolidatable;
}

export const useOptimizerStore = create<OptimizerState>((set, get) => ({
  suggestions: [],
  history: [],

  generateSuggestions: (template, metrics) => {
    const suggestions: OptimizationSuggestion[] = [];
    const { steps } = template;
    const avgDuration = metrics?.avgDuration || 30000;

    // 1. Parallel execution opportunities
    const parallelGroups = detectParallelOpportunities(steps);
    for (const group of parallelGroups) {
      suggestions.push({
        id: `opt-${Date.now()}-parallel-${group[0].id}`,
        type: 'parallel_execution',
        templateId: template.id,
        templateName: template.name,
        description: `Steps "${group[0].content.slice(0, 30)}..." and "${group[1].content.slice(0, 30)}..." can run simultaneously`,
        impact: 'high',
        estimatedImprovement: '40-50% faster execution',
        changes: {
          before: group.map(s => ({ id: s.id, content: s.content, order: s.order })),
          after: group.map((s, _i) => ({ 
            id: s.id, 
            content: s.content, 
            order: s.order,
            parallel: true 
          }))
        },
        autoApplicable: true,
        createdAt: Date.now(),
      });
    }

    // 2. Timeout adjustments
    const timeoutAnalysis = analyzeTimeouts(steps, avgDuration);
    if (timeoutAnalysis.tooLong.length > 0) {
      suggestions.push({
        id: `opt-${Date.now()}-timeout`,
        type: 'timeout_adjustment',
        templateId: template.id,
        templateName: template.name,
        description: `${timeoutAnalysis.tooLong.length} steps have unnecessarily high timeouts`,
        impact: 'medium',
        estimatedImprovement: `Reduce wait time by ${timeoutAnalysis.tooLong.length * 10}s`,
        changes: {
          before: timeoutAnalysis.tooLong.map(s => ({ 
            id: s.id, 
            timeout: s.timeout 
          })),
          after: timeoutAnalysis.tooLong.map(s => ({ 
            id: s.id, 
            timeout: timeoutAnalysis.optimal * 1000 
          }))
        },
        autoApplicable: false, // User should review timeout changes
        createdAt: Date.now(),
      });
    }

    // 3. Duplicate removal
    const duplicates = findDuplicates(steps);
    for (const dupGroup of duplicates) {
      suggestions.push({
        id: `opt-${Date.now()}-duplicate-${dupGroup[0].id}`,
        type: 'duplicate_removal',
        templateId: template.id,
        templateName: template.name,
        description: `Remove duplicate step: "${dupGroup[0].content.slice(0, 50)}..."`,
        impact: 'medium',
        estimatedImprovement: `${dupGroup.length - 1} fewer steps`,
        changes: {
          before: dupGroup.map(s => ({ id: s.id, content: s.content })),
          after: [dupGroup[0]].map(s => ({ id: s.id, content: s.content }))
        },
        autoApplicable: false,
        createdAt: Date.now(),
      });
    }

    // 4. Step consolidation
    const consolidatable = detectConsolidationOpportunities(steps);
    for (const group of consolidatable) {
      const merged = `${group[0].content} and ${group[1].content}`;
      suggestions.push({
        id: `opt-${Date.now()}-consolidate-${group[0].id}`,
        type: 'step_consolidation',
        templateId: template.id,
        templateName: template.name,
        description: 'Merge similar consecutive steps into one',
        impact: 'low',
        estimatedImprovement: '1 fewer step',
        changes: {
          before: group.map(s => ({ id: s.id, content: s.content })),
          after: [{ id: group[0].id, content: merged }]
        },
        autoApplicable: false,
        createdAt: Date.now(),
      });
    }

    // Store suggestions
    set(state => ({
      suggestions: [...state.suggestions, ...suggestions]
    }));

    return suggestions;
  },

  applySuggestion: (suggestionId) => {
    const suggestion = get().suggestions.find(s => s.id === suggestionId);
    if (!suggestion) {
      return {
        suggestionId,
        success: false,
        error: 'Suggestion not found',
        changes: [],
      };
    }

    // Persist changes into workflow template where applicable
    const wfStore = useWorkflowStore.getState();
    const template = wfStore.getTemplate(suggestion.templateId);
    const changesLog: string[] = [];

    if (template) {
      if (suggestion.type === 'duplicate_removal') {
        // Remove duplicate steps by keeping the first occurrence
        const keepIds = new Set((suggestion.changes.after || []).map(a => a.id));
        wfStore.updateTemplate(template.id, {
          steps: template.steps.filter(s => keepIds.has(s.id)),
          updatedAt: Date.now(),
        });
        changesLog.push('Removed duplicate steps');
      }

      if (suggestion.type === 'step_consolidation') {
        // Replace the first step's content with merged content and remove the second
        const after = suggestion.changes.after?.[0];
        if (after?.id && after.content) {
          const updatedSteps = template.steps.map(s => (s.id === after.id ? { ...s, content: after.content } : s));
          // Remove the second step listed in 'before' if present
          const removeId = suggestion.changes.before?.[1]?.id;
          const finalSteps = removeId ? updatedSteps.filter(s => s.id !== removeId) : updatedSteps;
          wfStore.updateTemplate(template.id, {
            steps: finalSteps,
            updatedAt: Date.now(),
          });
          changesLog.push('Consolidated similar steps');
        }
      }

      if (suggestion.type === 'timeout_adjustment') {
        // Apply new timeout to targeted steps
        const targets = new Map((suggestion.changes.after || []).map(a => [a.id, a.timeout]));
        const updated = template.steps.map(s => (targets.has(s.id) ? { ...s, timeout: targets.get(s.id) } : s));
        wfStore.updateTemplate(template.id, { steps: updated, updatedAt: Date.now() });
        changesLog.push('Adjusted step timeouts');
      }

      if (suggestion.type === 'parallel_execution') {
        // Mark steps as parallel via a hint in description
        const targetIds = new Set((suggestion.changes.after || []).map(a => a.id));
        const updated = template.steps.map(s =>
          targetIds.has(s.id)
            ? { ...s, description: (s.description || '') + ' [parallel]' }
            : s,
        );
        wfStore.updateTemplate(template.id, { steps: updated, updatedAt: Date.now() });
        changesLog.push('Marked steps for parallel execution');
      }
    }

    // Mark as applied
    set(state => ({
      suggestions: state.suggestions.map(s =>
        s.id === suggestionId ? { ...s, appliedAt: Date.now() } : s
      ),
    }));

    const result: OptimizationResult = {
      suggestionId,
      success: true,
      changes: [
        `Applied ${suggestion.type} optimization`,
        `Template: ${suggestion.templateName}`,
        `Impact: ${suggestion.estimatedImprovement}`,
        ...changesLog,
      ],
    };

    // Add to history
    set(state => ({
      history: [...state.history, result],
    }));

    return result;
  },

  applyMultiple: (suggestionIds) => {
    return suggestionIds.map(id => get().applySuggestion(id));
  },

  dismissSuggestion: (suggestionId) => {
    set(state => ({
      suggestions: state.suggestions.filter(s => s.id !== suggestionId),
    }));
  },

  clearHistory: () => {
    set({ history: [] });
  },

  getSuggestionsForTemplate: (templateId) => {
    return get().suggestions.filter(s => s.templateId === templateId);
  },
}));
