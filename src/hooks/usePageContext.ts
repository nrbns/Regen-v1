/**
 * usePageContext Hook
 * Gets page context for AI features
 */

import { useState, useEffect } from 'react';
import { useTabsStore } from '../state/tabsStore';

export interface PageContext {
  url: string;
  title: string;
  content: string;
  selectedText?: string;
}

export function usePageContext(): PageContext | null {
  const activeTab = useTabsStore(state => state.activeId);
  const tabs = useTabsStore(state => state.tabs);
  const [context, setContext] = useState<PageContext | null>(null);

  useEffect(() => {
    if (!activeTab) {
      setContext(null);
      return;
    }

    const tab = tabs.find(t => t.id === activeTab);
    if (!tab) {
      setContext(null);
      return;
    }

    // Get page context from active tab iframe or window
    const getPageContext = async () => {
      try {
        // Try to get from iframe
        const iframe = document.querySelector(
          'iframe[data-tab-id="' + tab.id + '"]'
        ) as HTMLIFrameElement;

        if (iframe?.contentWindow?.document) {
          const doc = iframe.contentWindow.document;
          const title = doc.title || '';
          const content = doc.body?.innerText || doc.body?.textContent || '';

          setContext({
            url: tab.url || window.location.href,
            title,
            content: content.substring(0, 5000), // Limit content size
          });
          return;
        }

        // Fallback to current window
        setContext({
          url: tab.url || window.location.href,
          title: document.title || '',
          content:
            document.body?.innerText?.substring(0, 5000) ||
            document.body?.textContent?.substring(0, 5000) ||
            '',
        });
      } catch {
        // Cross-origin restrictions, use tab data only
        setContext({
          url: tab.url || window.location.href,
          title: tab.title || '',
          content: '',
        });
      }
    };

    getPageContext();
  }, [activeTab, tabs]);

  return context;
}
