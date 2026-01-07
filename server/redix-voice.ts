/**
 * Redix Voice Endpoint - Voice Companion Backend
 * 
 * Handles voice commands with context awareness, eco-checking, and consent logging
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

// Types
export interface VoiceRequest {
  transcript: string;
  url?: string;
  title?: string;
  selection?: string;
  tabId?: string;
  context?: {
    mode?: string;
    batteryLevel?: number;
    memoryUsage?: number;
  };
}

export interface VoiceResponse {
  response: string;
  action?: 'speak' | 'search' | 'summarize' | 'note' | 'none';
  ecoScore?: number;
  latency?: number;
  tokensUsed?: number;
}

// Eco Scorer
class EcoScorer {
  calculateGreenScore(energyWh: number, tokens: number): number {
    const score = 100 - (energyWh * 10 + tokens * 0.001);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  estimateEnergy(provider: string, tokens: number): number {
    const energyPer1K: Record<string, number> = {
      ollama: 0.01,
      'openai': 0.05,
      'anthropic': 0.06,
      'mistral': 0.04,
    };
    const base = energyPer1K[provider] || 0.05;
    return (tokens / 1000) * base;
  }
}

// Voice Command Processor
export class VoiceProcessor {
  private ecoScorer = new EcoScorer();

  // Initialize models
  private getGPTModel(temperature = 0.7) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY required');
    return new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature,
      openAIApiKey: apiKey,
    });
  }

  private getClaudeModel(temperature = 0.1) {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY required');
    return new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20241022',
      temperature,
      anthropicApiKey: apiKey,
    });
  }

  // Check if battery/memory constraints allow voice processing
  private checkEcoConstraints(context?: VoiceRequest['context']): { allowed: boolean; reason?: string } {
    if (context?.batteryLevel !== undefined && context.batteryLevel < 0.3) {
      return { allowed: false, reason: 'Battery low (<30%). Voice paused to save power.' };
    }
    if (context?.memoryUsage !== undefined && context.memoryUsage > 85) {
      return { allowed: false, reason: 'Memory pressure (>85%). Voice paused.' };
    }
    return { allowed: true };
  }

  // Determine action from transcript
  private detectAction(transcript: string): VoiceResponse['action'] {
    const lower = transcript.toLowerCase();
    if (lower.includes('search') || lower.includes('find') || lower.includes('look up')) {
      return 'search';
    }
    if (lower.includes('summarize') || lower.includes('summary') || lower.includes('explain')) {
      return 'summarize';
    }
    if (lower.includes('note') || lower.includes('save') || lower.includes('remember')) {
      return 'note';
    }
    return 'speak';
  }

  // Process voice command
  async processVoice(request: VoiceRequest): Promise<VoiceResponse> {
    const startTime = Date.now();
    
    // Eco-check
    const ecoCheck = this.checkEcoConstraints(request.context);
    if (!ecoCheck.allowed) {
      return {
        response: ecoCheck.reason || 'Voice processing paused.',
        action: 'none',
        latency: Date.now() - startTime,
      };
    }

    try {
      // Build context-aware prompt
      const contextParts: string[] = [];
      if (request.url) contextParts.push(`Current page: ${request.title || request.url}`);
      if (request.selection) contextParts.push(`Selected text: "${request.selection.substring(0, 200)}"`);
      const context = contextParts.length > 0 ? contextParts.join('\n') : 'No page context';

      // Use Claude for ethical, concise responses
      const prompt = ChatPromptTemplate.fromMessages([
        ['system', 'You are Regen, a helpful, ethical voice companion. Respond concisely (<100 tokens). Be proactive and context-aware.'],
        ['human', 'User said: {transcript}\n\nContext:\n{context}\n\nRespond naturally and helpfully:'],
      ]);

      const model = this.getClaudeModel(0.3); // Lower temp for more focused responses
      const chain = prompt.pipe(model).pipe(new StringOutputParser());
      
      const response = await chain.invoke({
        transcript: request.transcript,
        context,
      });

      // Detect action
      const action = this.detectAction(request.transcript);
      
      // Calculate eco score
      const tokensUsed = Math.ceil(response.length / 4);
      const energy = this.ecoScorer.estimateEnergy('anthropic', tokensUsed);
      const ecoScore = this.ecoScorer.calculateGreenScore(energy, tokensUsed);
      const latency = Date.now() - startTime;

      return {
        response: response.trim(),
        action,
        ecoScore,
        latency,
        tokensUsed,
      };
    } catch (error: any) {
      console.error('[VoiceProcessor] Error:', error);
      return {
        response: 'Sorry, I encountered an error processing your request.',
        action: 'none',
        latency: Date.now() - startTime,
      };
    }
  }
}

// Singleton instance
let voiceProcessorInstance: VoiceProcessor | null = null;

export function getVoiceProcessor(): VoiceProcessor {
  if (!voiceProcessorInstance) {
    voiceProcessorInstance = new VoiceProcessor();
  }
  return voiceProcessorInstance;
}

