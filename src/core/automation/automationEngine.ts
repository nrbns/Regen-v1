/**
 * Automation System - Event-driven rule engine
 * "When X happens, do Y" - explicit, short-lived, visible, cancelable
 * 
 * Example: "When I open research papers, summarize and save them"
 */

import { EventBus } from '../../lib/events/EventBus';
import { taskRunner } from '../../lib/tasks/TaskRunner';
import { workspaceStore } from '../../lib/workspace/WorkspaceStore';

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    event: string; // Event type from EventBus
    condition?: (data: any) => boolean; // Optional condition function
  };
  action: {
    type: 'task' | 'command' | 'custom';
    taskId?: string; // If type='task', run this task
    commandText?: string; // If type='command', run this command
    customFn?: (data: any) => Promise<void>; // If type='custom', run this function
  };
  metadata: {
    createdAt: number;
    lastTriggered?: number;
    triggerCount: number;
  };
}

class AutomationEngine {
  private rules: Map<string, AutomationRule> = new Map();
  private unsubscribers: Map<string, () => void> = new Map();

  constructor() {
    // Register default rules
    this.registerDefaultRules();
  }

  /**
   * Register a new automation rule
   */
  registerRule(rule: AutomationRule): void {
    this.rules.set(rule.id, rule);
    
    if (rule.enabled) {
      this.enableRule(rule.id);
    }
  }

  /**
   * Enable an automation rule (start listening to events)
   */
  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (!rule) return;

    // Unsubscribe if already listening
    this.disableRule(ruleId);

    // Subscribe to event
    const unsubscribe = EventBus.on(rule.trigger.event, async (data: any) => {
      // Check condition (if exists)
      if (rule.trigger.condition && !rule.trigger.condition(data)) {
        return;
      }

      // Execute action
      await this.executeAction(rule, data);

      // Update metadata
      rule.metadata.lastTriggered = Date.now();
      rule.metadata.triggerCount++;
    });

    this.unsubscribers.set(ruleId, unsubscribe);
    rule.enabled = true;
  }

  /**
   * Disable an automation rule (stop listening to events)
   */
  disableRule(ruleId: string): void {
    const unsubscribe = this.unsubscribers.get(ruleId);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribers.delete(ruleId);
    }

    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
    }
  }

  /**
   * Execute automation action
   */
  private async executeAction(rule: AutomationRule, eventData: any): Promise<void> {
    try {
      switch (rule.action.type) {
        case 'task':
          if (rule.action.taskId) {
            await taskRunner.executeTask(rule.action.taskId, { ...eventData, automationRule: rule.id });
          }
          break;

        case 'command':
          if (rule.action.commandText) {
            // Emit command event for CommandController to handle
            window.dispatchEvent(new CustomEvent('regen:execute-command', {
              detail: { command: rule.action.commandText, context: eventData }
            }));
          }
          break;

        case 'custom':
          if (rule.action.customFn) {
            await rule.action.customFn(eventData);
          }
          break;
      }

      // Emit automation executed event
      EventBus.emit('AUTOMATION_EXECUTED', { ruleId: rule.id, eventData });
    } catch (error) {
      console.error(`[AutomationEngine] Failed to execute rule ${rule.id}:`, error);
      EventBus.emit('AUTOMATION_ERROR', { ruleId: rule.id, error });
    }
  }

  /**
   * Get all registered rules
   */
  getRules(): AutomationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): AutomationRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Delete a rule
   */
  deleteRule(ruleId: string): void {
    this.disableRule(ruleId);
    this.rules.delete(ruleId);
  }

  /**
   * Register default automation rules
   */
  private registerDefaultRules(): void {
    // Example: Auto-summarize academic papers
    this.registerRule({
      id: 'auto-summarize-academic',
      name: 'Auto-summarize academic papers',
      enabled: false, // Disabled by default - user must enable
      trigger: {
        event: 'PAGE_LOAD',
        condition: (data) => {
          const url = data?.url || '';
          return (
            url.includes('arxiv.org') ||
            url.includes('scholar.google.com') ||
            url.includes('pubmed.ncbi.nlm.nih.gov') ||
            url.includes('.pdf')
          );
        },
      },
      action: {
        type: 'task',
        taskId: 'summarize_page',
      },
      metadata: {
        createdAt: Date.now(),
        triggerCount: 0,
      },
    });

    // Example: Auto-save important pages
    this.registerRule({
      id: 'auto-save-long-reads',
      name: 'Auto-save long articles',
      enabled: false,
      trigger: {
        event: 'SCROLL',
        condition: (data) => {
          // Trigger if user scrolled past 80% and spent >2min on page
          return data?.depth > 0.8 && data?.timeOnPage > 120000;
        },
      },
      action: {
        type: 'custom',
        customFn: async (data) => {
          // Save to workspace
          workspaceStore.add({
            title: document.title || 'Saved Article',
            content: data?.url || window.location.href,
            type: 'auto_saved',
            metadata: { savedBy: 'automation', ruleId: 'auto-save-long-reads' },
          });
        },
      },
      metadata: {
        createdAt: Date.now(),
        triggerCount: 0,
      },
    });

    // Example: Close duplicate tabs automatically
    this.registerRule({
      id: 'auto-close-duplicates',
      name: 'Auto-close duplicate tabs',
      enabled: false,
      trigger: {
        event: 'TAB_REDUNDANT',
      },
      action: {
        type: 'command',
        commandText: 'close duplicate tabs',
      },
      metadata: {
        createdAt: Date.now(),
        triggerCount: 0,
      },
    });
  }
}

// Singleton instance
export const automationEngine = new AutomationEngine();
