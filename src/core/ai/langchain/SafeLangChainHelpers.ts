/**
 * Safe LangChain Helpers - Utility functions that DON'T lose control
 * 
 * These are HELPERS only - they don't replace task logic.
 * Use them for:
 * - Prompt templating
 * - Output parsing
 * - Streaming helpers
 * - Tool calling abstraction (NOT auto tool selection)
 */

/**
 * Prompt Template Helper
 * Simple templating without LangChain's complexity
 */
export class PromptTemplate {
  private template: string;
  private variables: Set<string>;

  constructor(template: string) {
    this.template = template;
    this.variables = new Set();
    
    // Extract variables from template {variable}
    const matches = template.match(/\{(\w+)\}/g);
    if (matches) {
      matches.forEach(match => {
        this.variables.add(match.slice(1, -1));
      });
    }
  }

  /**
   * Format the template with variables
   */
  format(variables: Record<string, string | number>): string {
    let result = this.template;
    
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
    
    // Warn about missing variables
    const missing = Array.from(this.variables).filter(v => !(v in variables));
    if (missing.length > 0) {
      console.warn(`[PromptTemplate] Missing variables: ${missing.join(', ')}`);
    }
    
    return result;
  }

  /**
   * Get required variables
   */
  getVariables(): string[] {
    return Array.from(this.variables);
  }
}

/**
 * Output Parser Helper
 * Parse structured outputs from model responses
 */
export class OutputParser {
  /**
   * Parse JSON from model response
   */
  static parseJSON<T = any>(text: string): T | null {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // Try to find JSON object in text
      const objectMatch = text.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }
      
      // Try parsing the whole text
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  /**
   * Parse list from model response
   */
  static parseList(text: string): string[] {
    try {
      const parsed = this.parseJSON<string[]>(text);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Fallback to line-by-line parsing
    }
    
    // Fallback: split by lines
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'))
      .map(line => line.replace(/^[-*]\s*/, '')); // Remove list markers
  }

  /**
   * Parse key-value pairs
   */
  static parseKeyValue(text: string): Record<string, string> {
    const result: Record<string, string> = {};
    
    // Try JSON first
    const parsed = this.parseJSON<Record<string, string>>(text);
    if (parsed) {
      return parsed;
    }
    
    // Fallback: parse key: value format
    const lines = text.split('\n');
    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        result[match[1].trim()] = match[2].trim();
      }
    }
    
    return result;
  }
}

/**
 * Streaming Helper
 * Handle streaming responses without LangChain complexity
 */
export class StreamingHelper {
  /**
   * Process streaming tokens
   */
  static async processStream(
    stream: ReadableStream<Uint8Array>,
    onToken: (token: string) => void
  ): Promise<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        onToken(chunk);
      }

      return fullText;
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Buffer tokens and emit in chunks
   */
  static createChunkedEmitter(
    onChunk: (chunk: string) => void,
    chunkSize: number = 10
  ): (token: string) => void {
    let buffer = '';
    let tokenCount = 0;

    return (token: string) => {
      buffer += token;
      tokenCount++;

      if (tokenCount >= chunkSize) {
        onChunk(buffer);
        buffer = '';
        tokenCount = 0;
      }
    };
  }
}

/**
 * Tool Calling Abstraction
 * Define tools explicitly - NO auto tool selection
 */
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
  }>;
  execute: (params: Record<string, any>) => Promise<any>;
}

/**
 * Tool Registry - Explicit tool management
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  /**
   * Register a tool explicitly
   */
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get a tool by name
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * List all registered tools
   */
  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Execute a tool explicitly (NO auto selection)
   */
  async execute(name: string, params: Record<string, any>): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    // Validate parameters
    for (const [paramName, paramDef] of Object.entries(tool.parameters)) {
      if (paramDef.required && !(paramName in params)) {
        throw new Error(`Missing required parameter: ${paramName}`);
      }
    }

    return tool.execute(params);
  }
}
