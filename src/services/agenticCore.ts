import { parseAgentActions } from './agenticActions';

export type AgentStreamOptions = {
  mode?: string;
  model?: string;
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
    onToken,
    onDone,
    onActions,
    onError,
  } = opts;

  const prompt = buildPrompt(task, mode);

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
        } catch (_e) {
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

function buildPrompt(task: string, mode: string): string {
  return [
    'You are Regen, an agentic browser AI.',
    `Mode: ${mode}.`,
    'Task:',
    task,
    '',
    'Respond concisely.',
    'If actions are needed, emit bracketed tags like:',
    '[SCRAPE https://example.com], [SUMMARIZE], [TRADE BUY NIFTY 10], [OPEN https://...]',
  ].join(' ');
}

