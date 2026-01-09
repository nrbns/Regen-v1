/**
 * Task Runner - Single-run, user-triggered tasks only
 * NO background loops, NO autonomy, NO automatic execution
 */

import { backendService } from '../backend/BackendService';

export interface TaskDefinition {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export interface TaskExecution {
  id: string;
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  result?: any;
  error?: string;
}

class TaskRunner {
  private tasks: Map<string, TaskDefinition> = new Map();
  private executions: TaskExecution[] = [];
  private executionListeners: Set<(execution: TaskExecution) => void> = new Set();

  constructor() {
    // Register available tasks
    this.registerTask({
      id: 'summarize_page',
      name: 'Summarize Page',
      description: 'Extract and summarize current page content',
      enabled: true,
    });

    this.registerTask({
      id: 'extract_links',
      name: 'Extract Links',
      description: 'Extract all links from current page',
      enabled: true,
    });

    this.registerTask({
      id: 'analyze_content',
      name: 'Analyze Content',
      description: 'Analyze page content for key insights',
      enabled: true,
    });
  }

  /**
   * Register a task definition
   */
  registerTask(task: TaskDefinition): void {
    this.tasks.set(task.id, task);
  }

  /**
   * Get all available tasks
   */
  getAvailableTasks(): TaskDefinition[] {
    return Array.from(this.tasks.values()).filter(t => t.enabled);
  }

  /**
   * Get task by ID
   */
  getTask(id: string): TaskDefinition | undefined {
    return this.tasks.get(id);
  }

  /**
   * Execute a task (single-run, user-triggered only)
   */
  async executeTask(taskId: string, params?: Record<string, any>): Promise<TaskExecution> {
    const task = this.tasks.get(taskId);
    if (!task || !task.enabled) {
      throw new Error(`Task not found or disabled: ${taskId}`);
    }

    const execution: TaskExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      status: 'pending',
      startedAt: Date.now(),
    };

    this.executions.push(execution);
    this.notifyExecution(execution);

    try {
      execution.status = 'running';
      this.notifyExecution(execution);

      // Execute task logic
      const result = await this.runTaskLogic(taskId, params);

      execution.status = 'completed';
      execution.completedAt = Date.now();
      execution.result = result;
      this.notifyExecution(execution);

      return execution;
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = Date.now();
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      this.notifyExecution(execution);

      throw error;
    }
  }

  /**
   * Run task logic (implement actual task behavior here)
   */
  private async runTaskLogic(taskId: string, params?: Record<string, any>): Promise<any> {

    try {
      switch (taskId) {
        case 'summarize_page': {
          const url = params?.url || window.location.href;
          const scrapeResult = await backendService.scrapeUrl(url);
          if (scrapeResult) {
            const summary = await backendService.summarize(scrapeResult.text, url);
            return { 
              summary,
              title: scrapeResult.title,
              url 
            };
          }
          return { summary: 'Failed to summarize page', error: 'Scrape failed' };
        }
        
        case 'extract_links': {
          const url = params?.url || window.location.href;
          const scrapeResult = await backendService.scrapeUrl(url);
          if (scrapeResult) {
            // Extract links from HTML content (simplified)
            const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
            const links: string[] = [];
            let match;
            while ((match = linkRegex.exec(scrapeResult.content)) !== null) {
              try {
                const linkUrl = new URL(match[1], url).href;
                links.push(linkUrl);
              } catch {
                // Invalid URL, skip
              }
            }
            return { links: [...new Set(links)].slice(0, 20) };
          }
          return { links: [], error: 'Failed to extract links' };
        }
        
        case 'analyze_content': {
          const url = params?.url || window.location.href;
          const scrapeResult = await backendService.scrapeUrl(url);
          if (scrapeResult) {
            const analysis = await backendService.analyzeText(scrapeResult.text);
            return { 
              insights: [analysis],
              title: scrapeResult.title,
              url 
            };
          }
          return { insights: [], error: 'Failed to analyze content' };
        }
        
        default:
          return { message: 'Task executed', taskId };
      }
    } catch (error) {
      throw new Error(`Task execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get execution history
   */
  getExecutions(limit: number = 10): TaskExecution[] {
    return this.executions.slice(-limit).reverse();
  }

  /**
   * Get latest execution
   */
  getLatestExecution(): TaskExecution | undefined {
    return this.executions[this.executions.length - 1];
  }

  /**
   * Execution listeners
   */
  onExecution(listener: (execution: TaskExecution) => void): () => void {
    this.executionListeners.add(listener);
    return () => this.executionListeners.delete(listener);
  }

  private notifyExecution(execution: TaskExecution): void {
    this.executionListeners.forEach(listener => listener(execution));
  }
}

// Singleton instance
export const taskRunner = new TaskRunner();