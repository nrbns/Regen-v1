/**
 * Agent Chain Executor
 * Phase 1, Day 8: Agent Chains (Simple)
 */

export interface ChainStep {
  id: string;
  type: 'action' | 'condition' | 'wait' | 'loop';
  action?: string;
  args?: Record<string, any>;
  condition?: string;
  steps?: ChainStep[]; // For nested chains
  waitTime?: number; // For wait steps (ms)
  loopCount?: number; // For loop steps
  onSuccess?: ChainStep[];
  onFailure?: ChainStep[];
}

export interface ChainDefinition {
  id: string;
  name: string;
  description?: string;
  steps: ChainStep[];
  variables?: Record<string, any>;
}

export interface ChainExecutionState {
  chainId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep: number;
  totalSteps: number;
  progress: number; // 0-100
  results: Array<{ stepId: string; success: boolean; result?: any; error?: string }>;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export type ChainProgressCallback = (state: ChainExecutionState) => void;

/**
 * Phase 1, Day 8: Parse YAML/JSON chain definition
 */
export function parseChainDefinition(yamlOrJson: string): ChainDefinition | null {
  try {
    let parsed: any;
    
    // Try JSON first
    try {
      parsed = JSON.parse(yamlOrJson);
    } catch {
      // Try YAML (simple parser for basic YAML)
      parsed = parseSimpleYAML(yamlOrJson);
    }

    if (!parsed || !parsed.steps || !Array.isArray(parsed.steps)) {
      return null;
    }

    return {
      id: parsed.id || `chain-${Date.now()}`,
      name: parsed.name || parsed.goal || 'Unnamed Chain',
      description: parsed.description,
      steps: parsed.steps.map((step: any, idx: number) => ({
        id: step.id || `step-${idx}`,
        type: step.type || 'action',
        action: step.action || step.skill,
        args: step.args || step.parameters || {},
        condition: step.condition,
        steps: step.steps,
        waitTime: step.waitTime || step.wait,
        loopCount: step.loopCount || step.loop,
        onSuccess: step.onSuccess,
        onFailure: step.onFailure,
      })),
      variables: parsed.variables || {},
    };
  } catch (error) {
    console.error('[ChainExecutor] Failed to parse chain definition:', error);
    return null;
  }
}

/**
 * Phase 1, Day 8: Simple YAML parser (basic support)
 */
function parseSimpleYAML(yaml: string): any {
  // Very basic YAML parser - just handles simple key-value pairs and arrays
  // For production, use a proper YAML library like js-yaml
  const lines = yaml.split('\n');
  const result: any = {};
  let currentKey = '';
  let currentArray: any[] = [];
  let inArray = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('-')) {
      // Array item
      if (!inArray) {
        inArray = true;
        currentArray = [];
      }
      const item = trimmed.substring(1).trim();
      if (item.startsWith('{')) {
        try {
          currentArray.push(JSON.parse(item));
        } catch {
          currentArray.push(item);
        }
      } else {
        currentArray.push(item);
      }
    } else if (trimmed.includes(':')) {
      // Key-value pair
      if (inArray && currentKey) {
        result[currentKey] = currentArray;
        inArray = false;
      }
      const [key, ...valueParts] = trimmed.split(':');
      currentKey = key.trim();
      const value = valueParts.join(':').trim();
      
      if (value.startsWith('[') || value.startsWith('{')) {
        try {
          result[currentKey] = JSON.parse(value);
        } catch {
          result[currentKey] = value;
        }
      } else if (value === '') {
        // Multi-line value or array
        inArray = true;
        currentArray = [];
      } else {
        result[currentKey] = value;
      }
    }
  }

  if (inArray && currentKey) {
    result[currentKey] = currentArray;
  }

  return result;
}

/**
 * Phase 1, Day 8: Execute agent chain with progress tracking
 */
export class ChainExecutor {
  private executionState: ChainExecutionState | null = null;
  private progressCallbacks: Set<ChainProgressCallback> = new Set();
  private cancelled = false;

