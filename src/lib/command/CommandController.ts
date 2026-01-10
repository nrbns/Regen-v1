/**
 * Command Controller - Single entry point for all user commands
 * Handles intent resolution, execution, and status updates
 */

import { backendService } from '../backend/BackendService';
import { workspaceStore } from '../workspace/WorkspaceStore';
import { toolGuard } from '../security/ToolGuard';
import { intentRouter, type ResolvedIntent } from './IntentRouter';

export type SystemStatus = 'idle' | 'working' | 'recovering';

export type CommandIntent = 
  | { type: 'NAVIGATE'; url: string }
  | { type: 'SEARCH'; query: string }
  | { type: 'RESEARCH'; query: string; options?: Record<string, any> }
  | { type: 'SUMMARIZE_PAGE'; url?: string }
  | { type: 'ANALYZE_TEXT'; text: string }
  | { type: 'TASK_RUN'; task: string; params?: Record<string, any> }
  | { type: 'AI_QUERY'; query: string; context?: Record<string, any> }
  | { type: 'UNKNOWN'; input: string };

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface CommandContext {
  currentUrl?: string;
  selectedText?: string;
  activeTab?: string;
}

class CommandController {
  private status: SystemStatus = 'idle';
  private lastAction: string = '';
  private statusListeners: Set<(status: SystemStatus) => void> = new Set();
  private actionListeners: Set<(action: string) => void> = new Set();

  /**
   * Main command handler - single entry point
   * 
   * Flow:
   * 1. Resolve intent via IntentRouter (ALWAYS before AI execution)
   * 2. Check if planning is required (explicit threshold)
   * 3. Execute directly OR route to planner
   * 4. Apply security guard
   * 5. Execute action
   */
  async handleCommand(input: string, context: CommandContext = {}): Promise<CommandResult> {
    if (!input.trim()) {
      return { success: false, message: 'Empty command' };
    }

    // Update status
    this.setStatus('working');

    try {
      // STEP 1: Resolve intent via IntentRouter (ALWAYS before AI execution)
      // This is the single source of truth for intent resolution
      const resolvedIntent = intentRouter.resolve(input, context);

      // STEP 2: Check if planning is required (explicit threshold)
      const needsPlanning = this.shouldUsePlanner(resolvedIntent);

      // STEP 3: Execute directly OR route to planner
      // Simple intents: Direct execution (no planner)
      // Complex intents: Route to planner (multi-step queries)
      let result: CommandResult;

      if (needsPlanning && resolvedIntent.type !== 'TASK_RUN') {
        // Complex query requiring multi-step planning
        result = await this.executeWithPlanning(resolvedIntent, context);
      } else {
        // Simple intent: Direct execution (no planner needed)
        result = await this.executeIntentDirect(resolvedIntent, context);
      }

      // Update last action (convert ResolvedIntent to CommandIntent for description)
      const commandIntent = this.convertToCommandIntent(resolvedIntent);
      this.setLastAction(this.getActionDescription(commandIntent, result));

      // Show toast notification
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('regen:toast', {
          detail: {
            message: result.success ? result.message : `Error: ${result.message}`,
            type: result.success ? 'success' : 'error',
            duration: 3000,
          },
        });
        window.dispatchEvent(event);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.setStatus('recovering');
      return { success: false, message: 'Command failed', error: errorMessage };
    } finally {
      // Always return to idle after a delay
      setTimeout(() => {
        if (this.status === 'working' || this.status === 'recovering') {
          this.setStatus('idle');
        }
      }, 500);
    }
  }

  /**
   * Check if intent requires planner (explicit threshold)
   * 
   * Planner threshold: Only multi-step, complex queries use planner.
   * Simple, single-step intents execute directly.
   * 
   * Rules:
   * - RESEARCH intents: Always use planner (multi-step)
   * - Queries with "and then", "after that", etc.: Use planner
   * - Simple NAVIGATE, SEARCH, SUMMARIZE: Direct execution (no planner)
   * - TASK_RUN: Direct execution (tasks are pre-defined)
   */
  private shouldUsePlanner(intent: ResolvedIntent): boolean {
    // RESEARCH intents always require planning (multi-step)
    if (intent.type === 'RESEARCH') {
      return true;
    }

    // Check if intent explicitly requires planning (from IntentRouter)
    if (intent.requiresPlanning) {
      return true;
    }

    // Check for multi-step keywords in query
    const query = intent.data.query || '';
    const multiStepKeywords = [
      'and then',
      'after that',
      'followed by',
      'next',
      'then',
      'also',
      'plus',
    ];

    const hasMultiStep = multiStepKeywords.some(keyword =>
      query.toLowerCase().includes(keyword)
    );

    return hasMultiStep;
  }

