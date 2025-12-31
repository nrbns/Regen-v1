import React, { useEffect, useState } from 'react';
import { contextEngine } from '../../core/contextEngine';

export function ContextsList({ limit = 50 }: { limit?: number }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [limit]);

  return (
    <div className="max-h-[360px] overflow-y-auto">
      {loading && <div className="text-xs text-gray-400">Loading...</div>}
      {!loading && items.length === 0 && (
        <div className="text-xs text-gray-500">No contexts recorded yet</div>
      )}
      {!loading && items.map(item => (
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