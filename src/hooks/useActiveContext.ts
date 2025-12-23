/**
 * Hook to track active context for ContextStrip
 *
 * Gathers active intent, tabs, documents, and memory scope from various sources.
 */

import { useEffect, useState } from 'react';
import { useAppStore } from '../state/appStore';
import { useTabsStore } from '../state/tabsStore';

export interface ActiveContext {
  activeIntent?: string;
  activeTabIds: string[];
  activeDocuments: string[];
  memoryScope?: string;
}

/**
 * Hook to get active context from Research mode query
 */
export function useResearchContext() {
  const [query, setQuery] = useState<string>('');

  useEffect(() => {
    // Listen for research query changes
    const handleQueryChange = (event: CustomEvent) => {
      const newQuery = event.detail?.query || '';
      if (newQuery) {
        setQuery(newQuery);
      }
    };

    window.addEventListener('research:query', handleQueryChange as EventListener);
    return () => window.removeEventListener('research:query', handleQueryChange as EventListener);
  }, []);

  return query;
}

/**
 * Main hook to get all active context
 */
export function useActiveContext(): ActiveContext {
  const { mode } = useAppStore();
  const { activeId } = useTabsStore();
  const researchQuery = useResearchContext();

  const activeIntent =
    mode === 'Research' && researchQuery
      ? researchQuery
      : mode === 'Trade'
        ? undefined // Trade mode intent comes from trade-specific state
        : undefined;

  const activeTabIds = activeId ? [activeId] : [];

  // TODO: Extract active documents from document mode state
  const activeDocuments: string[] = [];

  // TODO: Extract memory scope from memory/supermemory store
  const memoryScope = undefined;

  return {
    activeIntent,
    activeTabIds,
    activeDocuments,
    memoryScope,
  };
}
