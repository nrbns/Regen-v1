/**
 * Automation Rule Engine - BATTLE 5
 * 
 * Automation without fear.
 * Event → Action → Report → Silence.
 * 
 * Requirements:
 * - Event-based
 * - Explicit
 * - Visible
 * - Temporary
 * - Cancelable
 * 
 * Example: "When I open research papers, summarize and save them."
 * No prompts. No agent chains. No dashboards.
 */

import { eventBus } from '../state/eventBus';
import { patternDetector, type DetectedPattern } from '../pattern/PatternDetector';

export type AutomationEvent =
  | 'pattern:detected'      // Pattern detected (research paper, code repo, etc.)
  | 'tab:opened'            // Tab opened
  | 'tab:navigated'         // Tab navigated to URL
  | 'page:loaded'           // Page finished loading
  | 'user:idle';            // User idle for X seconds

export type AutomationAction =
  | 'summarize'            // Summarize content
  | 'save'                  // Save to workspace
  | 'extract'               // Extract key points
  | 'analyze'               // Analyze content
  | 'compare';              // Compare with previous

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  event: AutomationEvent;
  eventFilter?: {
    patternType?: DetectedPattern['type'];
    urlPattern?: string;
    minConfidence?: number;
  };
  action: AutomationAction;
  actionParams?: Record<string, unknown>;
  confirmBeforeAction?: boolean; // BATTLE 5: Explicit confirmation
  temporary?: boolean;            // BATTLE 5: Temporary rule (expires after use)
  createdAt: number;
  lastTriggered?: number;
  triggerCount: number;
}

/**
 * Automation Rule Engine
 * BATTLE 5: Event → action rules, explicit, visible, temporary, cancelable
 */
class RuleEngine {
  private rules: Map<string, AutomationRule> = new Map();
  private listeners: Set<(rule: AutomationRule) => void> = new Set();
  private activeExecutions: Map<string, { ruleId: string; startedAt: number }> = new Map();

