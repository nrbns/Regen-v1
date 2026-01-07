import { useEffect, useState } from 'react';

export default function VideoPage() {
  const [url, setUrl] = useState('');
  const [log, setLog] = useState<string>('');
  useEffect(()=>{
    const onProg = (_e: any, line: string)=> setLog(prev => prev + line);
    (window as any).api?.video?.onProgress?.(onProg);
    return ()=>{};
  },[]);
  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">Video Download</h2>
      <div className="flex gap-2">
        <input className="flex-1 bg-neutral-800 rounded px-2 py-1 text-sm" value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="Paste video URL (You must have rights)" />
        <button className="bg-indigo-600 text-white px-3 py-1 rounded" onClick={async ()=>{ const ok = await (window as any).api?.video?.start?.({ url }); if (!ok?.ok) alert(ok?.error||'Error'); }}>Start</button>
      </div>
      <pre className="text-xs bg-neutral-900 p-2 rounded h-64 overflow-auto">{log || 'Waiting…'}</pre>
    </div>
  );
}