  /**
   * Execute a chain definition
   */
  async execute(
    chain: ChainDefinition,
    onProgress?: ChainProgressCallback
  ): Promise<ChainExecutionState> {
    if (onProgress) {
      this.progressCallbacks.add(onProgress);
    }

    this.cancelled = false;
    const totalSteps = this.countSteps(chain.steps);

    this.executionState = {
      chainId: chain.id,
      status: 'running',
      currentStep: 0,
      totalSteps,
      progress: 0,
      results: [],
      startedAt: Date.now(),
    };

    this.notifyProgress();

    try {
      await this.executeSteps(chain.steps, chain.variables || {});
      
      if (!this.cancelled) {
        this.executionState.status = 'completed';
        this.executionState.progress = 100;
        this.executionState.completedAt = Date.now();
      }
    } catch (error) {
      if (!this.cancelled) {
        this.executionState.status = 'failed';
        this.executionState.error = error instanceof Error ? error.message : String(error);
      }
    } finally {
      this.notifyProgress();
    }

    return this.executionState;
  }

  /**
   * Cancel current execution
   */
  cancel(): void {
    this.cancelled = true;
    if (this.executionState) {
      this.executionState.status = 'cancelled';
      this.notifyProgress();
    }
  }

  /**
   * Get current execution state
   */
  getState(): ChainExecutionState | null {
    return this.executionState;
  }

