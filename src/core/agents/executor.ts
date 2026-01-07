/**
 * Agent Executor - Safe execution environment for agent automation
 * Provides permission checks, audit logging, and sandboxing
 */

import type {
  DOMSelector,
  ClickOptions,
  FillOptions,
  // ElementInfo, // Unused for now
  // PageInfo, // Unused for now
} from './primitives';
import {
  readElement,
  clickElement,
  fillInput,
  // readText, // Unused for now
  readPageText,
  scrollPage,
  waitForPageReady,
  // getPageInfo, // Unused for now
  extractStructuredData,
  saveToMemory,
} from './primitives';
import { dispatch } from '../redix/runtime';
import { ipc } from '../../lib/ipc-typed';

export type AgentAction =
  | { type: 'click'; selector: DOMSelector; options?: ClickOptions }
  | { type: 'fill'; selector: DOMSelector; value: string; options?: FillOptions }
  | { type: 'read'; selector: DOMSelector }
  | { type: 'readPage' }
  | { type: 'scroll'; direction: 'up' | 'down' | 'left' | 'right' | 'top' | 'bottom'; amount?: number }
  | { type: 'wait'; ms: number }
  | { type: 'waitForReady'; timeout?: number }
  | { type: 'extract' }
  | { type: 'save'; url: string; title: string; content?: string; metadata?: Record<string, any> }
  | { type: 'navigate'; url: string };

export type ActionRisk = 'low' | 'medium' | 'high';

export interface ExecutionContext {
  runId: string;
  tabId?: string;
  document?: Document;
  timeout?: number; // Max execution time in ms
  maxSteps?: number; // Max number of actions
  allowedDomains?: string[]; // Whitelist of allowed domains
  deniedDomains?: string[]; // Blacklist of denied domains
  requireConsent?: boolean; // Require consent for risky actions
}

export interface AuditLog {
  runId: string;
  action: AgentAction;
  timestamp: number;
  result: 'success' | 'error' | 'blocked' | 'timeout' | 'consent_denied';
  error?: string;
  duration: number;
  risk: ActionRisk;
  requiresConsent: boolean;
  consentGranted?: boolean;
  metadata?: Record<string, any>;
}

export interface ExecutionResult {
  success: boolean;
  runId: string;
  steps: number;
  duration: number;
  result?: any;
  error?: string;
  auditLog: AuditLog[];
  blocked: boolean;
}

class AgentExecutor {
  private auditLogs: Map<string, AuditLog[]> = new Map();
  private activeRuns: Map<string, { startTime: number; context: ExecutionContext }> = new Map();
  private defaultTimeout = 30000; // 30 seconds
  private defaultMaxSteps = 50;

