/**
 * Intent Parser - Converts natural language commands into structured actions
 * PR: Agent system core component
 */

import { queryLLM } from '../LLMRouter';
import type { PageSnapshot } from './domAnalyzer';

export interface ParsedAction {
  kind: 'click' | 'type' | 'scroll' | 'navigate' | 'extract' | 'wait' | 'screenshot';
  selector?: string;
  text?: string;
  url?: string;
  value?: string;
  description: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface ParsedIntent {
  intent: string;
  actions: ParsedAction[];
  confidence: number;
  raw: string;
}

/**
 * Parse natural language command into structured actions
 */
export async function parseIntent(
  command: string,
  snapshot: PageSnapshot
): Promise<ParsedIntent> {
  const prompt = buildIntentPrompt(command, snapshot);

  try {
    const response = await queryLLM({
      prompt,
      model: 'phi3:mini', // Use local model if available
      temperature: 0.2, // Lower temperature for deterministic parsing
      maxTokens: 2000,
    });

    const parsed = parseLLMResponse(response.text, command);
    return parsed;
  } catch (error) {
    console.error('[IntentParser] Failed to parse intent:', error);
    // Fallback to simple heuristic parsing
    return fallbackParse(command, snapshot);
  }
}

/**
 * Build prompt for LLM intent parsing
 */
function buildIntentPrompt(command: string, snapshot: PageSnapshot): string {
  const availableElements = snapshot.elements
    .filter(e => e.interactive && e.visible)
    .slice(0, 20) // Limit to first 20 interactive elements
    .map(e => ({
      tag: e.tag,
      text: e.text?.slice(0, 50),
      selector: e.selector,
    }));

  return `You are an AI assistant that converts natural language commands into structured browser actions.

Command: "${command}"

Available page elements (first 20 interactive):
${JSON.stringify(availableElements, null, 2)}

Page context:
- URL: ${snapshot.url}
- Title: ${snapshot.title}
- Forms: ${snapshot.metadata.formCount}
- Links: ${snapshot.metadata.linkCount}

Parse the command into a JSON array of actions. Each action should have:
- kind: "click" | "type" | "scroll" | "navigate" | "extract" | "wait"
- selector: CSS selector (if applicable)
- text: Text to type or extract (if applicable)
- url: URL to navigate to (if applicable)
- description: Human-readable description
- confidence: 0.0-1.0

Examples:
- "Click the login button" → [{"kind":"click","selector":"button[type='submit']","description":"Click login button","confidence":0.9}]
- "Type 'hello' in the search box" → [{"kind":"type","selector":"input[type='text']","text":"hello","description":"Type hello in search","confidence":0.85}]
- "Go to example.com" → [{"kind":"navigate","url":"https://example.com","description":"Navigate to example.com","confidence":0.95}]

Return ONLY valid JSON array, no markdown, no explanation.`;
}

/**
 * Parse LLM response into structured actions
 */
function parseLLMResponse(response: string, originalCommand: string): ParsedIntent {
  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = response.trim();

  // Remove markdown code blocks
  if (jsonStr.includes('```')) {
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      jsonStr = match[1].trim();
    }
  }

  // Try to parse as JSON
  let actions: ParsedAction[] = [];
  let confidence = 0.7;

  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      actions = parsed.map(validateAction);
    } else if (parsed.actions && Array.isArray(parsed.actions)) {
      actions = parsed.actions.map(validateAction);
      confidence = parsed.confidence || 0.7;
    } else {
      // Single action object
      actions = [validateAction(parsed)];
    }
  } catch (e) {
    console.warn('[IntentParser] Failed to parse JSON, using fallback:', e);
    return fallbackParse(originalCommand, { elements: [] } as unknown as PageSnapshot);
  }

  // Calculate overall confidence
  if (actions.length > 0) {
    confidence = actions.reduce((sum, a) => sum + a.confidence, 0) / actions.length;
  }

  return {
    intent: originalCommand,
    actions,
    confidence,
    raw: response,
  };
}

/**
 * Validate and normalize action
 */
function validateAction(action: any): ParsedAction {
  const validKinds = ['click', 'type', 'scroll', 'navigate', 'extract', 'wait', 'screenshot'];
  const kind = validKinds.includes(action.kind) ? action.kind : 'click';

  return {
    kind,
    selector: action.selector || undefined,
    text: action.text || action.value || undefined,
    url: action.url || undefined,
    value: action.value || action.text || undefined,
    description: action.description || `Perform ${kind} action`,
    confidence: Math.max(0, Math.min(1, action.confidence || 0.5)),
    metadata: action.metadata || {},
  };
}

/**
 * Fallback parsing using simple heuristics
 */
function fallbackParse(command: string, snapshot: PageSnapshot): ParsedIntent {
  const lower = command.toLowerCase();
  const actions: ParsedAction[] = [];

  // Navigate
  if (lower.includes('go to') || lower.includes('navigate') || lower.includes('open')) {
    const urlMatch = command.match(/(?:https?:\/\/)?([^\s]+\.(com|org|net|io|dev))/i);
    if (urlMatch) {
      actions.push({
        kind: 'navigate',
        url: urlMatch[0].startsWith('http') ? urlMatch[0] : `https://${urlMatch[0]}`,
        description: `Navigate to ${urlMatch[0]}`,
        confidence: 0.6,
      });
    }
  }

  // Click
  if (lower.includes('click')) {
    const buttonText = command.match(/click\s+(?:the\s+)?(.+?)(?:\s+button)?$/i)?.[1];
    if (buttonText) {
      const element = snapshot.elements.find(
        e => e.text?.toLowerCase().includes(buttonText.toLowerCase()) && e.interactive
      );
      if (element) {
        actions.push({
          kind: 'click',
          selector: element.selector,
          description: `Click ${buttonText}`,
          confidence: 0.5,
        });
      }
    }
  }

  // Type
  if (lower.includes('type')) {
    const textMatch = command.match(/type\s+['"](.+?)['"]/);
    if (textMatch) {
      const input = snapshot.elements.find(e => e.tag === 'input' && e.visible);
      if (input) {
        actions.push({
          kind: 'type',
          selector: input.selector,
          text: textMatch[1],
          description: `Type "${textMatch[1]}"`,
          confidence: 0.5,
        });
      }
    }
  }

  return {
    intent: command,
    actions: actions.length > 0 ? actions : [{
      kind: 'click',
      description: `Could not parse: ${command}`,
      confidence: 0.1,
    }],
    confidence: actions.length > 0 ? 0.5 : 0.1,
    raw: 'fallback',
  };
}
