import React from 'react';
import { useAppStore, type AppState } from '../state/appStore';
import { trackModeSwitch } from '../core/supermemory/tracker';

export default function ModeSwitcher() {
  const mode = useAppStore(s=>s.mode);
  const setMode = useAppStore(s=>s.setMode);
  const prevModeRef = React.useRef<string | null>(null);
  
  React.useEffect(() => {
    if (prevModeRef.current && prevModeRef.current !== mode) {
      trackModeSwitch(mode).catch(console.error);
    }
    prevModeRef.current = mode;
  }, [mode]);
  
  const primaryModes: AppState['mode'][] = ['Browse', 'Research', 'Trade'];
  const secondaryModes: AppState['mode'][] = ['Games', 'Docs', 'Images', 'Threats', 'GraphMind'];
  const [showMore, setShowMore] = React.useState(false);

  return (
    <div className="flex items-center gap-1">
      {/* Primary modes - always visible */}
      {primaryModes.map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            mode === m
              ? 'bg-blue-500/20 text-blue-200 border border-blue-500/40'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
          }`}
        >
          {m}
        </button>
      ))}
      
      {/* More tools dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowMore(!showMore)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            secondaryModes.includes(mode)
              ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
          }`}
        >
          More {showMore ? '▼' : '▶'}
        </button>
        {showMore && (
          <div className="absolute top-full left-0 mt-1 rounded-lg border border-gray-700 bg-gray-900 shadow-xl z-50 min-w-[120px]">
            {secondaryModes.map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setShowMore(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  mode === m
                    ? 'bg-purple-500/20 text-purple-200'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Legacy select for backward compatibility (hidden)
export function LegacyModeSwitcher() {
  const mode = useAppStore((state) => state.mode);
  const setMode = useAppStore((state) => state.setMode);
  return (
    <select
      className="bg-neutral-800 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50"
      value={mode}
      onChange={(e) => setMode(e.target.value as any)}
      aria-label="Select browser mode"
      title="Select browser mode"
    >
      <option value="Browse">Browse</option>
      <option value="Research">Research</option>
      <option value="Trade">Trade</option>
      <option value="Games">Games</option>
      <option value="Docs">Docs</option>
      <option value="Images">Images</option>
      <option value="Threats">Threats</option>
      <option value="GraphMind">GraphMind</option>
    </select>
  );
}


