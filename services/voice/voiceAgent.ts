/**
 * Voice Agent Controller
 * Orchestrates voice input, intent extraction, and action execution
 */

import { StreamingTranscriber, type StreamingTranscriberOptions } from './streamingTranscriber';
import { ttsService } from './ttsService';
import { AgentPlanner } from '../mailAgent/agentPlanner';
import { AgentExecutor } from '../mailAgent/executor';
import type { ApprovalRequest } from '../mailAgent/executor';

/**
 * Voice command result
 */
export interface VoiceCommandResult {
  command: string;
  planId: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: string;
  error?: string;
}

/**
 * Voice agent configuration
 */
export interface VoiceAgentConfig {
  userId: string;
  language?: string;
  enableSpokenFeedback: boolean;
  autoExecute: boolean; // Auto-execute low-risk commands
  maxRetries: number;
}

/**
 * Voice-controlled agent
 */
export class VoiceAgent {
  private config: VoiceAgentConfig;
  private transcriber: StreamingTranscriber | null = null;
  private planner: AgentPlanner;
  private executor: AgentExecutor;
  private isListening: boolean = false;

  constructor(config: VoiceAgentConfig) {
    this.config = {
      language: 'en-US',
      enableSpokenFeedback: true,
      autoExecute: false,
      maxRetries: 3,
      ...config,
    };
    this.planner = new AgentPlanner();
    this.executor = new AgentExecutor();
  }

  /**
   * Start listening for voice commands
   */
  async startListening(): Promise<void> {
    if (this.isListening) {
      console.warn('[VoiceAgent] Already listening');
      return;
    }

    const options: StreamingTranscriberOptions = {
      chunkDurationMs: 500,
      language: this.config.language,
      includePartial: true,
      onChunk: (chunk) => this.onTranscriptionChunk(chunk),
      onError: (error) => this.onTranscriptionError(error),
    };

    this.transcriber = new StreamingTranscriber(options);

    try {
      await this.transcriber.start();
      this.isListening = true;
      console.log('[VoiceAgent] Listening for commands...');

      if (this.config.enableSpokenFeedback) {
        await ttsService.play(
          (await ttsService.synthesize('Listening for your command')).audioBlob
        );
      }
    } catch (error) {
      console.error('[VoiceAgent] Failed to start listening:', error);
      throw error;
    }
  }

  /**
   * Stop listening and process command
   */
  async stopListening(): Promise<VoiceCommandResult | null> {
    if (!this.isListening || !this.transcriber) {
      return null;
    }

    this.isListening = false;

    try {
      const command = await this.transcriber.stop();

      if (!command) {
        return null;
      }

      console.log(`[VoiceAgent] Heard: "${command}"`);

      // Process command
      return await this.processCommand(command);
    } catch (error) {
      console.error('[VoiceAgent] Transcription failed:', error);
      throw error;
    }
  }

  /**
   * Process voice command
   */
  private async processCommand(command: string): Promise<VoiceCommandResult> {
    const userId = this.config.userId;

    try {
      // 1. Create plan from command
      const plan = this.planner.createPlan(userId, command);

      console.log(`[VoiceAgent] Created plan: ${plan.id}`);

      if (this.config.enableSpokenFeedback) {
        await ttsService.play(
          (await ttsService.synthesize(`Creating plan for: ${command}`)).audioBlob
        );
      }

      // 2. Decide: auto-execute or ask for approval
      if (!this.config.autoExecute && plan.requiresApproval) {
        if (this.config.enableSpokenFeedback) {
          const confirmText = `I found: ${plan.tasks.map((t) => t.type).join(', ')}. Shall I proceed?`;
          await ttsService.play((await ttsService.synthesize(confirmText)).audioBlob);
        }

        // In production: wait for voice confirmation
        // For now: assume approval
      }

      // 3. Execute plan
      const approvalHandler = async (request: ApprovalRequest) => {
        console.log(`[VoiceAgent] Approval needed: ${request.taskType}`);

        if (this.config.enableSpokenFeedback) {
          const prompt = `Ready to ${request.taskType}. Say yes to continue.`;
          await ttsService.play((await ttsService.synthesize(prompt)).audioBlob);
        }

        // Auto-approve low-risk tasks
        return !request.requiresApproval;
      };

      const context = await this.executor.execute(userId, plan, approvalHandler);

      if (this.config.enableSpokenFeedback) {
        const resultText = `Completed ${Object.keys(context.results).length} tasks`;
        await ttsService.play((await ttsService.synthesize(resultText)).audioBlob);
      }

      return {
        command,
        planId: plan.id,
        status: 'completed',
        result: JSON.stringify(context.results),
      };
    } catch (error) {
      console.error('[VoiceAgent] Command execution failed:', error);

      if (this.config.enableSpokenFeedback) {
        const errorMsg = `Sorry, I encountered an error. Please try again.`;
        await ttsService.play((await ttsService.synthesize(errorMsg)).audioBlob);
      }

      return {
        command,
        planId: `failed-${Date.now()}`,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Transcription chunk handler
   */
  private async onTranscriptionChunk(chunk: any): Promise<void> {
    if (!chunk.isFinal && this.config.enableSpokenFeedback) {
      console.log(`[VoiceAgent] Partial: "${chunk.partial}"`);
    }
  }

  /**
   * Transcription error handler
   */
  private async onTranscriptionError(error: Error): Promise<void> {
    console.error('[VoiceAgent] Transcription error:', error);

    if (this.config.enableSpokenFeedback) {
      await ttsService.play(
        (await ttsService.synthesize('Microphone error. Please try again.')).audioBlob
      );
    }
  }

  /**
   * Check if currently listening
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  /**
   * Get status
   */
  getStatus(): {
    listening: boolean;
    userId: string;
    language: string;
  } {
    return {
      listening: this.isListening,
      userId: this.config.userId,
      language: this.config.language || 'en',
    };
  }
}

export const createVoiceAgent = (config: VoiceAgentConfig) => new VoiceAgent(config);
