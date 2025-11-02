import { useState } from 'react';

export default function ThreatsPanel() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<any>(null);
  return (
    <div className="p-3 space-y-2">
      <form onSubmit={async (e)=>{ e.preventDefault(); const r = await window.api?.threats?.scanUrl?.(url); setResult(r); }}>
        <input className="w-full bg-neutral-800 rounded px-3 py-2 text-sm" value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="Enter URL" />
      </form>
      {result && (
        <pre className="text-xs bg-neutral-900 p-2 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}


