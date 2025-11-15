import React from 'react';
import { useAppStore } from '../state/appStore';
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


