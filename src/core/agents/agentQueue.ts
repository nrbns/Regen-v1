/**
 * Agent Queue Manager - Unlimited agents with smart queuing and parallel execution
 * Prevents RAM explosion while feeling unlimited to users
 */

export interface QueuedAgent {
  id: string;
  query: string;
  mode: 'trade' | 'research' | 'dev' | 'document' | 'workflow';
  priority: 'low' | 'normal' | 'high';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  status: 'queued' | 'running' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

type AgentCallback = (agent: QueuedAgent) => void | Promise<void>;

class AgentQueueManager {
  private queue: QueuedAgent[] = [];
  private running: Map<string, QueuedAgent> = new Map();
  private maxParallel: number = 4;
  private maxConcurrentModels: number = 2;
  private loadedModels: Set<string> = new Set();
  private modelUsage: Map<string, number> = new Map(); // Track last used time
  private listeners: Set<AgentCallback> = new Set();

  constructor() {
    // Auto-unload idle models after 5 minutes
    setInterval(() => this.unloadIdleModels(), 60000); // Check every minute
  }

  /**
   * Add agent to queue
   */
  async enqueue(
    query: string,
    mode: QueuedAgent['mode'],
    priority: QueuedAgent['priority'] = 'normal'
  ): Promise<string> {
    const agent: QueuedAgent = {
      id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      query,
      mode,
      priority,
      createdAt: Date.now(),
      status: 'queued',
    };

    // Insert based on priority
    if (priority === 'high') {
      this.queue.unshift(agent);
    } else {
      this.queue.push(agent);
    }

    this.notifyListeners(agent);
    this.processQueue();

    return agent.id;
  }

  /**
   * Process queue - start agents up to max parallel limit
   */
  private async processQueue() {
    // Check if we can start more agents
    while (this.running.size < this.maxParallel && this.queue.length > 0) {
      const agent = this.queue.shift();
      if (!agent) break;

      // Check if we need to load a model
      const modelName = this.getModelForMode(agent.mode);
      if (!this.loadedModels.has(modelName) && this.loadedModels.size >= this.maxConcurrentModels) {
        // Need to unload a model first
        await this.unloadLeastUsedModel();
      }

      // Start agent
      agent.status = 'running';
      agent.startedAt = Date.now();
      this.running.set(agent.id, agent);
      this.loadedModels.add(modelName);
      this.modelUsage.set(modelName, Date.now());

      this.notifyListeners(agent);

      // Execute agent (non-blocking)
      this.executeAgent(agent).catch(error => {
        console.error(`[AgentQueue] Agent ${agent.id} failed:`, error);
        agent.status = 'failed';
        agent.error = error instanceof Error ? error.message : String(error);
        agent.completedAt = Date.now();
        this.running.delete(agent.id);
        this.notifyListeners(agent);
        this.processQueue(); // Try next in queue
      });
    }
  }

  /**
   * Execute agent task
   */
  private async executeAgent(agent: QueuedAgent): Promise<void> {
    try {
      // Import agent executor dynamically
      const { multiAgentSystem } = await import('./multiAgentSystem');
      const context = {
        mode: agent.mode,
        tabId: null,
        sessionId: agent.id,
      };
      const result = await multiAgentSystem.execute(agent.mode, agent.query, context);

      agent.status = 'completed';
      agent.result = result;
      agent.completedAt = Date.now();
    } catch (error) {
      agent.status = 'failed';
      agent.error = error instanceof Error ? error.message : String(error);
      agent.completedAt = Date.now();
      throw error;
    } finally {
      this.running.delete(agent.id);
      this.notifyListeners(agent);
      this.processQueue(); // Process next in queue
    }
  }

  /**
   * Get model name for agent mode (shared context optimization)
   */
  private getModelForMode(mode: QueuedAgent['mode']): string {
    // Use same model for similar modes to enable shared context
    switch (mode) {
      case 'research':
      case 'document':
        return 'phi3:mini'; // Research/document share model
      case 'trade':
        return 'phi3:mini'; // Trade uses same model
      case 'dev':
      case 'workflow':
        return 'phi3:mini'; // Dev/workflow share model
      default:
        return 'phi3:mini';
    }
  }

  /**
   * Unload least recently used model
   */
  private async unloadLeastUsedModel(): Promise<void> {
    if (this.loadedModels.size === 0) return;

    // Find least recently used model
    let oldestModel: string | null = null;
    let oldestTime = Infinity;

    for (const [model, lastUsed] of this.modelUsage.entries()) {
      if (lastUsed < oldestTime) {
        oldestTime = lastUsed;
        oldestModel = model;
      }
    }

    if (oldestModel) {
      this.loadedModels.delete(oldestModel);
      this.modelUsage.delete(oldestModel);
      console.log(`[AgentQueue] Unloaded model: ${oldestModel}`);
    }
  }

  /**
   * Unload models idle for > 5 minutes
   */
  private unloadIdleModels(): void {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const toUnload: string[] = [];

    for (const [model, lastUsed] of this.modelUsage.entries()) {
      if (lastUsed < fiveMinutesAgo) {
        toUnload.push(model);
      }
    }

    for (const model of toUnload) {
      this.loadedModels.delete(model);
      this.modelUsage.delete(model);
      console.log(`[AgentQueue] Auto-unloaded idle model: ${model}`);
    }
  }

  /**
   * Get queue status
   */
  getStatus(): {
    queued: number;
    running: number;
    completed: number;
    failed: number;
    queuePosition?: number;
  } {
    return {
      queued: this.queue.length,
      running: this.running.size,
      completed: this.queue.filter(a => a.status === 'completed').length,
      failed: this.queue.filter(a => a.status === 'failed').length,
    };
  }

  /**
   * Get queue position for agent
   */
  getQueuePosition(agentId: string): number {
    const index = this.queue.findIndex(a => a.id === agentId);
    return index >= 0 ? index + 1 : 0;
  }

  /**
   * Cancel agent
   */
  cancel(agentId: string): boolean {
    // Remove from queue
    const queueIndex = this.queue.findIndex(a => a.id === agentId);
    if (queueIndex >= 0) {
      this.queue.splice(queueIndex, 1);
      return true;
    }

    // Can't cancel running agents (would need to implement abort)
    return false;
  }

  /**
   * Subscribe to agent updates
   */
  onUpdate(callback: AgentCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(agent: QueuedAgent): void {
    for (const listener of this.listeners) {
      try {
        listener(agent);
      } catch (error) {
        console.error('[AgentQueue] Listener error:', error);
      }
    }
  }

  /**
   * Update max parallel based on system resources
   */
  setMaxParallel(max: number): void {
    this.maxParallel = max;
    this.processQueue(); // Re-process with new limit
  }

  /**
   * Update max concurrent models
   */
  setMaxConcurrentModels(max: number): void {
    this.maxConcurrentModels = max;
  }
}

export const agentQueue = new AgentQueueManager();
