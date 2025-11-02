import { useAppStore } from '../state/appStore';

export default function ModeSwitcher() {
  const mode = useAppStore(s=>s.mode);
  const setMode = useAppStore(s=>s.setMode);
  return (
    <select className="bg-neutral-800 rounded px-2 py-1 text-sm" value={mode} onChange={(e)=> setMode(e.target.value as any)}>
      <option>Browse</option>
      <option>Research</option>
      <option>Trade</option>
      <option>Games</option>
      <option>Docs</option>
      <option>Images</option>
      <option>Threats</option>
      <option value="GraphMind">GraphMind</option>
    </select>
  );
}


