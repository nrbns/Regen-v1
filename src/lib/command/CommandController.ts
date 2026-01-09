/**
 * Command Controller - Single entry point for all user commands
 * Handles intent resolution, execution, and status updates
 */

import { backendService } from '../backend/BackendService';
import { workspaceStore } from '../workspace/WorkspaceStore';

export type SystemStatus = 'idle' | 'working' | 'recovering';

export type CommandIntent = 
  | { type: 'NAVIGATE'; url: string }
  | { type: 'SEARCH'; query: string }
  | { type: 'SUMMARIZE_PAGE'; url?: string }
  | { type: 'ANALYZE_TEXT'; text: string }
  | { type: 'TASK_RUN'; task: string; params?: Record<string, any> }
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
   */
  async handleCommand(input: string, context: CommandContext = {}): Promise<CommandResult> {
    if (!input.trim()) {
      return { success: false, message: 'Empty command' };
    }

    // Update status
    this.setStatus('working');

    try {
      // Resolve intent
      const intent = this.resolveIntent(input, context);

      // Execute based on intent
      const result = await this.executeIntent(intent, context);

      // Update last action
      this.setLastAction(this.getActionDescription(intent, result));

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
   * Resolve user input to a command intent
   */
  private resolveIntent(input: string, context: CommandContext): CommandIntent {
    const lowerInput = input.toLowerCase().trim();

    // Navigation patterns
    if (lowerInput.startsWith('http://') || lowerInput.startsWith('https://')) {
      return { type: 'NAVIGATE', url: input.trim() };
    }

    // Search patterns
    if (lowerInput.startsWith('search ') || lowerInput.startsWith('find ')) {
      const query = input.replace(/^(search|find)\s+/i, '').trim();
      return { type: 'SEARCH', query };
    }

    // Summarize patterns
    if (lowerInput.includes('summarize') || lowerInput.includes('summary')) {
      return { type: 'SUMMARIZE_PAGE', url: context.currentUrl };
    }

    // Analyze text patterns
    if (lowerInput.includes('analyze') && context.selectedText) {
      return { type: 'ANALYZE_TEXT', text: context.selectedText };
    }

    // Task patterns
    if (lowerInput.startsWith('task ') || lowerInput.startsWith('run ')) {
      const task = input.replace(/^(task|run)\s+/i, '').trim();
      return { type: 'TASK_RUN', task };
    }

    // Default: treat as search
    return { type: 'SEARCH', query: input };
  }

  /**
   * Execute resolved intent
   */
  private async executeIntent(intent: CommandIntent, context: CommandContext): Promise<CommandResult> {
    switch (intent.type) {
      case 'NAVIGATE':
        return this.handleNavigate(intent.url);
      
      case 'SEARCH':
        return this.handleSearch(intent.query);
      
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
      
      case 'TASK_RUN':
        return this.handleTaskRun(intent.task, intent.params);
      
      default:
        return { success: false, message: 'Unknown command type' };
    }
  }

  /**
   * Handle navigation
   */
  private async handleNavigate(url: string): Promise<CommandResult> {
    // Normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      // Validate URL
      new URL(normalizedUrl);

      // In a real browser, this would trigger navigation
      // For now, we'll return success and let the UI handle navigation
      return {
        success: true,
        message: `Navigating to ${normalizedUrl}`,
        data: { url: normalizedUrl }
      };
    } catch (error) {
      return {
        success: false,
        message: `Invalid URL: ${url}`,
        error: 'Invalid URL format'
      };
    }
  }

  /**
   * Handle search
   */
  private async handleSearch(query: string): Promise<CommandResult> {
    try {
      const results = await backendService.search(query);
      
      if (results.length > 0) {
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
      // Step 1: Scrape the page
      const scrapeResult = await backendService.scrapeUrl(url);
      
      if (!scrapeResult || !scrapeResult.text) {
        return {
          success: false,
          message: 'Failed to extract content from page',
          error: 'Scrape failed'
        };
      }

      // Step 2: Summarize the content
      const summary = await backendService.summarize(scrapeResult.text, url);

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
      const analysis = await backendService.analyzeText(text);

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
   * Handle task execution
   */
  private async handleTaskRun(task: string, params?: Record<string, any>): Promise<CommandResult> {
    // In real implementation, this would:
    // 1. Validate task exists
    // 2. Check permissions
    // 3. Execute single-run task
    // 4. Return result

    return {
      success: true,
      message: `Task executed: ${task}`,
      data: { task, params }
    };
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
      case 'SUMMARIZE_PAGE':
        return `Summarized page`;
      case 'ANALYZE_TEXT':
        return `Analyzed text`;
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