/**
 * Agent Summarize Handler - Listens for "summarize this page" actions in Browse mode
 * and triggers summarization of the current active tab
 */

import { useEffect } from 'react';
import { useTabsStore } from '../../state/tabsStore';
import { useAppStore } from '../../state/appStore';
import { toast } from '../../utils/toast';
import { scrapeResearchSources } from '../../services/researchScraper';
import { summarizeOffline } from '../../services/offlineSummarizer';

export function AgentSummarizeHandler() {
  const { activeId, tabs } = useTabsStore();
  const currentMode = useAppStore(state => state.mode);

  useEffect(() => {
    if (currentMode !== 'Browse') return;

    const handleSummarize = async (event: CustomEvent<{ url?: string | null }>) => {
      const targetUrl = event.detail.url;
      const activeTab = tabs.find(t => t.id === activeId);
      const urlToSummarize =
        targetUrl || (activeTab?.url && activeTab.url.startsWith('http') ? activeTab.url : null);

      if (!urlToSummarize) {
        toast.warning('No page to summarize');
        return;
      }

      toast.info('Summarizing page…');
      try {
        const [scraped] = await scrapeResearchSources([urlToSummarize]);
        if (scraped?.content) {
          const summary = await summarizeOffline(scraped.content);

          // Switch to Research mode and show summary
          useAppStore.getState().setMode('Research');

          // Dispatch event to Research mode to display the summary
          window.dispatchEvent(
            new CustomEvent('agent:research-summarize', {
              detail: { url: urlToSummarize, summary: summary.summary, title: scraped.title },
            })
          );

          toast.success('Page summarized - switched to Research mode');
        } else {
          toast.error('Failed to scrape page content');
        }
      } catch (error) {
        console.warn('[AgentSummarizeHandler] Summarize failed:', error);
        toast.error('Failed to summarize page');
      }
    };

    window.addEventListener(
      'agent:research-summarize',
      handleSummarize as unknown as EventListener
    );
    return () => {
      window.removeEventListener(
        'agent:research-summarize',
        handleSummarize as unknown as EventListener
      );
    };
  }, [activeId, tabs, currentMode]);

  return null; // This component doesn't render anything
}
