import { invoke } from '@tauri-apps/api/core';

/**
 * Auto-start Ollama service on first app run
 */
export async function initializeOllama(): Promise<{ available: boolean; error?: string }> {
  try {
    // Check if already running
    const existing = await checkOllamaAvailable();
    if (existing.available) {
      console.log('[OllamaCheck] Ollama already running');
      return { available: true };
    }

    // Try to invoke backend initialization
    try {
      await invoke('initialize_backend');
      console.log('[OllamaCheck] Backend initialization triggered');

      // Wait for Ollama to start
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const result = await checkOllamaAvailable();
        if (result.available) {
          console.log('[OllamaCheck] Ollama started successfully after', i, 'seconds');
          return { available: true };
        }
      }

      return {
        available: false,
        error: 'Ollama failed to start within timeout',
      };
    } catch (tauri_error) {
      console.warn('[OllamaCheck] Backend invoke not available (web mode):', tauri_error);
      return {
        available: false,
        error: 'Ollama not running. Installation required from https://ollama.com',
      };
    }
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Failed to initialize Ollama',
    };
  }
}

/**
 * Check if Ollama is available and running
 */
export async function checkOllamaAvailable(): Promise<{ available: boolean; error?: string }> {
  const baseUrl =
    import.meta.env.VITE_OLLAMA_BASE_URL ||
    import.meta.env.OLLAMA_BASE_URL ||
    'http://127.0.0.1:11434';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { available: true };
    }

    return {
      available: false,
      error: `Ollama returned status ${response.status}`,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        available: false,
        error: 'Ollama connection timeout. Is Ollama running?',
      };
    }

    return {
      available: false,
      error:
        error instanceof Error
          ? error.message
          : 'Ollama is not available. Please install and start Ollama from https://ollama.com',
    };
  }
}

/**
 * Get user-friendly error message for Ollama issues
 */
export function getOllamaErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('404') || error.message.includes('not found')) {
      return 'Ollama model not found. Run: ollama pull phi3:mini';
    }
    if (error.message.includes('ECONNREFUSED') || error.message.includes('connection')) {
      return 'Ollama is not running. Please install and start Ollama from https://ollama.com';
    }
    return error.message;
  }
  return 'Ollama error occurred. Please check if Ollama is installed and running.';
}