  /**
   * Execute intent with planning (for complex, multi-step queries)
   * 
   * For v1: We execute directly but log that planner would be used in v2
   * For v2: Route to TaskPlanner for multi-step execution
   */
  private async executeWithPlanning(
    intent: ResolvedIntent,
    context: CommandContext
  ): Promise<CommandResult> {
    // For v1: Execute directly (planner integration in v2)
    // Log that this would use planner in v2
    console.log('[CommandController] Complex query detected, would use planner in v2:', {
      intent: intent.type,
      requiresPlanning: intent.requiresPlanning,
      confidence: intent.confidence,
    });

    // For now, execute directly but acknowledge planning requirement
    return this.executeIntentDirect(intent, context);
  }

  /**
   * Execute intent directly (no planner)
   * 
   * This is the fast path for simple, single-step intents.
   */
  private async executeIntentDirect(
    intent: ResolvedIntent,
    context: CommandContext
  ): Promise<CommandResult> {
    // Convert ResolvedIntent (from IntentRouter) to CommandIntent (for execution)
    const commandIntent = this.convertToCommandIntent(intent);

    // Execute based on intent type
    return this.executeIntent(commandIntent, context);
  }

  /**
   * Convert ResolvedIntent (from IntentRouter) to CommandIntent (for execution)
   */
  private convertToCommandIntent(intent: ResolvedIntent): CommandIntent {
    switch (intent.type) {
      case 'NAVIGATE':
        return { type: 'NAVIGATE', url: intent.data.url || '' };
      case 'SEARCH':
        return { type: 'SEARCH', query: intent.data.query || '' };
      case 'RESEARCH':
        return { type: 'RESEARCH', query: intent.data.query || '', options: intent.data.options };
      case 'SUMMARIZE_PAGE':
        return { type: 'SUMMARIZE_PAGE', url: intent.data.url };
      case 'ANALYZE_TEXT':
        return { type: 'ANALYZE_TEXT', text: intent.data.text || '' };
      case 'TASK_RUN':
        return { type: 'TASK_RUN', task: intent.data.task || '', params: intent.data.options };
      case 'AI_QUERY':
        return { type: 'AI_QUERY', query: intent.data.query || '', context: intent.data.context };
      default:
        return { type: 'UNKNOWN', input: intent.data.query || '' };
    }
  }

  /**
   * @deprecated Use IntentRouter.resolve() instead
   * This method is kept for backward compatibility but should not be used.
   * All intent resolution now goes through IntentRouter.
   */
  private resolveIntentLegacy(input: string, context: CommandContext): CommandIntent {
    // Legacy implementation - kept for reference only
    const resolvedIntent = intentRouter.resolve(input, context);
    return this.convertToCommandIntent(resolvedIntent);
  }

  /**
   * Execute resolved intent
   */
  private async executeIntent(intent: CommandIntent, context: CommandContext): Promise<CommandResult> {
    switch (intent.type) {
      case 'NAVIGATE':
        return this.handleNavigate(intent.url, context);
      
      case 'SEARCH':
        return this.handleSearch(intent.query);
      
      case 'RESEARCH':
        return this.handleResearch(intent.query, intent.options);
      
      case 'SUMMARIZE_PAGE': {
        const result = await this.handleSummarize(intent.url || context.currentUrl);
        // Auto-save summary to workspace if successful
        if (result.success && result.data?.summary) {
          try {
            workspaceStore.add({
              title: result.data.title || 'Page Summary',
              content: result.data.summary,
              type: 'summary',
            });
          } catch (error) {
            console.warn('[CommandController] Failed to save summary to workspace:', error);
          }
        }
        return result;
      }
      
      case 'ANALYZE_TEXT':
        return this.handleAnalyzeText(intent.text);
      
      case 'AI_QUERY':
        return this.handleAIQuery(intent.query, intent.context);
      
      case 'TASK_RUN':
        return this.handleTaskRun(intent.task, intent.params);
      
      default:
        return { success: false, message: 'Unknown command type' };
    }
  }

  /**
   * Handle navigation (backend-owned)
   * FIX: Navigation is now backend-controlled, not UI-controlled
   */
  private async handleNavigate(url: string, context?: CommandContext): Promise<CommandResult> {
    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      // Validate URL format
      new URL(normalizedUrl);
    } catch (error) {
      return {
        success: false,
        message: `Invalid URL: ${url}`,
        error: 'Invalid URL format'
      };
    }

