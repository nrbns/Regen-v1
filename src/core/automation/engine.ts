/**
 * Automation Engine - Regen-v1
 * 
 * NOTE: Automation is DISABLED by default.
 * All rules must be manually enabled by user.
 * No background execution without explicit user action.
 * 
 * LAYER 4 REQUIREMENTS (README.md lines 517-543):
 * - Explicit: User must explicitly start automations
 * - Short-lived: Max 10 minutes timeout
 * - Visible: Status visible in UI
 * - Cancelable: Instant cancellation via AbortController
 */

import { regenEventBus, RegenEvent } from "../events/eventBus";
import { rules, getRulesForTrigger, AutomationRule } from "./rules";
import { useAvatar } from "../avatar/avatarStore";
import { runAI } from "../ai/aiScheduler";

// Automation execution tracking
export interface AutomationExecution {
  id: string;
  ruleId: string;
  action: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  startTime: number;
  endTime?: number;
  abortController: AbortController;
}

// Maximum automation duration: 10 minutes (LAYER 4: Short-lived)
const MAX_AUTOMATION_DURATION_MS = 10 * 60 * 1000;

// Export automation engine instance for UI access
class AutomationEngine {
  private _rules: AutomationRule[] = [...rules];
  private _executions: Map<string, AutomationExecution> = new Map();
  private _executionListeners: Set<(executions: AutomationExecution[]) => void> = new Set();

  getRules(): AutomationRule[] {
    return [...this._rules];
  }

  getRule(id: string): AutomationRule | undefined {
    return this._rules.find(r => r.id === id);
  }

  enableRule(id: string): void {
    const rule = this._rules.find(r => r.id === id);
    if (rule) {
      rule.enabled = true;
      this._rules = [...this._rules]; // Trigger update
      console.log(`[Automation] Rule enabled: ${id}`);
    }
  }

  disableRule(id: string): void {
    const rule = this._rules.find(r => r.id === id);
    if (rule) {
      rule.enabled = false;
      this._rules = [...this._rules]; // Trigger update
      console.log(`[Automation] Rule disabled: ${id}`);
    }
  }

  deleteRule(id: string): void {
    this._rules = this._rules.filter(r => r.id !== id);
    console.log(`[Automation] Rule deleted: ${id}`);
  }

  addRule(rule: AutomationRule): void {
    this._rules.push(rule);
    this._rules = [...this._rules]; // Trigger update
    console.log(`[Automation] Rule added: ${rule.id}`);
  }

  /**
   * Get all running/completed automations (LAYER 4: Visible)
   */
  getExecutions(): AutomationExecution[] {
    return Array.from(this._executions.values());
  }

  /**
   * Get running automations only
   */
  getRunningExecutions(): AutomationExecution[] {
    return Array.from(this._executions.values()).filter(e => e.status === 'running');
  }

  /**
   * Subscribe to execution updates (LAYER 4: Visible)
   */
  onExecutionsChange(listener: (executions: AutomationExecution[]) => void): () => void {
    this._executionListeners.add(listener);
    return () => {
      this._executionListeners.delete(listener);
    };
  }

  /**
   * Notify listeners of execution changes
   */
  private _notifyListeners(): void {
    const executions = this.getExecutions();
    this._executionListeners.forEach(listener => {
      try {
        listener(executions);
      } catch (error) {
        console.error('[Automation] Listener error:', error);
      }
    });
  }

  /**
   * Cancel a running automation (LAYER 4: Cancelable)
   */
  cancelExecution(executionId: string): boolean {
    const execution = this._executions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    execution.abortController.abort();
    execution.status = 'cancelled';
    execution.endTime = Date.now();
    this._notifyListeners();

    // Emit event for UI
    regenEventBus.emit({ type: 'AUTOMATION_CANCELLED', payload: { executionId } });
    console.log(`[Automation] Execution ${executionId} cancelled`);
    return true;
  }

