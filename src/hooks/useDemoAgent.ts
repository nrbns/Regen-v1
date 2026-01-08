/**
 * Hook for running the demo agent to showcase real-time streaming
 */
import { useCallback, useState } from 'react';

export function useDemoAgent() {
  const [loading, setLoading] = useState(false);

  const runDemo = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    try {
      // Only run on Electron renderer
      if (typeof window !== 'undefined' && window.regen) {
        await window.regen.runDemoAgent();
      } else {
        console.warn('Demo agent only available in Electron environment');
      }
    } catch (error) {
      console.error('Failed to run demo agent:', error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  return {
    runDemo,
    loading,
  };
}
