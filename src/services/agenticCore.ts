import { parseAgentActions } from './agenticActions';

export type AgentStreamOptions = {
  mode?: string;
  model?: string;
  context?: {
    activeTabUrl?: string;
    activeTabTitle?: string;
    tabCount?: number;
  };
  onToken?: (chunk: string) => void;
  onDone?: (full: string) => void;
  onActions?: (actions: string[]) => void;
  onError?: (error: unknown) => void;
};

/**
 * Stream an agentic task to a local Ollama instance.
 * Defaults to a tiny offline-friendly model (phi3:mini) to keep footprint low.
 */
export async function streamAgentTask(task: string, opts: AgentStreamOptions = {}): Promise<void> {
  const {
    mode = 'general',
    model = 'phi3:mini',
    context,
    onToken,
    onDone,
    onActions,
    onError,
  } = opts;

  const prompt = buildPrompt(task, mode, context);

  try {
    const response = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Agent request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n');
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const line = part.trim();
        if (!line) continue;
        try {
          const parsed = JSON.parse(line);
          const content: string =
            parsed?.message?.content ??
            parsed?.response ??
            '';
          if (content) {
            full += content;
            onToken?.(content);
          }
        } catch {
          // Ignore malformed chunks
        }
      }
    }

    if (full) {
      const actions = parseAgentActions(full);
      if (actions.length > 0) {
        onActions?.(actions);
      }
      onDone?.(full);
    }
  } catch (error) {
    onError?.(error);
  }
}

function buildPrompt(
  task: string,
  mode: string,
  context?: AgentStreamOptions['context']
): string {
  const contextParts: string[] = [];
  if (context?.activeTabUrl) {
    contextParts.push(`Current page: ${context.activeTabTitle || 'Untitled'} (${context.activeTabUrl})`);
  }
  if (context?.tabCount !== undefined) {
    contextParts.push(`Open tabs: ${context.tabCount}`);
  }

  const contextStr = contextParts.length > 0 ? `\n\nContext:\n${contextParts.join('\n')}\n` : '';

  return [
    'You are Regen, an agentic browser AI assistant.',
    `Current mode: ${mode}.`,
    contextStr,
    'User request:',
    task,
    '',
    'Available actions (use bracketed tags):',
    '- [OPEN <url>] - Open a URL in a new tab',
    '- [SCRAPE <url>] - Scrape and analyze a webpage',
    '- [SUMMARIZE] or [SUMMARIZE <url>] - Summarize current page or specific URL',
    '- [SEARCH <query>] - Perform a web search',
    '- [TRADE BUY <symbol> <quantity>] - Simulate buying stocks (e.g., [TRADE BUY NIFTY 10])',
    '- [TRADE SELL <symbol> <quantity>] - Simulate selling stocks',
    '- [SWITCH_MODE <mode>] - Switch to Browse/Research/Trade mode',
    '- [CLOSE_TAB] - Close current tab',
    '',
    'Respond naturally, then emit actions as needed.',
    'Example: "I\'ll search for that. [SEARCH quantum computing] Then I\'ll open the top result. [OPEN https://example.com]"',
  ].join('\n');
}

