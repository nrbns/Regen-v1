/**
 * Hugging Face Hook - React integration for local HF models
 */

import { useState, useEffect, useCallback } from 'react';
import { getLocalHFServer } from './localHFServer';

export function useHuggingFace() {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        await getLocalHFServer().initialize();
        setInitialized(true);
        console.log('[HF Hook] Initialized successfully');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize HF');
        console.error('[HF Hook] Initialization failed:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const generateEmbeddings = useCallback(
    async (texts: string[]): Promise<number[][] | null> => {
      if (!initialized) {
        setError('HF server not initialized');
        return null;
      }

      try {
        setLoading(true);
        const embeddings = await getLocalHFServer().generateEmbeddings(texts);
        return embeddings;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Embedding generation failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [initialized]
  );

  const generateText = useCallback(
    async (
      prompt: string,
      options?: { maxLength?: number; temperature?: number }
    ): Promise<string | null> => {
      if (!initialized) {
        setError('HF server not initialized');
        return null;
      }

      try {
        setLoading(true);
        const text = await getLocalHFServer().generateText(prompt, options);
        return text;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Text generation failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [initialized]
  );

  const summarize = useCallback(
    async (text: string, options?: { maxLength?: number }): Promise<string | null> => {
      if (!initialized) {
        setError('HF server not initialized');
        return null;
      }

      try {
        setLoading(true);
        const summary = await getLocalHFServer().summarize(text, options);
        return summary;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Summarization failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [initialized]
  );

  const translate = useCallback(
    async (text: string, options?: { from?: string; to?: string }): Promise<string | null> => {
      if (!initialized) {
        setError('HF server not initialized');
        return null;
      }

      try {
        setLoading(true);
        const translated = await getLocalHFServer().translate(text, options);
        return translated;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Translation failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [initialized]
  );

  const classify = useCallback(
    async (text: string): Promise<{ label: string; score: number }[] | null> => {
      if (!initialized) {
        setError('HF server not initialized');
        return null;
      }

      try {
        setLoading(true);
        const result = await getLocalHFServer().classify(text);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Classification failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [initialized]
  );

  const getStatus = useCallback(() => {
    return getLocalHFServer().getStatus();
  }, []);

  return {
    initialized,
    loading,
    error,
    generateEmbeddings,
    generateText,
    summarize,
    translate,
    classify,
    getStatus,
  };
}
