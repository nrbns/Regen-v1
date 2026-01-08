// AI Controller - Orchestrates Local vs Online LLM execution
// Single entry point for all AI operations in Regen

import { localLLM } from './offline/localLLM';
import { onlineLLM } from './online/onlineLLM';
import { ContentExtractor, ExtractedContent } from '../content/extractor';

export type AIModel = 'local' | 'online';
export type AITask = 'explain' | 'summarize' | 'extract';

export interface AIRequest {
  content: ExtractedContent;
  task: AITask;
  model: AIModel;
}

export interface AIResponse {
  text: string;
  model: AIModel;
  tokensUsed: number;
  processingTime: number;
  isStreaming: boolean;
}

export class AIController {
  private preferredModel: AIModel = 'local'; // Default to offline-first
  private isInitialized: boolean = false;
  private activeOperations = new Map<string, AbortController>();

  // PERFORMANCE GUARDRAILS
  private readonly CPU_LIMIT = 80; // %
  private readonly RAM_LIMIT = 85; // %
  private readonly MAX_CONCURRENT_OPERATIONS = 2;

  /**
   * Initialize AI systems
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      console.log('[AIController] Initializing AI systems...');

      // Initialize local LLM (required)
      const localReady = await localLLM.initialize();
      if (!localReady) {
        console.error('[AIController] Local LLM initialization failed');
        return false;
      }

      // Online LLM is optional - initialize if available
      console.log('[AIController] Local LLM ready, online LLM available as fallback');

      this.isInitialized = true;
      console.log('[AIController] AI systems initialized successfully');
      return true;
    } catch (error) {
      console.error('[AIController] AI initialization failed:', error);
      return false;
    }
  }

  /**
   * Set preferred model (local-first philosophy)
   */
  setPreferredModel(model: AIModel): void {
    this.preferredModel = model;
    console.log(`[AIController] Preferred model set to: ${model}`);
  }

  /**
   * Get preferred model
   */
  getPreferredModel(): AIModel {
    return this.preferredModel;
  }

  /**
   * Check if specific model is available
   */
  isModelAvailable(model: AIModel): boolean {
    switch (model) {
      case 'local':
        return localLLM.isAvailable();
      case 'online':
        return onlineLLM.isAvailable();
      default:
        return false;
    }
  }

