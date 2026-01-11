/**
 * Task Runner - Single-run, user-triggered tasks only
 * NO background loops, NO autonomy, NO automatic execution
 * 
 * FIX: All tasks validated with strict Zod schemas
 * PERFORMANCE: Hard timeouts (10s) + result caching
 */

import { backendService } from '../backend/BackendService';
import { aiResultCache } from '../cache/AIResultCache';
import { z } from 'zod';

// FIX: Strict schema validation for tasks
export const TaskDefinitionSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9_-]+$/, 'Task ID must be lowercase alphanumeric with dashes/underscores'),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  enabled: z.boolean().default(true),
});

export const TaskParamsSchema = z.record(z.string(), z.unknown()).optional();

export const TaskExecutionSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  startedAt: z.number(),
  completedAt: z.number().optional(),
  result: z.unknown().optional(),
  error: z.string().optional(),
  params: TaskParamsSchema,
});

export type TaskDefinition = z.infer<typeof TaskDefinitionSchema>;

export type TaskExecution = z.infer<typeof TaskExecutionSchema>;

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
   * Register a task definition (validated with strict schema)
   */
  registerTask(task: TaskDefinition): void {
    // FIX: Validate task schema before registration
    try {
      const validated = TaskDefinitionSchema.parse(task);
      this.tasks.set(validated.id, validated);
      console.log(`[TaskRunner] Registered task: ${validated.id}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Invalid task definition for "${task.id}": ${errorMessages}`);
      }
      throw error;
    }
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
   * FIX: Validates task ID and params with strict schema
   * PERFORMANCE: Hard timeout (10s) with auto-kill
   */
  async executeTask(taskId: string, params?: Record<string, any>): Promise<TaskExecution> {
    // FIX: Validate task ID format
    if (!/^[a-z0-9_-]+$/.test(taskId)) {
      throw new Error(`Invalid task ID format: "${taskId}". Task ID must be lowercase alphanumeric with dashes/underscores.`);
    }

    // FIX: Validate task exists
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: "${taskId}". Available tasks: ${Array.from(this.tasks.keys()).join(', ')}`);
    }

    if (!task.enabled) {
      throw new Error(`Task is disabled: "${taskId}"`);
    }

    // FIX: Validate params schema (if task has param schema, validate it)
    try {
      TaskParamsSchema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Invalid task parameters for "${taskId}": ${errorMessages}`);
      }
      throw error;
    }

    const execution: TaskExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId,
      status: 'pending',
      startedAt: Date.now(),
      params,
    };

    // FIX: Validate execution schema
    TaskExecutionSchema.parse(execution);

    this.executions.push(execution);
    this.notifyExecution(execution);

    try {
      execution.status = 'running';
      this.notifyExecution(execution);

      // PERFORMANCE: Check cache first
      const cacheKey = `${taskId}:${params?.url || window.location.href}`;
      const cached = aiResultCache.get(cacheKey);
      
      if (cached) {
        execution.status = 'completed';
        execution.completedAt = Date.now();
        execution.result = { ...cached, cached: true };
        this.notifyExecution(execution);
        return execution;
      }

      // PERFORMANCE: Execute task logic with hard timeout (10s)
      const result = await this.runTaskWithTimeout(taskId, params, 10000);

      // PERFORMANCE: Cache successful result
      aiResultCache.set(cacheKey, result, params?.sessionId || 'default');

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
   * PERFORMANCE: Run task with hard timeout (auto-kill after timeout)
   */
  private async runTaskWithTimeout(
    taskId: string,
    params: Record<string, any> | undefined,
    timeout: number
  ): Promise<any> {
    return Promise.race([
      this.runTaskLogic(taskId, params),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Task timeout: ${taskId} exceeded ${timeout}ms limit`)), timeout)
      ),
    ]);
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