/**
 * Agent Action Handlers - Listens for all agent actions and routes them appropriately
 */

import { useEffect } from 'react';
import { useTabsStore } from '../../state/tabsStore';
import { useAppStore } from '../../state/appStore';
import { toast } from '../../utils/toast';
// import { ipc } from '../../lib/ipc-typed'; // Reserved for future use
import { scrapeResearchSources } from '../../services/researchScraper';
import { summarizeOffline } from '../../services/offlineSummarizer';
// import { performLiveWebSearch } from '../../services/liveWebSearch'; // Reserved for future use

export function AgentActionHandlers() {
  const { activeId, tabs } = useTabsStore();
  const currentMode = useAppStore(state => state.mode);
  const setMode = useAppStore(state => state.setMode);

  useEffect(() => {
    // Handle search action
    const handleSearch = async (event: CustomEvent<{ query?: string }>) => {
      const query = event.detail.query;
      if (!query) return;

      toast.info(`Searching: ${query}`);
      try {
        // Switch to Research mode for search results
        if (currentMode !== 'Research') {
          setMode('Research');
        }
        // Trigger search in Research mode
        window.dispatchEvent(
          new CustomEvent('research:trigger', {
            detail: { query },
          })
        );
      } catch (error) {
        console.warn('[AgentActionHandlers] Search failed:', error);
        toast.error('Search failed');
      }
    };

    // Handle mode switch
    const handleSwitchMode = (event: CustomEvent<{ mode?: string }>) => {
      const mode = event.detail.mode;
      if (!mode) return;

      const validModes = ['browse', 'research', 'trade', 'docs'];
      const normalizedMode = mode.toLowerCase();
      if (validModes.includes(normalizedMode)) {
        const modeCapitalized = normalizedMode.charAt(0).toUpperCase() + normalizedMode.slice(1);
        setMode(modeCapitalized as 'Browse' | 'Research' | 'Trade' | 'Docs');
        toast.success(`Switched to ${modeCapitalized} mode`);
      } else {
        toast.warning(`Invalid mode: ${mode}. Valid modes: ${validModes.join(', ')}`);
      }
    };

    // Handle tab closed notification
    const handleTabClosed = (event: CustomEvent<{ tabId?: string }>) => {
      const tabId = event.detail.tabId;
      if (tabId) {
        toast.info('Tab closed');
      }
    };

    // Handle summarize (delegates to AgentSummarizeHandler for Browse mode)
    const handleSummarize = async (event: CustomEvent<{ url?: string | null }>) => {
      // Only handle if not in Browse mode (Browse mode has its own handler)
      if (currentMode === 'Browse') return;

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

          // Switch to Research mode if not already there
          if (currentMode !== 'Research') {
            setMode('Research');
          }

          // Dispatch event to Research mode to display the summary
          window.dispatchEvent(
            new CustomEvent('agent:research-summarize', {
              detail: { url: urlToSummarize, summary: summary.summary, title: scraped.title },
            })
          );

          toast.success('Page summarized');
        } else {
          toast.error('Failed to scrape page content');
        }
      } catch (error) {
        console.warn('[AgentActionHandlers] Summarize failed:', error);
        toast.error('Failed to summarize page');
      }
    };

    window.addEventListener('agent:search', handleSearch as unknown as EventListener);
    window.addEventListener('agent:switch-mode', handleSwitchMode as unknown as EventListener);
    window.addEventListener('agent:tab-closed', handleTabClosed as unknown as EventListener);
    window.addEventListener(
      'agent:research-summarize',
      handleSummarize as unknown as EventListener
    );

    return () => {
      window.removeEventListener('agent:search', handleSearch as unknown as EventListener);
      window.removeEventListener('agent:switch-mode', handleSwitchMode as unknown as EventListener);
      window.removeEventListener('agent:tab-closed', handleTabClosed as unknown as EventListener);
      window.removeEventListener(
        'agent:research-summarize',
        handleSummarize as unknown as EventListener
      );
    };
  }, [activeId, tabs, currentMode, setMode]);

  return null; // This component doesn't render anything
}