  /**
   * Execute an automation action with timeout and cancellation support
   */
  async executeAction(action: string, payload: any, ruleId?: string): Promise<string> {
    const executionId = `auto-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const abortController = new AbortController();
    const startTime = Date.now();

    const execution: AutomationExecution = {
      id: executionId,
      ruleId: ruleId || 'manual',
      action,
      status: 'running',
      startTime,
      abortController,
    };

    this._executions.set(executionId, execution);
    this._notifyListeners();

    // Emit event for UI (LAYER 4: Visible)
    regenEventBus.emit({ type: 'AUTOMATION_STARTED', payload: { executionId, action, ruleId } });

    // Timeout mechanism (LAYER 4: Short-lived)
    const timeoutId = setTimeout(() => {
      if (execution.status === 'running') {
        execution.abortController.abort();
        execution.status = 'timeout';
        execution.endTime = Date.now();
        this._executions.delete(executionId);
        this._notifyListeners();
        regenEventBus.emit({ type: 'AUTOMATION_TIMEOUT', payload: { executionId } });
        console.warn(`[Automation] Execution ${executionId} timed out after ${MAX_AUTOMATION_DURATION_MS}ms`);
      }
    }, MAX_AUTOMATION_DURATION_MS);

    try {
      await this._executeActionInternal(action, payload, abortController.signal);
      
      clearTimeout(timeoutId);
      execution.status = 'completed';
      execution.endTime = Date.now();
      
      // Keep completed executions for a short time, then remove
      setTimeout(() => {
        this._executions.delete(executionId);
        this._notifyListeners();
      }, 5000); // Remove after 5 seconds
      
      this._notifyListeners();
      regenEventBus.emit({ type: 'AUTOMATION_COMPLETED', payload: { executionId } });
      console.log(`[Automation] Execution ${executionId} completed`);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (abortController.signal.aborted) {
        execution.status = 'cancelled';
        execution.endTime = Date.now();
        this._executions.delete(executionId);
        this._notifyListeners();
      } else {
        execution.status = 'failed';
        execution.endTime = Date.now();
        setTimeout(() => {
          this._executions.delete(executionId);
          this._notifyListeners();
        }, 5000);
        this._notifyListeners();
        regenEventBus.emit({ type: 'AUTOMATION_FAILED', payload: { executionId, error: error instanceof Error ? error.message : String(error) } });
        console.error(`[Automation] Execution ${executionId} failed:`, error);
      }
    }

    return executionId;
  }

  /**
   * Internal action execution (original executeAction logic)
   */
  private async _executeActionInternal(action: string, payload: any, signal: AbortSignal): Promise<void> {
    // Check if cancelled
    if (signal.aborted) {
      throw new Error('Automation cancelled');
    }

    switch (action) {
      case "SUMMARIZE_AND_SAVE":
        await runAI(async (aiSignal) => {
          // Combine signals
          const combinedSignal = signal.aborted ? signal : aiSignal;
          if (combinedSignal.aborted) throw new Error('Automation cancelled');

          const { set } = useAvatar.getState();
          set("thinking");
          
          try {
            const { commandController } = await import("../../lib/command/CommandController");
            const url = typeof payload === "string" ? payload : payload?.url || window.location.href;
            
            if (combinedSignal.aborted) throw new Error('Automation cancelled');
            
            const result = await commandController.handleCommand(
              `Summarize the current page and save it`,
              { currentUrl: url, activeTab: undefined }
            );
            
            if (combinedSignal.aborted) throw new Error('Automation cancelled');
            
            if (result.success) {
              set("reporting");
              console.log("[Automation] Page summarized and saved");
            } else {
              set("reporting");
              console.warn("[Automation] Summarization failed:", result.message);
            }
          } catch (error) {
            console.error("[Automation] Summarization error:", error);
            set("reporting");
            throw error;
          }
          
          setTimeout(() => {
            set("idle");
          }, 2000);
        });
        break;

      case "CLOSE_DUPLICATE_TABS":
        await runAI(async (aiSignal) => {
          if (signal.aborted || aiSignal.aborted) throw new Error('Automation cancelled');
          
          const { set } = useAvatar.getState();
          set("thinking");
          
          try {
            const { useTabsStore } = await import("../../state/tabsStore");
            const { tabs, closeTab } = useTabsStore.getState();
            
            if (signal.aborted) throw new Error('Automation cancelled');
            
            const urlMap = new Map<string, string[]>();
            tabs.forEach(tab => {
              if (!urlMap.has(tab.url)) {
                urlMap.set(tab.url, []);
              }
              urlMap.get(tab.url)!.push(tab.id);
            });
            
            let closedCount = 0;
            urlMap.forEach((tabIds, url) => {
              if (signal.aborted) throw new Error('Automation cancelled');
              if (tabIds.length > 1) {
                const duplicates = tabIds.slice(1);
                duplicates.forEach(tabId => {
                  closeTab(tabId);
                  closedCount++;
                });
              }
            });
            
            set("reporting");
            console.log(`[Automation] Closed ${closedCount} duplicate tabs`);
          } catch (error) {
            console.error("[Automation] Close duplicates error:", error);
            set("reporting");
            throw error;
          }
          
          setTimeout(() => {
            set("idle");
          }, 2000);
        });
        break;

      case "ORGANIZE_TABS":
        await runAI(async (aiSignal) => {
          if (signal.aborted || aiSignal.aborted) throw new Error('Automation cancelled');
          
          const { set } = useAvatar.getState();
          set("thinking");
          
          try {
            const { useTabsStore } = await import("../../state/tabsStore");
            const { tabs } = useTabsStore.getState();
            
            if (signal.aborted) throw new Error('Automation cancelled');
            
            const domainGroups = new Map<string, typeof tabs>();
            tabs.forEach(tab => {
              if (signal.aborted) throw new Error('Automation cancelled');
              try {
                const url = new URL(tab.url);
                const domain = url.hostname;
                if (!domainGroups.has(domain)) {
                  domainGroups.set(domain, []);
                }
                domainGroups.get(domain)!.push(tab);
              } catch {
                // Invalid URL, skip
              }
            });
            
            set("reporting");
            console.log(`[Automation] Found ${domainGroups.size} unique domains`);
          } catch (error) {
            console.error("[Automation] Organize tabs error:", error);
            set("reporting");
            throw error;
          }
          
          setTimeout(() => {
            set("idle");
          }, 2000);
        });
        break;

      case "SAVE_CURRENT_PAGE":
        await runAI(async (aiSignal) => {
          if (signal.aborted || aiSignal.aborted) throw new Error('Automation cancelled');
          
          const { set } = useAvatar.getState();
          set("thinking");
          
          try {
            const { commandController } = await import("../../lib/command/CommandController");
            
            if (signal.aborted) throw new Error('Automation cancelled');
            
            const result = await commandController.handleCommand(
              "Save this page to my workspace",
              { currentUrl: window.location.href, activeTab: undefined }
            );
            
            set("reporting");
            console.log("[Automation] Page saved:", result.success);
          } catch (error) {
            console.error("[Automation] Save page error:", error);
            set("reporting");
            throw error;
          }
          
          setTimeout(() => {
            set("idle");
          }, 2000);
        });
        break;

      default:
        console.warn(`[Automation] Unknown action: ${action}`);
        throw new Error(`Unknown automation action: ${action}`);
    }
  }
}

export const automationEngine = new AutomationEngine();

/**
 * Initialize automation engine
 * 
 * NOTE: Automation is disabled by default.
 * Rules are only executed when explicitly enabled by user.
 * All execution goes through task manager.
 */
export function initAutomationEngine(): () => void {
  // Automation engine initialized but NOT auto-triggering
  // User must explicitly enable rules via UI
  console.log("[Automation] Engine initialized (disabled by default - user must enable rules)");
  
  // Return empty cleanup (nothing to clean up)
  return () => {
    console.log("[Automation] Engine cleaned up");
  };
  
  // NOTE: Auto-triggering removed - automation only runs when:
  // 1. User explicitly enables a rule
  // 2. User manually triggers execution
  // 3. Execution goes through task manager (visible, stoppable)
}