type EnsureModelOptions = {
  model?: string;
  onProgress?: (status: string) => void;
};

const DEFAULT_MODEL = 'phi3:mini-128k-q4';
const OLLAMA_ENDPOINT = 'http://127.0.0.1:11434';

/**
 * Checks if a lightweight local model is available. If missing, optionally prompts
 * the user to download a ~78 MB model and streams progress. Returns true if a model
 * is ready, false otherwise.
 */
export async function ensureAIModelAvailable(opts: EnsureModelOptions = {}): Promise<boolean> {
  const model = opts.model ?? DEFAULT_MODEL;
  const cacheKey = `regen:model-ready:${model}`;

  // Fast path: if we already marked it ready this session, skip checks
  if (typeof localStorage !== 'undefined' && localStorage.getItem(cacheKey) === '1') {
    return true;
  }

  const hasModel = await checkModel(model);
  if (hasModel) {
    localStorage?.setItem(cacheKey, '1');
    return true;
  }

  // Minimal prompt to avoid heavy UI dependencies
  const confirmed =
    typeof window !== 'undefined' ? window.confirm('Unlock AI locally (≈78 MB download)?') : false;

  if (!confirmed) {
    return false;
  }

  const pulled = await pullModel(model, status => opts.onProgress?.(status));
  if (pulled) {
    localStorage?.setItem(cacheKey, '1');
  }
  return pulled;
}

async function checkModel(model: string): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_ENDPOINT}/api/tags`);
    if (!res.ok) return false;
    const data = await res.json();
    const models = Array.isArray(data?.models) ? data.models : [];
    return models.some(
      (m: any) => typeof m?.name === 'string' && m.name.includes(model.split(':')[0])
    );
  } catch {
    return false;
  }
}

async function pullModel(model: string, onProgress?: (status: string) => void): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_ENDPOINT}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, stream: true }),
    });
    if (!res.ok || !res.body) return false;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const status = parsed?.status ?? parsed?.digest ?? '';
          if (status) onProgress?.(String(status));
        } catch {
          // ignore malformed
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}
