import { useState } from 'react';
import { useAppStore } from '../state/appStore';

export default function PhantomDock() {
  const [picked, setPicked] = useState('');
  const open = useAppStore(s=>s.graphDockOpen || s.ledgerDockOpen) ? false : true; // simple always-available pane disabled when other docks open
  if (!open) return null;
  return (
    <div className="fixed right-0 top-[58px] bottom-0 w-[360px] pointer-events-none" />
  );
}

export function PhantomControls() {
  const [sel, setSel] = useState('');
  return (
    <div className="ml-2 flex items-center gap-2">
      <button className="text-xs px-2 py-1 rounded bg-neutral-800" onClick={async ()=>{ await window.api?.tabs?.overlayStart?.(); }}>Highlight</button>
      <button className="text-xs px-2 py-1 rounded bg-neutral-800" onClick={async ()=>{ const s = await window.api?.tabs?.overlayGetPick?.(); if (s) setSel(String(s)); }}>Use pick</button>
      {sel && <span className="text-xs text-neutral-400 truncate max-w-[220px]">{sel}</span>}
    </div>
  );
}


