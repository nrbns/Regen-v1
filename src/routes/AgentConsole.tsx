import { useEffect, useRef, useState } from 'react';

export default function AgentConsole() {
  const [runId, setRunId] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const dslRef = useRef<string>(JSON.stringify({ goal: "Open example.com", steps: [{ skill: 'navigate', args: { url: 'https://example.com' } }], output: { type: 'json', schema: {} } }, null, 2));

  useEffect(()=>{
    if (!window.agent) return;
    window.agent.onToken((t: any)=> setLogs((l: any[])=> [...l, t]));
    window.agent.onStep((s: any)=> setLogs((l: any[])=> [...l, s]));
    return () => {
      // listeners auto-removed on page unload in this stub
    };
  },[]);

  return (
    <div className="p-3 grid grid-cols-2 gap-3 h-full">
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Agent DSL</h3>
        <textarea className="flex-1 bg-neutral-800 rounded p-2 text-xs" defaultValue={dslRef.current} onChange={(e)=> (dslRef.current = e.target.value)} />
        <div className="flex gap-2">
          <button className="bg-indigo-600 text-white px-3 py-1 rounded" onClick={async ()=>{
            const parsed = JSON.parse(dslRef.current);
            const res = await window.agent?.start?.(parsed) as any;
            if (res?.runId) setRunId(res.runId);
          }}>Start</button>
          <button className="bg-neutral-700 text-white px-3 py-1 rounded" onClick={async ()=>{ if (runId) await window.agent?.stop?.(runId); }}>Stop</button>
          <button className="bg-neutral-700 text-white px-3 py-1 rounded" onClick={async ()=>{ await window.recorder?.start?.(); }}>Record</button>
          <button className="bg-neutral-700 text-white px-3 py-1 rounded" onClick={async ()=>{ await window.recorder?.stop?.(); const d = await window.recorder?.getDsl?.(); dslRef.current = JSON.stringify(d, null, 2); (document.activeElement as HTMLElement)?.blur(); }}>Stop & Load</button>
          <button className="bg-emerald-600 text-white px-3 py-1 rounded" onClick={()=>{
            const demo = {
              goal: 'Paginate, extract first table, export CSV',
              steps: [
                { skill: 'paginate_and_extract', args: { url: 'https://example.com', nextSelector: 'a.next', maxPages: 2 } },
                { skill: 'export_csv', args: { from: 'last', filename: 'demo.csv' } }
              ],
              output: { type: 'json', schema: {} }
            };
            dslRef.current = JSON.stringify(demo, null, 2);
          }}>Load Demo: Paginate→Extract→CSV</button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Live Logs</h3>
        <pre className="flex-1 bg-neutral-900 rounded p-2 text-xs overflow-auto">{JSON.stringify(logs, null, 2)}</pre>
      </div>
    </div>
  );
}