  /**
   * Process AI request with comprehensive failure handling
   */
  async processRequest(request: AIRequest, operationId?: string): Promise<AIResponse> {
    const { content, task, model } = request;
    const startTime = Date.now();
    const opId = operationId || `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create abort controller for this operation
    const abortController = new AbortController();
    this.activeOperations.set(opId, abortController);

    // FAILURE-FIRST: Check system resources before starting
    const systemHealth = this.checkSystemHealth();
    if (!systemHealth.canRunAI) {
      throw new Error(`System overloaded: ${systemHealth.reason}`);
    }

    // Validate model availability with detailed error messages
    if (!this.isModelAvailable(model)) {
      if (model === 'online' && !navigator.onLine) {
        throw new Error('Online model unavailable: No internet connection');
      } else if (model === 'online' && this.isModelAvailable('local')) {
        console.log(`[AIController] Online model unavailable, falling back to local`);
        request.model = 'local';
      } else if (model === 'local') {
        throw new Error('Local model unavailable: Check system resources');
      } else {
        throw new Error(`${model} model not available`);
      }
    }

    // Prepare content for AI
    const prompt = ContentExtractor.prepareForAI(content, task);

    try {
      console.log(`[AIController] Processing ${task} request using ${request.model} model`);

      let fullResponse = '';
      let tokensUsed = 0;
      let hasTimedOut = false;

      // Set up timeout (30 seconds for local, 60 for online)
      const timeoutMs = request.model === 'local' ? 30000 : 60000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          hasTimedOut = true;
          reject(new Error(`${request.model} model timed out after ${timeoutMs/1000}s`));
        }, timeoutMs);
      });

      // Generate response with timeout protection
      const generationPromise = this.generateWithModel(request.model, prompt);

      const generationResult = await Promise.race([generationPromise, timeoutPromise]);

      try {
        for await (const chunk of generationResult) {
          // INTERRUPTIBILITY: Check for cancellation at each chunk
          if (abortController.signal.aborted) {
            throw new Error('Operation cancelled by user');
          }

          if (hasTimedOut) break;

          fullResponse = chunk.text;
          tokensUsed = Math.floor(fullResponse.length / 4);

          // FAILURE-FIRST: Check if system is still healthy during generation
          const midGenerationHealth = this.checkSystemHealth();
          if (!midGenerationHealth.canRunAI) {
            throw new Error(`Generation paused: ${midGenerationHealth.reason}`);
          }

          this.emitStreamingUpdate(task, fullResponse, chunk.done);
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Operation cancelled by user') {
          throw error; // Re-throw cancellation
        }
        throw error;
      }

      const processingTime = Date.now() - startTime;

      const response: AIResponse = {
        text: fullResponse,
        model: request.model,
        tokensUsed,
        processingTime,
        isStreaming: false
      };

      // Clean up abort controller on success
      this.activeOperations.delete(opId);

      console.log(`[AIController] Request completed in ${processingTime}ms using ${tokensUsed} tokens`);
      return response;

    } catch (error) {
      // Clean up abort controller on error
      this.activeOperations.delete(opId);

      const errorMessage = error instanceof Error ? error.message : 'Unknown AI error';

      console.error('[AIController] Request failed:', errorMessage);

      // FAILURE-FIRST: Emit failure details for UI
      this.emitFailureDetails(task, errorMessage, Date.now() - startTime);

      throw new Error(errorMessage);
    }
  }

  /**
   * Generate with specific model (separated for timeout handling)
   */
  private async *generateWithModel(model: AIModel, prompt: string) {
    if (model === 'local') {
      yield* localLLM.generate(prompt);
    } else {
      yield* onlineLLM.generate(prompt);
    }
  }

  /**
   * Check system health before/ during AI operations - PERFORMANCE GUARDRAILS
   */
  private checkSystemHealth(): { canRunAI: boolean; reason?: string; shouldThrottle?: boolean } {
    // Simulate system health checks (would use real system monitoring)
    const cpuUsage = 45; // Would get from actual system monitoring
    const ramUsage = 60; // Would get from actual system monitoring
    const hasInternet = navigator.onLine;
    const activeOps = this.activeOperations.size;

    // HARD LIMITS - Block new operations
    if (cpuUsage > this.CPU_LIMIT) {
      return {
        canRunAI: false,
        reason: `CPU usage too high (${cpuUsage}% > ${this.CPU_LIMIT}%)`,
        shouldThrottle: true
      };
    }

    if (ramUsage > this.RAM_LIMIT) {
      return {
        canRunAI: false,
        reason: `Memory usage too high (${ramUsage}% > ${this.RAM_LIMIT}%)`,
        shouldThrottle: true
      };
    }

    if (activeOps >= this.MAX_CONCURRENT_OPERATIONS) {
      return {
        canRunAI: false,
        reason: `Too many concurrent operations (${activeOps}/${this.MAX_CONCURRENT_OPERATIONS})`,
        shouldThrottle: false
      };
    }

    if (!hasInternet && this.preferredModel === 'online') {
      return {
        canRunAI: false,
        reason: 'No internet connection for online model',
        shouldThrottle: false
      };
    }

    // SOFT LIMITS - Allow but with warnings
    if (cpuUsage > 60 || ramUsage > 70) {
      console.warn(`[AIController] System under load - CPU: ${cpuUsage}%, RAM: ${ramUsage}%`);
    }

    return { canRunAI: true };
  }

  /**
   * Emit detailed failure information
   */
  private emitFailureDetails(task: AITask, error: string, duration: number): void {
    // In real implementation, this would emit to the task system
    console.error(`[AIController] Task ${task} failed after ${duration}ms: ${error}`);

    // Would integrate with logging system
    if (typeof window !== 'undefined' && (window as any).regen) {
      // Emit failure event for UI
    }
  }

  /**
   * Handle text selection for AI processing
   */
  async processSelectedText(selectedText: string, task: AITask = 'explain'): Promise<AIResponse> {
    // Create minimal content object for selected text
    const content: ExtractedContent = {
      title: 'Selected Text',
      url: window.location.href,
      text: selectedText,
      selectedText,
      metadata: {
        wordCount: selectedText.split(/\s+/).length,
        readingTime: Math.ceil(selectedText.split(/\s+/).length / 200),
        language: 'en'
      }
    };

    return this.processRequest({
      content,
      task,
      model: this.preferredModel
    });
  }

  /**
   * Handle page content for AI processing
   */
  async processPageContent(task: AITask = 'summarize'): Promise<AIResponse> {
    const content = await ContentExtractor.extractPageContent();

    return this.processRequest({
      content,
      task,
      model: this.preferredModel
    });
  }

  /**
   * Cancel an active AI operation
   */
  cancelOperation(operationId: string): boolean {
    const controller = this.activeOperations.get(operationId);
    if (controller) {
      controller.abort();
      this.activeOperations.delete(operationId);
      console.log(`[AIController] Cancelled operation: ${operationId}`);
      return true;
    }
    return false;
  }

  /**
   * Check if operation is active
   */
  isOperationActive(operationId: string): boolean {
    return this.activeOperations.has(operationId);
  }

  /**
   * Get active operations count
   */
  getActiveOperationsCount(): number {
    return this.activeOperations.size;
  }

  /**
   * Get model information for UI display
   */
  getModelInfo(model?: AIModel) {
    const targetModel = model || this.preferredModel;

    switch (targetModel) {
      case 'local':
        return {
          ...localLLM.getModelInfo(),
          displayName: 'Local (Fast, Private)',
          description: 'Runs on your device, no data sent externally'
        };
      case 'online':
        return {
          ...onlineLLM.getModelInfo(),
          displayName: 'Online (Stronger Reasoning)',
          description: 'Uses cloud AI for enhanced capabilities'
        };
      default:
        return null;
    }
  }

  /**
   * Emit streaming updates (would integrate with task system)
   */
  private emitStreamingUpdate(task: AITask, text: string, done: boolean): void {
    // In real implementation, this would emit to the task system
    // For now, just log
    console.log(`[AIController] Streaming update - ${task}: ${text.length} chars, done: ${done}`);

    // Emit IPC event for UI updates
    if (typeof window !== 'undefined' && (window as any).regen) {
      // This would trigger UI updates through the task system
    }
  }

  /**
   * Check overall AI system health
   */
  getSystemHealth() {
    return {
      initialized: this.isInitialized,
      localModel: {
        available: localLLM.isAvailable(),
        info: localLLM.getModelInfo()
      },
      onlineModel: {
        available: onlineLLM.isAvailable(),
        info: onlineLLM.getModelInfo()
      },
      preferredModel: this.preferredModel
    };
  }
}

// Global instance
export const aiController = new AIController();
