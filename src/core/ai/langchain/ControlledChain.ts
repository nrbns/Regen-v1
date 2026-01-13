/**
 * Controlled Chain - Safe LangChain Integration for Regen
 * 
 * CRITICAL PRINCIPLES:
 * 1. YOU define the chain explicitly - no hidden magic
 * 2. Chains are called FROM tasks, not autonomously
 * 3. Every step is visible and controllable
 * 4. No auto tool selection - you specify tools explicitly
 * 
 * This is a HELPER, not a replacement for task logic.
 */

import type { BaseExecutor, ExecutorInput, ExecutorResult } from '../executors/types';

export interface ChainStep {
  id: string;
  type: 'prompt' | 'tool' | 'model';
  config: {
    prompt?: string;
    tool?: string;
    model?: string;
    temperature?: number;
  };
  inputMapping?: Record<string, string>; // Map previous step outputs to this step's inputs
}

export interface ControlledChainConfig {
  steps: ChainStep[];
  outputParser?: (output: any) => string | Record<string, any>;
  errorHandler?: (error: Error, stepId: string) => ExecutorResult;
}

export interface ChainExecutionContext {
  stepResults: Map<string, any>;
  metadata: Record<string, any>;
}

/**
 * Controlled Chain - Explicit, visible, controllable
 * 
 * Usage:
 * ```typescript
 * const chain = new ControlledChain({
 *   steps: [
 *     { id: 'step1', type: 'model', config: { prompt: '...' } },
 *     { id: 'step2', type: 'tool', config: { tool: 'extract', inputMapping: { text: 'step1.output' } } }
 *   ]
 * });
 * 
 * const result = await chain.execute({ taskType: 'reason', prompt: '...' });
 * ```
 */
export class ControlledChain {
  private config: ControlledChainConfig;
  private executor: BaseExecutor;

  constructor(config: ControlledChainConfig, executor: BaseExecutor) {
    this.config = config;
    this.executor = executor;
  }

  /**
   * Execute the chain explicitly
   */
  async execute(input: ExecutorInput): Promise<ExecutorResult> {
    const context: ChainExecutionContext = {
      stepResults: new Map(),
      metadata: {},
    };

    try {
      // Execute each step in order
      for (const step of this.config.steps) {
        const stepInput = this.buildStepInput(step, input, context);
        const stepResult = await this.executeStep(step, stepInput);

        if (!stepResult.success) {
          // Error handler can decide to continue or fail
          if (this.config.errorHandler) {
            const handled = this.config.errorHandler(
              new Error(stepResult.error || 'Step failed'),
              step.id
            );
            if (!handled.success) {
              return handled;
            }
            context.stepResults.set(step.id, handled.output);
            continue;
          }
          return stepResult;
        }

        context.stepResults.set(step.id, stepResult.output);
      }

      // Final output
      const finalOutput = this.getFinalOutput(context);
      
      if (this.config.outputParser) {
        return {
          success: true,
          output: this.config.outputParser(finalOutput),
          metadata: {
            steps: this.config.steps.length,
          },
        };
      }

      return {
        success: true,
        output: finalOutput,
        metadata: {
          steps: this.config.steps.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error?.message || 'Chain execution failed',
      };
    }
  }

  /**
   * Build input for a step based on previous step outputs
   */
  private buildStepInput(
    step: ChainStep,
    initialInput: ExecutorInput,
    context: ChainExecutionContext
  ): ExecutorInput {
    let prompt = step.config.prompt || initialInput.prompt || '';
    let content = initialInput.content;

    // Apply input mapping
    if (step.inputMapping) {
      for (const [key, valuePath] of Object.entries(step.inputMapping)) {
        const value = this.resolveValuePath(valuePath, context);
        prompt = prompt.replace(`{${key}}`, String(value));
      }
    }

    return {
      ...initialInput,
      prompt,
      content,
      config: {
        ...initialInput.config,
        model: step.config.model || initialInput.config?.model,
        temperature: step.config.temperature ?? initialInput.config?.temperature,
      },
    };
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: ChainStep,
    input: ExecutorInput
  ): Promise<ExecutorResult> {
    switch (step.type) {
      case 'model':
        return this.executor.execute(input);
      case 'prompt':
        // Prompt-only step - just format, don't execute
        return {
          success: true,
          output: input.prompt || '',
        };
      case 'tool':
        // Tool execution - would need tool registry
        // For now, return error (tools should be explicit)
        return {
          success: false,
          output: '',
          error: `Tool execution not implemented. Tool: ${step.config.tool}`,
        };
      default:
        return {
          success: false,
          output: '',
          error: `Unknown step type: ${step.type}`,
        };
    }
  }

  /**
   * Resolve value path (e.g., "step1.output" or "context.metadata.key")
   */
  private resolveValuePath(path: string, context: ChainExecutionContext): any {
    const parts = path.split('.');
    
    if (parts[0] === 'context' && parts[1] === 'metadata') {
      return context.metadata[parts.slice(2).join('.')];
    }
    
    if (context.stepResults.has(parts[0])) {
      let value = context.stepResults.get(parts[0]);
      for (let i = 1; i < parts.length; i++) {
        value = value?.[parts[i]];
      }
      return value;
    }
    
    return undefined;
  }

  /**
   * Get final output from context
   */
  private getFinalOutput(context: ChainExecutionContext): any {
    const lastStep = this.config.steps[this.config.steps.length - 1];
    return context.stepResults.get(lastStep.id) || '';
  }
}

/**
 * Chain Builder - Helper to build chains declaratively
 */
export class ChainBuilder {
  private steps: ChainStep[] = [];

  /**
   * Add a prompt step
   */
  prompt(id: string, promptTemplate: string): this {
    this.steps.push({
      id,
      type: 'prompt',
      config: { prompt: promptTemplate },
    });
    return this;
  }

  /**
   * Add a model execution step
   */
  model(
    id: string,
    config: {
      prompt?: string;
      model?: string;
      temperature?: number;
      inputMapping?: Record<string, string>;
    }
  ): this {
    this.steps.push({
      id,
      type: 'model',
      config,
      inputMapping: config.inputMapping,
    });
    return this;
  }

  /**
   * Build the chain
   */
  build(executor: BaseExecutor, config?: Partial<ControlledChainConfig>): ControlledChain {
    return new ControlledChain(
      {
        steps: this.steps,
        ...config,
      },
      executor
    );
  }
}
