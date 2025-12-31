import React, { useEffect, useState } from 'react';
import { contextEngine } from '../../core/contextEngine';
import { Clock, ExternalLink } from 'lucide-react';

export function ContextPanel({ limit = 10 }: { limit?: number }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
        {loading && <div className="text-xs text-gray-400">Loading...</div>}
        {!loading && items.length === 0 && (
          <div className="text-xs text-gray-500">No contexts recorded yet</div>
        )}
        {!loading && items.map(item => (
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