  /**
   * Determine action risk level
   */
  private getActionRisk(action: AgentAction): ActionRisk {
    switch (action.type) {
      case 'navigate':
        return 'high';
      case 'click':
      case 'fill':
        return 'medium';
      case 'read':
      case 'readPage':
      case 'extract':
        return 'low';
      case 'scroll':
      case 'wait':
      case 'waitForReady':
        return 'low';
      case 'save':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Check if action requires consent
   */
  private requiresConsent(action: AgentAction): boolean {
    const risk = this.getActionRisk(action);
    return risk === 'high' || (risk === 'medium' && action.type === 'click');
  }

  /**
   * Request consent for an action
   */
  private async requestConsent(
    action: AgentAction,
    context: ExecutionContext
  ): Promise<boolean> {
    if (!context.requireConsent) {
      return true;
    }

    const risk = this.getActionRisk(action);
    if (risk === 'low') {
      return true;
    }

    try {
      // Map action type to consent type
      let consentType: string;
      switch (action.type) {
        case 'navigate':
          consentType = 'scrape';
          break;
        case 'click':
        case 'fill':
          consentType = 'form_submit';
          break;
        default:
          consentType = 'scrape';
      }

      // Request consent via IPC
      const result = await ipc.consent.check({
        type: consentType as any,
        description: this.describeAction(action),
        risk,
      });

      return result?.hasConsent ?? false;
    } catch (error) {
      console.warn('[AgentExecutor] Consent check failed:', error);
      // Fail open for now, but log the error
      return false;
    }
  }

  /**
   * Describe an action for consent prompts
   */
  private describeAction(action: AgentAction): string {
    switch (action.type) {
      case 'click':
        return `Click element ${JSON.stringify(action.selector)}`;
      case 'fill':
        return `Fill input ${JSON.stringify(action.selector)} with value`;
      case 'navigate':
        return `Navigate to ${action.url}`;
      case 'read':
        return `Read content from ${JSON.stringify(action.selector)}`;
      case 'readPage':
        return 'Read entire page content';
      case 'extract':
        return 'Extract structured data from page';
      case 'save':
        return `Save page "${action.title}" to memory`;
      default:
        return `Execute ${action.type} action`;
    }
  }

  /**
   * Check if domain is allowed
   */
  private isDomainAllowed(url: string, context: ExecutionContext): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      // Check blacklist
      if (context.deniedDomains) {
        for (const denied of context.deniedDomains) {
          if (hostname.includes(denied.toLowerCase())) {
            return false;
          }
        }
      }

      // Check whitelist
      if (context.allowedDomains && context.allowedDomains.length > 0) {
        const isAllowed = context.allowedDomains.some((allowed) =>
          hostname.includes(allowed.toLowerCase())
        );
        if (!isAllowed) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get document from context
   */
  private getDocument(context: ExecutionContext): Document {
    if (context.document) {
      return context.document;
    }
    if (typeof window !== 'undefined' && window.document) {
      return window.document;
    }
    throw new Error('No document available in execution context');
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: AgentAction,
    context: ExecutionContext,
    stepIndex: number
  ): Promise<{ success: boolean; result?: any; error?: string; blocked?: boolean }> {
    const startTime = Date.now();
    const risk = this.getActionRisk(action);
    const needsConsent = this.requiresConsent(action);
    let consentGranted = !needsConsent;

    // Check domain restrictions for navigation
    if (action.type === 'navigate') {
      if (!this.isDomainAllowed(action.url, context)) {
        return {
          success: false,
          error: `Domain ${action.url} is not allowed`,
          blocked: true,
        };
      }
    }

    // Request consent if needed
    if (needsConsent) {
      consentGranted = await this.requestConsent(action, context);
      if (!consentGranted) {
        const duration = Date.now() - startTime;
        this.logAudit(context.runId, {
          runId: context.runId,
          action,
          timestamp: Date.now(),
          result: 'consent_denied',
          duration,
          risk,
          requiresConsent: true,
          consentGranted: false,
        });
        return {
          success: false,
          error: 'Consent denied',
          blocked: true,
        };
      }
    }

    // Execute action
    try {
      const document = this.getDocument(context);
      let result: any;

      switch (action.type) {
        case 'click':
          result = await clickElement(action.selector, action.options, document);
          break;
        case 'fill':
          result = await fillInput(action.selector, action.value, action.options, document);
          break;
        case 'read':
          const elementInfo = await readElement(action.selector, document);
          result = elementInfo ? elementInfo.text : null;
          break;
        case 'readPage':
          result = readPageText(document);
          break;
        case 'scroll':
          await scrollPage(action.direction, action.amount);
          result = true;
          break;
        case 'wait':
          await new Promise((resolve) => setTimeout(resolve, action.ms));
          result = true;
          break;
        case 'waitForReady':
          result = await waitForPageReady(document, action.timeout || 10000);
          break;
        case 'extract':
          result = await extractStructuredData(document);
          break;
        case 'save':
          result = await saveToMemory(action.url, action.title, action.content, action.metadata);
          break;
        case 'navigate':
          // Navigation requires tab management
          if (context.tabId) {
            try {
              await ipc.tabs.navigate(context.tabId, action.url);
              result = true;
            } catch (error: any) {
              throw new Error(`Navigation failed: ${error.message}`);
            }
          } else {
            // Fallback to window.location
            if (typeof window !== 'undefined') {
              window.location.href = action.url;
              result = true;
            } else {
              throw new Error('No tab ID or window available for navigation');
            }
          }
          break;
        default:
          throw new Error(`Unknown action type: ${(action as any).type}`);
      }

      const duration = Date.now() - startTime;

      // Log successful action
      this.logAudit(context.runId, {
        runId: context.runId,
        action,
        timestamp: Date.now(),
        result: 'success',
        duration,
        risk,
        requiresConsent: needsConsent,
        consentGranted,
        metadata: { stepIndex, result },
      });

      // Emit Redix event
      dispatch({
        type: 'agent:action:executed',
        payload: {
          runId: context.runId,
          action: action.type,
          success: true,
          duration,
          stepIndex,
        },
      });

      return { success: true, result };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error.message || String(error);

      // Log failed action
      this.logAudit(context.runId, {
        runId: context.runId,
        action,
        timestamp: Date.now(),
        result: 'error',
        error: errorMessage,
        duration,
        risk,
        requiresConsent: needsConsent,
        consentGranted,
        metadata: { stepIndex },
      });

      // Emit Redix event
      dispatch({
        type: 'agent:action:failed',
        payload: {
          runId: context.runId,
          action: action.type,
          error: errorMessage,
          duration,
          stepIndex,
        },
      });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Log audit entry
   */
  private logAudit(runId: string, log: AuditLog): void {
    if (!this.auditLogs.has(runId)) {
      this.auditLogs.set(runId, []);
    }
    this.auditLogs.get(runId)!.push(log);
  }

  /**
   * Execute a sequence of actions
   */
  async execute(
    actions: AgentAction[],
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const runId = context.runId || `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    const timeout = context.timeout || this.defaultTimeout;
    const maxSteps = context.maxSteps || this.defaultMaxSteps;
    let blocked = false;

    // Store active run
    this.activeRuns.set(runId, { startTime, context: { ...context, runId } });

    // Emit start event
    dispatch({
      type: 'agent:run:started',
      payload: { runId, actionCount: actions.length },
    });

    const results: any[] = [];
    const auditLog: AuditLog[] = [];

    try {
      // Limit number of steps
      const limitedActions = actions.slice(0, maxSteps);

      for (let i = 0; i < limitedActions.length; i++) {
        const action = limitedActions[i];

        // Check timeout
        if (Date.now() - startTime > timeout) {
          this.logAudit(runId, {
            runId,
            action,
            timestamp: Date.now(),
            result: 'timeout',
            duration: Date.now() - startTime,
            risk: this.getActionRisk(action),
            requiresConsent: this.requiresConsent(action),
            metadata: { stepIndex: i },
          });
          break;
        }

        // Execute action
        const result = await this.executeAction(action, { ...context, runId }, i);

        // Get latest audit log entry
        const runLogs = this.auditLogs.get(runId) || [];
        if (runLogs.length > 0) {
          auditLog.push(runLogs[runLogs.length - 1]);
        }

        results.push(result);

        // Stop on error or block
        if (!result.success) {
          if (result.blocked) {
            blocked = true;
          }
          break;
        }
      }

      const duration = Date.now() - startTime;

      // Clean up
      this.activeRuns.delete(runId);

      // Emit completion event
      dispatch({
        type: 'agent:run:completed',
        payload: {
          runId,
          success: !blocked && results.every((r) => r.success),
          steps: results.length,
          duration,
        },
      });

      return {
        success: !blocked && results.every((r) => r.success),
        runId,
        steps: results.length,
        duration,
        result: results.length === 1 ? results[0].result : results,
        error: results.find((r) => r.error)?.error,
        auditLog,
        blocked,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Clean up
      this.activeRuns.delete(runId);

      // Emit error event
      dispatch({
        type: 'agent:run:failed',
        payload: {
          runId,
          error: error.message || String(error),
          duration,
        },
      });

      return {
        success: false,
        runId,
        steps: results.length,
        duration,
        error: error.message || String(error),
        auditLog,
        blocked,
      };
    }
  }

  /**
   * Get audit log for a run
   */
  getAuditLog(runId: string): AuditLog[] {
    return this.auditLogs.get(runId) || [];
  }

  /**
   * Get all audit logs
   */
  getAllAuditLogs(): Map<string, AuditLog[]> {
    return new Map(this.auditLogs);
  }

  /**
   * Clear audit logs for a run
   */
  clearAuditLog(runId: string): void {
    this.auditLogs.delete(runId);
  }

  /**
   * Clear all audit logs
   */
  clearAllAuditLogs(): void {
    this.auditLogs.clear();
  }

  /**
   * Cancel an active run
   */
  cancel(runId: string): boolean {
    if (this.activeRuns.has(runId)) {
      this.activeRuns.delete(runId);

      dispatch({
        type: 'agent:run:cancelled',
        payload: { runId },
      });

      return true;
    }
    return false;
  }

  /**
   * Get active runs
   */
  getActiveRuns(): string[] {
    return Array.from(this.activeRuns.keys());
  }
}

// Singleton instance
export const executor = new AgentExecutor();

// Export convenience functions
export const executeActions = (actions: AgentAction[], context: ExecutionContext) =>
  executor.execute(actions, context);
export const getAuditLog = (runId: string) => executor.getAuditLog(runId);
export const cancelRun = (runId: string) => executor.cancel(runId);
export const getActiveRuns = () => executor.getActiveRuns();