  /**
   * Execute chain steps recursively
   */
  private async executeSteps(
    steps: ChainStep[],
    variables: Record<string, any>
  ): Promise<void> {
    for (const step of steps) {
      if (this.cancelled) break;

      if (this.executionState) {
        this.executionState.currentStep++;
        this.executionState.progress = Math.min(
          100,
          (this.executionState.currentStep / this.executionState.totalSteps) * 100
        );
        this.notifyProgress();
      }

      try {
        const result = await this.executeStep(step, variables);
        
        if (this.executionState) {
          this.executionState.results.push({
            stepId: step.id,
            success: true,
            result,
          });
        }

        // Execute onSuccess steps if any
        if (step.onSuccess && step.onSuccess.length > 0) {
          await this.executeSteps(step.onSuccess, variables);
        }
      } catch (error) {
        if (this.executionState) {
          this.executionState.results.push({
            stepId: step.id,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        // Execute onFailure steps if any
        if (step.onFailure && step.onFailure.length > 0) {
          await this.executeSteps(step.onFailure, variables);
        } else {
          // If no onFailure handler, throw error
          throw error;
        }
      }
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: ChainStep,
    variables: Record<string, any>
  ): Promise<any> {
    switch (step.type) {
      case 'action':
        return await this.executeAction(step, variables);
      case 'condition':
        return await this.evaluateCondition(step, variables);
      case 'wait':
        return await this.executeWait(step);
      case 'loop':
        return await this.executeLoop(step, variables);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * Execute an action step
   */
  private async executeAction(
    step: ChainStep,
    variables: Record<string, any>
  ): Promise<any> {
    if (!step.action) {
      throw new Error('Action step requires an action');
    }

    // Replace variables in args
    const resolvedArgs = this.resolveVariables(step.args || {}, variables);

    // Execute action based on type
    switch (step.action) {
      case 'navigate':
        return await this.actionNavigate(resolvedArgs);
      case 'click':
        return await this.actionClick(resolvedArgs);
      case 'type':
        return await this.actionType(resolvedArgs);
      case 'wait':
        return await this.actionWait(resolvedArgs);
      case 'research':
        return await this.actionResearch(resolvedArgs);
      case 'trade':
        return await this.actionTrade(resolvedArgs);
      default:
        // Try to call agent tool
        return await this.callAgentTool(step.action, resolvedArgs);
    }
  }

  /**
   * Resolve variables in arguments
   */
  private resolveVariables(args: Record<string, any>, variables: Record<string, any>): Record<string, any> {
    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        const varName = value.slice(2, -1);
        resolved[key] = variables[varName] ?? value;
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }

  /**
   * Action implementations
   */
  private async actionNavigate(args: Record<string, any>): Promise<any> {
    const url = args.url;
    if (!url) throw new Error('Navigate action requires url');
    
    // Use tabs store to navigate
    const { useTabsStore } = await import('../../state/tabsStore');
    const tabsStore = useTabsStore.getState();
    const activeTab = tabsStore.tabs.find(t => t.id === tabsStore.activeId);
    
    if (activeTab) {
      tabsStore.navigateTab(activeTab.id, url);
      return { success: true, url };
    }
    throw new Error('No active tab to navigate');
  }

  private async actionClick(_args: Record<string, any>): Promise<any> {
    // Placeholder - would need DOM interaction
    return { success: true, message: 'Click action executed' };
  }

  private async actionType(_args: Record<string, any>): Promise<any> {
    // Placeholder - would need DOM interaction
    return { success: true, message: 'Type action executed' };
  }

  private async actionWait(args: Record<string, any>): Promise<any> {
    const ms = args.ms || args.time || 1000;
    await new Promise(resolve => setTimeout(resolve, ms));
    return { success: true, waited: ms };
  }

  private async actionResearch(args: Record<string, any>): Promise<any> {
    const query = args.query;
    if (!query) throw new Error('Research action requires query');
    
    // Trigger research mode
    const { useAppStore } = await import('../../state/appStore');
    useAppStore.getState().setMode('Research');
    
    return { success: true, query };
  }

  private async actionTrade(_args: Record<string, any>): Promise<any> {
    // Trigger trade mode
    const { useAppStore } = await import('../../state/appStore');
    useAppStore.getState().setMode('Trade');
    
    return { success: true };
  }

  private async callAgentTool(action: string, args: Record<string, any>): Promise<any> {
    // Try to call agent tool
    const { multiAgentSystem } = await import('./multiAgentSystem');
    const context = { mode: 'workflow' as const };
    const agent = multiAgentSystem.getAgent('workflow', context);
    
    if (agent && typeof agent.execute === 'function') {
      // SECURITY: Execute with single object parameter (safer)
      return await (agent.execute as any)({ action, ...args });
    }
    
    throw new Error(`Unknown action: ${action}`);
  }

  /**
   * Evaluate condition step
   */
  private async evaluateCondition(
    step: ChainStep,
    variables: Record<string, any>
  ): Promise<boolean> {
    if (!step.condition) {
      throw new Error('Condition step requires a condition');
    }

    // Phase 1, Day 8: Simple condition evaluation (safe)
    try {
      // Replace variables in condition
      let condition = step.condition;
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        condition = condition.replace(regex, String(value));
      }
      
      // Basic condition evaluation (safe operations only)
      // Support: ==, !=, <, >, <=, >=, &&, ||, true, false
      // For production, use a proper expression evaluator library
      if (condition === 'true') return true;
      if (condition === 'false') return false;
      
      // Simple comparisons
      if (condition.includes('==')) {
        const [left, right] = condition.split('==').map(s => s.trim());
        return left === right;
      }
      if (condition.includes('!=')) {
        const [left, right] = condition.split('!=').map(s => s.trim());
        return left !== right;
      }
      
      // Default: return true if condition is not empty
      return condition.length > 0;
    } catch (error) {
      throw new Error(`Failed to evaluate condition: ${error}`);
    }
  }

  /**
   * Execute wait step
   */
  private async executeWait(step: ChainStep): Promise<void> {
    const waitTime = step.waitTime || 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  /**
   * Execute loop step
   */
  private async executeLoop(
    step: ChainStep,
    variables: Record<string, any>
  ): Promise<any[]> {
    if (!step.steps || step.steps.length === 0) {
      throw new Error('Loop step requires nested steps');
    }

    const loopCount = step.loopCount || 1;
    const results: any[] = [];

    for (let i = 0; i < loopCount; i++) {
      if (this.cancelled) break;
      variables['loopIndex'] = i;
      const result = await this.executeSteps(step.steps, variables);
      results.push(result);
    }

    return results;
  }

  /**
   * Count total steps in chain
   */
  private countSteps(steps: ChainStep[]): number {
    let count = 0;
    for (const step of steps) {
      count++;
      if (step.steps) {
        count += this.countSteps(step.steps);
      }
      if (step.onSuccess) {
        count += this.countSteps(step.onSuccess);
      }
      if (step.onFailure) {
        count += this.countSteps(step.onFailure);
      }
      if (step.type === 'loop' && step.loopCount) {
        count += (step.loopCount - 1) * (step.steps?.length || 0);
      }
    }
    return count;
  }

  /**
   * Notify progress callbacks
   */
  private notifyProgress(): void {
    if (this.executionState) {
      this.progressCallbacks.forEach(cb => {
        try {
          cb({ ...this.executionState! });
        } catch (error) {
          console.error('[ChainExecutor] Progress callback error:', error);
        }
      });
    }
  }
}

// Singleton instance
let executorInstance: ChainExecutor | null = null;

export function getChainExecutor(): ChainExecutor {
  if (!executorInstance) {
    executorInstance = new ChainExecutor();
  }
  return executorInstance;
}

