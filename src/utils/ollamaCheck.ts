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