    try {
      // Use ToolGuard to secure navigation execution
      const tabId = context?.activeTab || null;
      
      await toolGuard.executeTool(
        'navigate',
        { url: normalizedUrl },
        async (input) => {
          // FIX: Navigation is now backend-owned
          // In Tauri mode: Use IPC for real backend navigation
          // In web mode: Emit navigation event and simulate backend confirmation
          
          if (typeof window !== 'undefined') {
            const isTauri = !!(window as any).__TAURI__;
            
            if (isTauri) {
              // Tauri mode: Use IPC for real backend navigation
              try {
                const { invoke } = await import('@tauri-apps/api/core');
                const result = await invoke('tabs:navigate', {
                  url: input.url,
                  tabId: tabId,
                });
                
                // Backend confirmed navigation - emit confirmation event
                if (result && (result as any).success !== false) {
                  setTimeout(() => {
                    const confirmEvent = new CustomEvent('regen:navigate:confirmed', {
                      detail: {
                        url: input.url,
                        tabId: tabId,
                        success: true,
                        title: (result as any).title || new URL(input.url).hostname,
                        timestamp: Date.now(),
                      },
                    });
                    window.dispatchEvent(confirmEvent);
                  }, 100);
                }
                
                return { success: true, url: input.url };
              } catch (ipcError) {
                console.error('[CommandController] IPC navigation failed:', ipcError);
                throw ipcError;
              }
            } else {
              // Web mode: Emit navigation request event
              const navRequestEvent = new CustomEvent('regen:navigate:request', {
                detail: {
                  url: input.url,
                  tabId: tabId,
                  timestamp: Date.now(),
                },
              });
              window.dispatchEvent(navRequestEvent);
              
              // In web mode, navigation happens immediately (browser handles it)
              // Emit confirmation after short delay to simulate backend confirmation
              setTimeout(() => {
                const confirmEvent = new CustomEvent('regen:navigate:confirmed', {
                  detail: {
                    url: input.url,
                    tabId: tabId,
                    success: true,
                    title: new URL(input.url).hostname,
                    timestamp: Date.now(),
                  },
                });
                window.dispatchEvent(confirmEvent);
              }, 100);
              
              return { success: true, url: input.url };
            }
          }
          
          return { success: true, url: input.url };
        },
        { tabId: tabId || undefined }
      );

      return {
        success: true,
        message: `Navigating to ${normalizedUrl}`,
        data: { url: normalizedUrl, confirmed: false } // UI will update on confirmation event
      };
    } catch (error) {
      return {
        success: false,
        message: `Navigation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle search
   */
  private async handleSearch(query: string): Promise<CommandResult> {
    try {
      // Trigger search event for AI Sidebar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('regen:search'));
      }
      
      // Use ToolGuard to secure search execution
      const results = await toolGuard.executeTool(
        'search',
        { query },
        async (input) => {
          const searchResults = await backendService.search(input.query);
          return searchResults;
        },
        { tabId: undefined }
      );
      
      if (results && results.length > 0) {
        return {
          success: true,
          message: `Found ${results.length} results for: ${query}`,
          data: { query, results }
        };
      } else {
        return {
          success: false,
          message: `No results found for: ${query}`,
          data: { query }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle page summarization
   */
  private async handleSummarize(url?: string): Promise<CommandResult> {
    if (!url) {
      return { success: false, message: 'No page to summarize' };
    }

    try {
      // Step 1: Scrape the page (requires consent)
      const scrapeResult = await toolGuard.executeTool(
        'scrape',
        { url },
        async (input) => {
          const result = await backendService.scrapeUrl(input.url);
          return result;
        },
        { tabId: undefined }
      );
      
      if (!scrapeResult || !scrapeResult.text) {
        return {
          success: false,
          message: 'Failed to extract content from page',
          error: 'Scrape failed'
        };
      }

      // Step 2: Summarize the content
      const summary = await toolGuard.executeTool(
        'summarize',
        { text: scrapeResult.text, url },
        async (input) => {
          const result = await backendService.summarize(input.text, input.url);
          return result;
        },
        { tabId: undefined }
      );

      return {
        success: true,
        message: 'Page summarized',
        data: { 
          url, 
          title: scrapeResult.title,
          summary,
          content: scrapeResult.text.substring(0, 500)
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle text analysis
   */
  private async handleAnalyzeText(text: string): Promise<CommandResult> {
    if (!text || text.length < 10) {
      return { success: false, message: 'Text too short to analyze' };
    }

    try {
      const analysis = await toolGuard.executeTool(
        'analyze',
        { text },
        async (input) => {
          const result = await backendService.analyzeText(input.text);
          return result;
        },
        { tabId: undefined }
      );

      return {
        success: true,
        message: 'Text analyzed',
        data: { analysis, originalText: text.substring(0, 200) }
      };
    } catch (error) {
      return {
        success: false,
        message: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle research (deep search with sources)
   */
  private async handleResearch(query: string, options?: Record<string, any>): Promise<CommandResult> {
    try {
      // Use ToolGuard to secure research execution
      const { researchApi } = await import('../api-client');
      
      const results = await toolGuard.executeTool(
        'hybridSearch',
        { query, ...options },
        async (input) => {
          const researchResults = await researchApi.queryEnhanced({
            query: input.query,
            maxSources: input.maxSources || 12,
            includeCounterpoints: input.includeCounterpoints || false,
            recencyWeight: input.recencyWeight || 0.3,
            authorityWeight: input.authorityWeight || 0.4,
            language: input.language,
          });
          return researchResults;
        },
        { tabId: undefined }
      );

      if (results && (results.sources?.length > 0 || results.summary)) {
        return {
          success: true,
          message: `Research completed: Found ${results.sources?.length || 0} sources`,
          data: { query, ...results }
        };
      } else {
        return {
          success: false,
          message: `No research results found for: ${query}`,
          data: { query }
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle AI query (general AI questions)
   */
  private async handleAIQuery(query: string, context?: Record<string, any>): Promise<CommandResult> {
    try {
      // Use ToolGuard to secure AI query execution
      const results = await toolGuard.executeTool(
        'chat',
        { query, context },
        async (input) => {
          // Route to backend AI task endpoint
          const { backendService } = await import('../backend/BackendService');
          const aiResult = await backendService.aiTask('chat', { 
            query: input.query,
            context: input.context 
          });
          return aiResult.data?.text || aiResult.message || 'No response generated';
        },
        { tabId: undefined }
      );

      return {
        success: true,
        message: 'AI query completed',
        data: { query, response: results }
      };
    } catch (error) {
      return {
        success: false,
        message: `AI query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle task execution
   */
  private async handleTaskRun(task: string, params?: Record<string, any>): Promise<CommandResult> {
    try {
      // Validate task exists and is allowed
      const taskName = task.toLowerCase().replace(/\s+/g, '_');
      
      // Map task names to tool names
      const taskToToolMap: Record<string, string> = {
        'summarize_page': 'summarize',
        'extract_links': 'scrape',
        'analyze_content': 'analyze',
      };
      
      const toolName = taskToToolMap[taskName] || taskName;
      
      // Execute task through ToolGuard
      const result = await toolGuard.executeTool(
        toolName,
        params || {},
        async (input) => {
          // Task execution logic should be handled by TaskRunner
          // This is a simplified version - in production, route to TaskRunner
          const { taskRunner } = await import('../tasks/TaskRunner');
          const execution = await taskRunner.executeTask(task, params);
          return execution.result;
        },
        { tabId: undefined }
      );

      return {
        success: true,
        message: `Task executed: ${task}`,
        data: { task, params, result }
      };
    } catch (error) {
      return {
        success: false,
        message: `Task execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get human-readable action description
   */
  private getActionDescription(intent: CommandIntent, result: CommandResult): string {
    if (!result.success) {
      return `Failed: ${result.message}`;
    }

    switch (intent.type) {
      case 'NAVIGATE':
        return `Navigated to page`;
      case 'SEARCH':
        return `Searched: ${intent.query}`;
      case 'RESEARCH':
        return `Researched: ${intent.query}`;
      case 'SUMMARIZE_PAGE':
        return `Summarized page`;
      case 'ANALYZE_TEXT':
        return `Analyzed text`;
      case 'AI_QUERY':
        return `AI query: ${intent.query.substring(0, 50)}...`;
      case 'TASK_RUN':
        return `Ran task: ${intent.task}`;
      default:
        return `Executed command`;
    }
  }

  /**
   * Status management
   */
  getStatus(): SystemStatus {
    return this.status;
  }

  setStatus(status: SystemStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.statusListeners.forEach(listener => listener(status));
    }
  }

  onStatusChange(listener: (status: SystemStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  /**
   * Last action tracking
   */
  getLastAction(): string {
    return this.lastAction;
  }

  setLastAction(action: string): void {
    this.lastAction = action;
    this.actionListeners.forEach(listener => listener(action));
  }

  onActionChange(listener: (action: string) => void): () => void {
    this.actionListeners.add(listener);
    return () => this.actionListeners.delete(listener);
  }
}

// Singleton instance
export const commandController = new CommandController();