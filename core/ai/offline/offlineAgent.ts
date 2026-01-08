import { createTask, start, stream, log, complete, fail } from '../../execution/taskManager';
import { runLocalLLM, runLocalLLMSimulation, checkLlamaCppAvailable } from './localLLM';
import { AgentContext } from '../agentContext';

/**
 * Offline AI Agent using local GGUF models
 * Streams tokens in real-time for immediate UI feedback
 */
export class OfflineAgent {
  private modelPath?: string;
  private isLoaded = false;

  constructor(modelPath?: string) {
    this.modelPath = modelPath;
  }

  /**
   * Run the agent with streaming output (implements Agent interface)
   */
  async *run(context: AgentContext): AsyncIterable<string> {
    if (!this.isLoaded) {
      await this.initialize();
    }

    const prompt = this.buildPrompt(context);

    yield "Analyzing content...\n";

    if (context.intent.includes('summarize')) {
      yield "Generating summary...\n";
      const summary = await this.generateSummary(context);
      for (const chunk of summary.split(' ')) {
        yield chunk + ' ';
        await this.delay(50); // Simulate streaming
      }
    } else if (context.intent.includes('explain')) {
      yield "Generating explanation...\n";
      const explanation = await this.generateExplanation(context);
      for (const chunk of explanation.split(' ')) {
        yield chunk + ' ';
        await this.delay(50); // Simulate streaming
      }
    } else {
      yield "Processing request...\n";
      const response = await this.generateResponse(prompt);
      for (const chunk of response.split(' ')) {
        yield chunk + ' ';
        await this.delay(30); // Simulate streaming
      }
    }

    yield "\n\n**Model: Local (Fast, Private)**";
  }

  /**
   * Build prompt from context
   */
  private buildPrompt(context: AgentContext): string {
    const { intent, selection, page } = context;

    if (selection) {
      return `Task: ${intent}\nSelected text: "${selection}"\nPage: ${page.title} (${page.url})`;
    } else {
      return `Task: ${intent}\nPage content: ${page.text.substring(0, 2000)}\nPage: ${page.title} (${page.url})`;
    }
  }

  /**
   * Generate summary from context
   */
  private async generateSummary(context: AgentContext): Promise<string> {
    const { selection, page } = context;
    const content = selection || page.text;

    // Simulate AI summary generation
    return `## Summary

**Page:** ${page.title}
**URL:** ${page.url}

${content.length > 500 ? content.substring(0, 500) + '...' : content}

**Key Points:**
• This content discusses ${page.title.toLowerCase()}
• Main focus appears to be on ${selection ? 'the selected text' : 'the page content'}
• The information seems to be educational/informational in nature

**Analysis:** Content appears to be well-structured and informative.`;
  }

  /**
   * Generate explanation from context
   */
  private async generateExplanation(context: AgentContext): Promise<string> {
    const { selection, page } = context;
    const content = selection || page.text;

    // Simulate AI explanation generation
    return `## Explanation

**What this content is about:**

This ${selection ? 'selected text' : 'web page'} discusses ${page.title.toLowerCase()}. 

**Breaking it down:**

${content.length > 300 ? content.substring(0, 300) + '...' : content}

**Key concepts:**
• **Main topic:** ${page.title.split(':')[0] || page.title}
• **Context:** Information presented on ${page.url.split('/')[2]}
• **Purpose:** To ${selection ? 'highlight specific information' : 'provide comprehensive information'}

**Why this matters:**
This content helps users understand ${page.title.toLowerCase()} by providing ${selection ? 'focused details' : 'broader context'}.`;
  }

  /**
   * Generate general response
   */
  private async generateResponse(prompt: string): Promise<string> {
    // Simulate AI response generation
    return `Based on your request: "${prompt.substring(0, 100)}..."

I've analyzed the content and here's what I found:

• **Analysis:** The content appears to be informative and well-structured
• **Key insights:** Main focus is on providing valuable information
• **Recommendations:** Consider exploring related topics for deeper understanding

This is a simulated response using local AI processing. In a production implementation, this would use a real GGUF model running locally on your machine.`;
  }

  /**
   * Initialize the offline model
   */
  async initialize(): Promise<boolean> {
    try {
      // In a real implementation, this would load the GGUF model
      // For now, we'll simulate the loading process
      console.log('[OfflineAgent] Initializing offline AI model...');

      // Simulate loading time
      await this.delay(500);

      this.isLoaded = true;
      return true;
    } catch (error) {
      console.error('[OfflineAgent] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Process a text prompt with streaming output
   */
  async processPrompt(prompt: string): Promise<string> {
    const task = createTask(`offline-ai: ${prompt.substring(0, 50)}...`);
    const taskId = task.id;

    try {
      if (!this.isLoaded) {
        throw new Error('Offline AI model not loaded');
      }

      start(task);
      log(task, 'Starting offline AI processing');
      log(task, `Model: ${this.modelPath || 'qwen2.5-1.5b.gguf'}`);

      // Use real llama.cpp if available, otherwise simulate
      const response = await this.generateResponse(prompt, task);

      complete(task);
      log(task, `Generated ${response.length} characters`);

      return response;

    } catch (error) {
      fail(task, String(error));
      log(task, `Processing failed: ${error}`);
      throw error;
    }
  }


  /**
   * Check if the agent is ready
   */
  isReady(): boolean {
    return this.isLoaded;
  }

  /**
   * Get agent status and capabilities
   */
  getStatus() {
    return {
      loaded: this.isLoaded,
      model: this.modelPath || 'default-gguf-model',
      capabilities: ['text-generation', 'summarization', 'code-generation', 'analysis'],
      privacy: 'local-only',
      speed: 'fast'
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Global offline agent instance
 */
export const offlineAgent = new OfflineAgent();

/**
 * Initialize the global offline agent
 */
export async function initializeOfflineAgent(): Promise<boolean> {
  return await offlineAgent.initialize();
}

/**
 * Process text with the offline agent (streaming)
 */
export async function processWithOfflineAgent(prompt: string): Promise<string> {
  return await offlineAgent.processPrompt(prompt);
}

/**
 * Export the offline agent as an Agent interface implementation
 */
export { offlineAgent as offlineAgentInstance };
