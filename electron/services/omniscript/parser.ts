/**
 * OmniScript - Natural Language Browser Programming
 * Parses natural language commands into browser actions
 */

import { getOllamaAdapter } from '../agent/ollama-adapter';

export interface ParsedCommand {
  action: string;
  target?: string;
  parameters?: Record<string, unknown>;
  confidence: number;
}

export interface BrowserAction {
  type: 'navigate' | 'click' | 'type' | 'extract' | 'export' | 'summarize' | 'cite' | 'wait' | 'scroll';
  target?: string;
  value?: string;
  selector?: string;
  waitTime?: number;
}

export class OmniScriptParser {
  /**
   * Parse natural language command into structured action
   */
  async parse(command: string): Promise<ParsedCommand | null> {
    const ollama = getOllamaAdapter();
    const isAvailable = await ollama.checkAvailable();

    if (!isAvailable) {
      // Fallback: simple keyword-based parsing
      return this.simpleParse(command);
    }

    try {
      // Use LLM to parse command
      const prompt = `Parse this browser command into JSON: "${command}"

Return JSON with:
{
  "action": "navigate|click|type|extract|export|summarize|cite|wait|scroll",
  "target": "url or selector",
  "parameters": { ... },
  "confidence": 0.0-1.0
}`;

      const response = await ollama.chat([
        {
          role: 'system',
          content: 'You are a browser command parser. Always return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as ParsedCommand;
        return parsed;
      }

      // Fallback
      return this.simpleParse(command);
    } catch {
      return this.simpleParse(command);
    }
  }

  /**
   * Convert parsed command to browser action
   */
  toBrowserAction(parsed: ParsedCommand): BrowserAction {
    const actionMap: Record<string, BrowserAction['type']> = {
      navigate: 'navigate',
      open: 'navigate',
      go: 'navigate',
      click: 'click',
      type: 'type',
      enter: 'type',
      extract: 'extract',
      scrape: 'extract',
      export: 'export',
      summarize: 'summarize',
      cite: 'cite',
      wait: 'wait',
      scroll: 'scroll',
    };

    const type = actionMap[parsed.action.toLowerCase()] || 'navigate';

    return {
      type,
      target: parsed.target,
      value: parsed.parameters?.value as string,
      selector: parsed.parameters?.selector as string,
      waitTime: parsed.parameters?.waitTime as number,
    };
  }

  /**
   * Execute a series of commands
   */
  async executeCommands(commands: string[]): Promise<BrowserAction[]> {
    const actions: BrowserAction[] = [];

    for (const cmd of commands) {
      const parsed = await this.parse(cmd);
      if (parsed && parsed.confidence > 0.5) {
        actions.push(this.toBrowserAction(parsed));
      }
    }

    return actions;
  }

  /**
   * Simple keyword-based parsing (fallback)
   */
  private simpleParse(command: string): ParsedCommand | null {
    const lower = command.toLowerCase();

    // Navigate
    if (lower.match(/(?:open|go to|navigate to|visit)\s+(.+)/)) {
      const match = command.match(/(?:open|go to|navigate to|visit)\s+(.+)/i);
      return {
        action: 'navigate',
        target: match?.[1] || '',
        confidence: 0.7,
      };
    }

    // Extract
    if (lower.match(/(?:extract|scrape|get)\s+(.+)/)) {
      const match = command.match(/(?:extract|scrape|get)\s+(.+)/i);
      return {
        action: 'extract',
        target: match?.[1] || '',
        confidence: 0.6,
      };
    }

    // Export
    if (lower.match(/(?:export|save)\s+(.+)/)) {
      const match = command.match(/(?:export|save)\s+(.+)/i);
      return {
        action: 'export',
        parameters: { format: match?.[1] || 'json' },
        confidence: 0.6,
      };
    }

    // Summarize
    if (lower.includes('summarize')) {
      return {
        action: 'summarize',
        confidence: 0.7,
      };
    }

    // Default: try as URL
    if (command.includes('.') && !command.includes(' ')) {
      return {
        action: 'navigate',
        target: command.startsWith('http') ? command : `https://${command}`,
        confidence: 0.5,
      };
    }

    return null;
  }
}

// Singleton instance
let omniScriptParserInstance: OmniScriptParser | null = null;

export function getOmniScriptParser(): OmniScriptParser {
  if (!omniScriptParserInstance) {
    omniScriptParserInstance = new OmniScriptParser();
  }
  return omniScriptParserInstance;
}