  constructor() {
    // Listen for events that can trigger rules
    eventBus.on('pattern:detected', (pattern: DetectedPattern) => {
      this.handleEvent('pattern:detected', { pattern });
    });

    eventBus.on('TAB_NAVIGATED', (url: string) => {
      this.handleEvent('tab:navigated', { url });
    });

    eventBus.on('TAB_OPENED', (tabId: string) => {
      this.handleEvent('tab:opened', { tabId });
    });

    // Listen for page load
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        this.handleEvent('page:loaded', { url: window.location.href });
      }, { once: false });
    }
  }

  /**
   * Create a new automation rule
   * BATTLE 5: Explicit, visible, temporary, cancelable
   */
  createRule(rule: Omit<AutomationRule, 'id' | 'createdAt' | 'triggerCount'>): AutomationRule {
    const fullRule: AutomationRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      triggerCount: 0,
    };

    this.rules.set(fullRule.id, fullRule);
    this.notifyListeners(fullRule);
    this.saveRules();

    return fullRule;
  }

  /**
   * Handle event and trigger matching rules
   * BATTLE 5: Event-based automation
   */
  private async handleEvent(
    eventType: AutomationEvent,
    eventData: Record<string, unknown>
  ): Promise<void> {
    const matchingRules = Array.from(this.rules.values()).filter(rule => {
      if (!rule.enabled) return false;
      if (rule.event !== eventType) return false;

      // Apply event filters
      if (rule.eventFilter) {
        if (rule.eventFilter.patternType && eventData.pattern) {
          const pattern = eventData.pattern as DetectedPattern;
          if (pattern.type !== rule.eventFilter.patternType) return false;
        }

        if (rule.eventFilter.minConfidence && eventData.pattern) {
          const pattern = eventData.pattern as DetectedPattern;
          if (pattern.confidence < rule.eventFilter.minConfidence) return false;
        }

        if (rule.eventFilter.urlPattern && eventData.url) {
          const url = eventData.url as string;
          if (!new RegExp(rule.eventFilter.urlPattern).test(url)) return false;
        }
      }

      return true;
    });

    // Execute matching rules (one at a time, BATTLE 1)
    for (const rule of matchingRules) {
      await this.executeRule(rule, eventData);
    }
  }

  /**
   * Execute an automation rule
   * BATTLE 5: Explicit, visible, temporary, cancelable
   */
  private async executeRule(
    rule: AutomationRule,
    eventData: Record<string, unknown>
  ): Promise<void> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // BATTLE 5: Visible - emit execution started event
    eventBus.emit('automation:rule:executing', {
      ruleId: rule.id,
      ruleName: rule.name,
      executionId,
      eventData,
    });

    this.activeExecutions.set(executionId, {
      ruleId: rule.id,
      startedAt: Date.now(),
    });

    try {
      // BATTLE 5: Explicit confirmation if required
      if (rule.confirmBeforeAction) {
        const confirmed = await this.requestConfirmation(rule, eventData);
        if (!confirmed) {
          eventBus.emit('automation:rule:cancelled', { ruleId: rule.id, executionId });
          this.activeExecutions.delete(executionId);
          return;
        }
      }

      // Execute action
      await this.executeAction(rule.action, {
        ...rule.actionParams,
        ...eventData,
      });

      // Update rule stats
      rule.lastTriggered = Date.now();
      rule.triggerCount++;
      this.rules.set(rule.id, rule);
      this.saveRules();

      // BATTLE 5: Temporary rules expire after use
      if (rule.temporary) {
        this.deleteRule(rule.id);
      }

      // BATTLE 5: Visible - emit execution completed event
      eventBus.emit('automation:rule:completed', {
        ruleId: rule.id,
        ruleName: rule.name,
        executionId,
      });

    } catch (error) {
      eventBus.emit('automation:rule:failed', {
        ruleId: rule.id,
        ruleName: rule.name,
        executionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Request confirmation before action
   * BATTLE 5: Explicit confirmation
   */
  private async requestConfirmation(
    rule: AutomationRule,
    eventData: Record<string, unknown>
  ): Promise<boolean> {
    return new Promise((resolve) => {
      // Emit confirmation request event (UI will handle this)
      eventBus.emit('automation:rule:confirm', {
        ruleId: rule.id,
        ruleName: rule.name,
        action: rule.action,
        eventData,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }

  /**
   * Execute automation action
   * BATTLE 5: Simple actions, no complex chains
   */
  private async executeAction(
    action: AutomationAction,
    params: Record<string, unknown>
  ): Promise<void> {
    switch (action) {
      case 'summarize':
        // Emit AI task request for summarization
        eventBus.emit('ai:task:request', {
          kind: 'summary',
          prompt: `Summarize this content: ${params.url || 'current page'}`,
          context: params,
        });
        break;

      case 'save':
        // Save to workspace (emit event for workspace system)
        eventBus.emit('workspace:save', {
          url: params.url,
          title: params.title,
          content: params.content,
        });
        break;

      case 'extract':
        // Extract key points
        eventBus.emit('ai:task:request', {
          kind: 'agent',
          prompt: `Extract key points from: ${params.url || 'current page'}`,
          context: params,
        });
        break;

      case 'analyze':
        // Analyze content
        eventBus.emit('ai:task:request', {
          kind: 'agent',
          prompt: `Analyze this content: ${params.url || 'current page'}`,
          context: params,
        });
        break;

      case 'compare':
        // Compare with previous (placeholder)
        eventBus.emit('automation:compare', params);
        break;

      default:
        console.warn('[RuleEngine] Unknown action:', action);
    }
  }

  /**
   * Get all rules
   */
  getRules(): AutomationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rule by ID
   */
  getRule(id: string): AutomationRule | undefined {
    return this.rules.get(id);
  }

  /**
   * Update rule
   */
  updateRule(id: string, updates: Partial<AutomationRule>): void {
    const rule = this.rules.get(id);
    if (!rule) return;

    const updated = { ...rule, ...updates };
    this.rules.set(id, updated);
    this.notifyListeners(updated);
    this.saveRules();
  }

  /**
   * Delete rule
   * BATTLE 5: Cancelable
   */
  deleteRule(id: string): void {
    this.rules.delete(id);
    this.saveRules();
    eventBus.emit('automation:rule:deleted', { ruleId: id });
  }

  /**
   * Enable/disable rule
   */
  toggleRule(id: string, enabled: boolean): void {
    this.updateRule(id, { enabled });
  }

  /**
   * Cancel active execution
   * BATTLE 5: Cancelable
   */
  cancelExecution(executionId: string): void {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      eventBus.emit('automation:rule:cancelled', {
        ruleId: execution.ruleId,
        executionId,
      });
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Subscribe to rule changes
   */
  onRuleChange(callback: (rule: AutomationRule) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify listeners
   */
  private notifyListeners(rule: AutomationRule): void {
    this.listeners.forEach(callback => {
      try {
        callback(rule);
      } catch (error) {
        console.error('[RuleEngine] Error in listener:', error);
      }
    });
  }

  /**
   * Save rules to localStorage
   */
  private saveRules(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const rulesArray = Array.from(this.rules.values());
      localStorage.setItem('regen:automation:rules', JSON.stringify(rulesArray));
    } catch (error) {
      console.warn('[RuleEngine] Failed to save rules:', error);
    }
  }

  /**
   * Load rules from localStorage
   */
  loadRules(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const stored = localStorage.getItem('regen:automation:rules');
      if (!stored) return;

      const rulesArray = JSON.parse(stored) as AutomationRule[];
      rulesArray.forEach(rule => {
        this.rules.set(rule.id, rule);
      });
    } catch (error) {
      console.warn('[RuleEngine] Failed to load rules:', error);
    }
  }
}

// Singleton instance
export const ruleEngine = new RuleEngine();

// Load rules on initialization
if (typeof window !== 'undefined') {
  ruleEngine.loadRules();
}
