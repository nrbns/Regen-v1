/**
 * Realtime Source Updater - v0.4 Research Mode Fix
 * Updates research sources in realtime via WebSocket or polling
 * Especially useful for dynamic content (NSE prices, news feeds, etc.)
 */

import type { ResearchSource } from '../types/research';

export interface SourceUpdate {
  sourceId: string;
  url: string;
  updates: {
    title?: string;
    snippet?: string;
    content?: string;
    timestamp: number;
  };
}

/**
 * Subscribe to realtime source updates
 */
export function subscribeToSourceUpdates(
  sources: ResearchSource[],
  onUpdate: (update: SourceUpdate) => void
): () => void {
  // Check if WebSocket is available
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:4000';
  let ws: WebSocket | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;

  const connect = () => {
    try {
      ws = new WebSocket(`${wsUrl}/sources/realtime`);

      ws.onopen = () => {
        console.log('[RealtimeSources] Connected');
        // Subscribe to source URLs
        const urls = sources.map(s => s.url).filter(Boolean);
        ws?.send(JSON.stringify({ type: 'subscribe', urls }));
      };

      ws.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'source:update') {
            onUpdate(data.update as SourceUpdate);
          }
        } catch (error) {
          console.warn('[RealtimeSources] Failed to parse message:', error);
        }
      };

      ws.onerror = error => {
        console.warn('[RealtimeSources] WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('[RealtimeSources] Disconnected, reconnecting...');
        reconnectTimeout = setTimeout(connect, 3000);
      };
    } catch (error) {
      console.warn('[RealtimeSources] Failed to connect:', error);
      // Fallback to polling
      startPolling(sources, onUpdate);
    }
  };

  // Fallback polling for sources that change frequently
  const startPolling = (
    sourcesToPoll: ResearchSource[],
    callback: (update: SourceUpdate) => void
  ) => {
    const pollInterval = setInterval(async () => {
      // Only poll dynamic sources (news, prices, etc.)
      const dynamicSources = sourcesToPoll.filter(
        s => s.url?.includes('nse') || s.url?.includes('news') || s.metadata?.dynamic
      );

      for (const source of dynamicSources) {
        try {
          // Quick HEAD request to check for updates
          const response = await fetch(source.url!, { method: 'HEAD', cache: 'no-cache' });
          const lastModified = response.headers.get('last-modified');

          if (lastModified) {
            const lastModifiedTime = new Date(lastModified).getTime();
            const sourceTime = source.timestamp || 0;

            if (lastModifiedTime > sourceTime) {
              // Source updated - fetch new content (async, don't block)
              const sourceUrl = source.url;
              if (!sourceUrl) return;

              import('./liveTabScraper')
                .then(({ scrapeUrl }) => scrapeUrl(sourceUrl))
                .then(updated => {
                  if (updated) {
                    callback({
                      sourceId: source.id || sourceUrl,
                      url: sourceUrl,
                      updates: {
                        title: updated.title,
                        snippet: updated.text?.substring(0, 300),
                        content: updated.text,
                        timestamp: updated.timestamp,
                      },
                    });
                  }
                })
                .catch(() => {
                  // Ignore scrape errors
                });
            }
          }
        } catch {
          // Ignore polling errors
        }
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  };

  // Try WebSocket first, fallback to polling
  connect();

  // Return cleanup function
  return () => {
    if (ws) {
      ws.close();
      ws = null;
    }
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
  };
}

/**
 * Update a source in realtime
 */
export function updateSource(sources: ResearchSource[], update: SourceUpdate): ResearchSource[] {
  return sources.map(source => {
    if (source.id === update.sourceId || source.url === update.url) {
      return {
        ...source,
        title: update.updates.title || source.title,
        snippet: update.updates.snippet || source.snippet,
        text: update.updates.content || source.text,
        timestamp: update.updates.timestamp,
        metadata: {
          ...source.metadata,
          lastUpdated: Date.now(),
          realtime: true,
        },
      };
    }
    return source;
  });
}
