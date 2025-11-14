import { useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '../state/settingsStore';
import { normalizeInputToUrlOrSearch, buildSearchUrl } from '../lib/search';
import { openWithAccount } from './AccountBadge';
import VoiceButton from './VoiceButton';
import { requestRedix } from '../services/redixClient';
import { useDebounce } from '../utils/useDebounce';
import { trackSearch } from '../core/supermemory/tracker';

export default function OmniSearch() {
  const [q, setQ] = useState('');
  const [liveResults, setLiveResults] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const engine = useSettingsStore(s => s.searchEngine);
  const debouncedQuery = useDebounce(q, 350);
  const controllerRef = useRef<{ id: string; cancel: () => void } | null>(null);
  const sessionIdRef = useRef<string>(`redix-${crypto.randomUUID()}`);

  useEffect(() => {
    const query = debouncedQuery.trim();
    if (!query || query.length < 2) {
      controllerRef.current?.cancel?.();
      controllerRef.current = null;
      setLiveResults([]);
      setIsStreaming(false);
      setErrorMsg(null);
      return;
    }

    controllerRef.current?.cancel?.();
    setIsStreaming(true);
    setErrorMsg(null);
    setLiveResults([]);

    controllerRef.current = requestRedix(query, {
      sessionId: sessionIdRef.current,
      onPartial: (message) => {
        const items = Array.isArray(message.payload?.items)
          ? (message.payload.items as any[])
          : [];
        if (items.length > 0) {
          setLiveResults((prev) => {
            const merged = [...prev];
            for (const item of items) {
              if (!merged.find((existing) => existing.title === item.title && existing.url === item.url)) {
                merged.push(item);
              }
            }
            return merged;
          });
        }
      },
      onFinal: (message) => {
        setIsStreaming(false);
        const items = Array.isArray(message.payload?.items)
          ? (message.payload.items as any[])
          : [];
        if (items.length > 0) {
          setLiveResults(items);
        }
      },
      onError: (message) => {
        setIsStreaming(false);
        setErrorMsg(message.payload?.message ?? 'Redix unavailable');
      },
    });

    return () => {
      controllerRef.current?.cancel?.();
      controllerRef.current = null;
    };
  }, [debouncedQuery]);

  const getAccountId = () => {
    const select = document.querySelector('select.bg-neutral-800.rounded.px-2.py-1.text-xs') as HTMLSelectElement | null;
    return select?.value || 'default';
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    
    // Track search in SuperMemory
    trackSearch(query, { mode: engine }).catch(console.error);
    
    try {
      // Prefer creating in selected account profile for isolation
      const accountId = getAccountId();
      
      if (engine === 'all') {
        const providers: any[] = ['google','bing','duckduckgo','yahoo'];
        for (const p of providers) {
          const url = buildSearchUrl(p as any, query);
          await openWithAccount(url, accountId);
        }
      } else {
        const target = normalizeInputToUrlOrSearch(query, engine as any) as string;
        if (target) {
          await openWithAccount(target, accountId);
        }
      }
      
      // Clear input after successful submission
      setQ('');
    } catch (error) {
      console.error('[OmniSearch] Failed to open URL:', error);
      // Keep the query in the input so user can retry
    }
  };
  return (
    <div className="w-full">
      <form onSubmit={onSubmit} className="flex-1 flex items-center" role="search" aria-label="Omnibox search">
      <input
        type="text"
        className="w-full bg-neutral-800 rounded px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-500"
        placeholder="Type a URL or query"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            const host = q.trim();
            if (!host) return;
            try {
              const hasScheme = /^https?:\/\//i.test(host);
              const hasTld = /\.[a-z]{2,}$/i.test(host);
              const url = (hasScheme || hasTld) ? host : `https://${host}.com`;
              const accountId = getAccountId();
              await openWithAccount(url, accountId);
              setQ(''); // Clear input after successful submission
            } catch (error) {
              console.error('[OmniSearch] Failed to open URL:', error);
            }
          }
        }}
        aria-label="Search or enter URL"
        aria-describedby="search-hint"
      />
      <span id="search-hint" className="sr-only">Press Ctrl+Enter or Cmd+Enter to open in new tab</span>
      <VoiceButton onResult={async (text)=>{ 
        setQ(text); 
        // Trigger form submission after setting query
        setTimeout(async () => {
          const form = document.querySelector('form[role="search"]') as HTMLFormElement;
          if (form) {
            const event = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(event);
            await onSubmit(event as any);
          }
        }, 100);
      }} small />
      </form>
      <div className="mt-2 space-y-2">
      {isStreaming && (
        <div className="text-xs text-emerald-300 animate-pulse">
          Streaming results from Redix…
        </div>
      )}
      {errorMsg && (
        <div className="text-xs text-red-400">
          {errorMsg}
        </div>
      )}
      {liveResults.length > 0 && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/80 p-3 text-sm text-neutral-200 max-h-[400px] overflow-y-auto">
          <div className="mb-2 text-xs uppercase tracking-wide text-neutral-400">
            Redix Suggestions
          </div>
          <ul className="space-y-2">
            {liveResults.slice(0, 8).map((item, index) => (
              <li key={`${item.url ?? item.title}-${index}`} className="break-words">
                <button
                  type="button"
                  className="w-full text-left text-emerald-300 hover:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded px-2 py-1 -mx-2 -my-1"
                  onClick={() => {
                    if (item.url) {
                      openWithAccount(item.url, getAccountId()).catch((error) => {
                        console.error('[OmniSearch] Failed to open suggestion URL:', error);
                      });
                    } else if (item.title) {
                      setQ(item.title);
                    }
                  }}
                >
                  <div className="font-medium line-clamp-1">{item.title}</div>
                  {item.snippet && (
                    <div className="text-xs text-neutral-400 mt-0.5 line-clamp-2">
                      {item.snippet}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      </div>
    </div>
  );
}


