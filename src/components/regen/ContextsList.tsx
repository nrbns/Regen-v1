import React, { useEffect, useState } from 'react';
import { contextEngine } from '../../core/contextEngine';

export function ContextsList({ limit = 50, query = '' }: { limit?: number; query?: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await contextEngine.getContexts(limit);
      setItems(list.slice().reverse());
    } catch (err) {
      console.error('[ContextsList] Failed to load contexts', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const doSearch = async (q: string) => {
    const term = q?.trim();
    if (!term) return await load();

    setSearchLoading(true);
    try {
      try {
        const m = await import('../../services/meiliIndexer');
        if (typeof m.searchContexts === 'function') {
          const res = await m.searchContexts(term, { limit });
          setItems((res.hits || []).slice().reverse());
          return;
        }
      } catch (err) {
        // ignore and fallback
      }

      const local = await contextEngine.getContexts(500);
      const filtered = local.filter(c =>
        (c.url || '').toLowerCase().includes(term.toLowerCase()) ||
        ((c.title || '') as string).toLowerCase().includes(term.toLowerCase())
      );
      setItems(filtered.slice().reverse());
    } catch (err) {
      console.error('[ContextsList] Search failed', err);
      setItems([]);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    if (query && query.trim().length > 0) {
      void doSearch(query);
    } else {
      load();
      const id = setInterval(load, 3000);
      return () => clearInterval(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, query]);

  return (
    <div className="max-h-[360px] overflow-y-auto">
      {searchLoading && <div className="text-xs text-gray-400">Searching...</div>}
      {!searchLoading && items.length === 0 && (
        <div className="text-xs text-gray-500">No contexts recorded yet</div>
      )}
      {!searchLoading && items.map(item => (
        <div key={item.id} className="flex items-center justify-between gap-2 py-2">
          <div className="flex-1">
            <a href={item.url} target="_blank" rel="noreferrer noopener" className="text-sm text-white hover:underline">
              {item.title || item.url}
            </a>
            <div className="text-xs text-gray-400">{new Date(item.timestamp).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ContextsList;