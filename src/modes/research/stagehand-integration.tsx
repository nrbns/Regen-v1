/**
 * Stagehand Integration for Research Mode
 * Adds developer-friendly scripting API
 */

import { useEffect } from 'react';
import { useStagehand } from '../../hooks/useStagehand';

export function ResearchStagehandIntegration() {
  const { stagehand, execute, click, type, extract } = useStagehand({
    context: 'research',
  });

  useEffect(() => {
    // Expose Stagehand API to window for console access
    if (typeof window !== 'undefined') {
      (window as any).researchStagehand = {
        stagehand,
        execute,
        click,
        type,
        extract,
        // Research-specific helpers
        search: async (query: string) => {
          await click({ text: 'Search' });
          await type('input[type="search"]', query);
          await click('button[type="submit"]');
        },
        getSources: async () => {
          const sources = await extract('.source-list');
          return sources;
        },
      };
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).researchStagehand;
      }
    };
  }, [stagehand, execute, click, type, extract]);

  return null; // This is a side-effect component
}




