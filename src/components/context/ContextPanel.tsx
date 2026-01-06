import React, { useEffect, useState } from 'react';
import { contextEngine } from '../../core/contextEngine';
import { Clock, ExternalLink } from 'lucide-react';

export function ContextPanel({ limit = 10 }: { limit?: number }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await contextEngine.getContexts(limit);
      // Show most recent first
      setItems(list.slice().reverse());
    } catch (err) {
      console.error('[ContextPanel] Failed to load contexts', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (q?: string) => {
    const term = (q ?? query).trim();
    if (!term) {
      setSearchResults(null);
      return await load();
    }

    setSearchLoading(true);
    try {
      // Try MeiliSearch first (best-effort)
      try {
        const m = await import('../../services/meiliIndexer');
        if (typeof m.searchContexts === 'function') {
          const res = await m.searchContexts(term, { limit: 50 });
          setSearchResults(res.hits || []);
          return;
        }
      } catch (e) {
        // ignore and fallback to local
      }

      // Fallback: local filtering
      const local = await contextEngine.getContexts(500);
      const filtered = local.filter(c =>
        (c.url || '').toLowerCase().includes(term.toLowerCase()) ||
        ((c.title || '') as string).toLowerCase().includes(term.toLowerCase())
      );
      setSearchResults(filtered.slice().reverse());
    } catch (err) {
      console.error('[ContextPanel] Search failed, falling back to local', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Basic polling to keep the list reasonably fresh
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [limit]);

  const handleClear = async () => {
    await contextEngine.clear();
    setItems([]);
  };

  return (
    <div className="border-t border-gray-700 bg-gray-800 p-3 text-sm text-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-300" />
          <span className="font-medium">Recent Navigation Contexts</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder="Search contexts..."
              className="rounded bg-gray-700 px-2 py-1 text-xs text-white placeholder:text-gray-400"
              aria-label="Search contexts"
            />
            <button
              onClick={() => void handleSearch()}
              className="rounded bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600"
            >
              Search
            </button>
          </div>

          <button
            onClick={load}
            className="rounded bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600"
          >
            Refresh
          </button>
          <button
            onClick={handleClear}
            className="rounded bg-red-700 px-2 py-1 text-xs hover:bg-red-600"
            title="Clear stored contexts"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="mt-3 max-h-40 overflow-y-auto">
        {searchLoading && <div className="text-xs text-gray-400">Searching...</div>}

        {/* If a search is active, render search results */}
        {!searchLoading && searchResults !== null && searchResults.length === 0 && (
          <div className="text-xs text-gray-500">No results found</div>
        )}
        {!searchLoading && searchResults !== null && searchResults.map(item => (
          <div key={item.id} className="flex items-center justify-between gap-2 py-1">
            <div className="flex-1">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs text-white hover:underline"
              >
                {item.title || item.url}
              </a>
              <div className="text-xs text-gray-400">{new Date(item.timestamp).toLocaleString()}</div>
            </div>
            <div className="flex-shrink-0 pl-2">
              <a href={item.url} target="_blank" rel="noreferrer noopener" title="Open in new tab" className="text-gray-300">
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        ))}

        {/* No search active: render default list */}
        {!searchLoading && searchResults === null && loading && <div className="text-xs text-gray-400">Loading...</div>}
        {!searchLoading && searchResults === null && !loading && items.length === 0 && (
          <div className="text-xs text-gray-500">No contexts recorded yet</div>
        )}
        {!searchLoading && searchResults === null && !loading && items.map(item => (
          <div key={item.id} className="flex items-center justify-between gap-2 py-1">
            <div className="flex-1">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs text-white hover:underline"
              >
                {item.title || item.url}
              </a>
              <div className="text-xs text-gray-400">{new Date(item.timestamp).toLocaleString()}</div>
            </div>
            <div className="flex-shrink-0 pl-2">
              <a href={item.url} target="_blank" rel="noreferrer noopener" title="Open in new tab" className="text-gray-300">
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ContextPanel;
