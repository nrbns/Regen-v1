import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function Replay() {
  const { id } = useParams();
  const [run, setRun] = useState<any>(null);
  useEffect(()=>{ (async ()=>{ if (id) setRun(await window.agent?.getRun?.(id) as any); })(); },[id]);
  if (!run) return <div className="p-4">Loading…</div>;
  return (
    <div className="p-4 space-y-3">
      <h2 className="text-lg font-semibold">Replay {id?.slice(0,8)}…</h2>
      <div className="text-sm text-neutral-300">Goal: {(run.dsl?.goal)||'-'}</div>
      <ol className="space-y-1 text-sm">
        {run.steps?.map((s: any, i: number) => (
          <li key={i} className="border border-neutral-800 rounded p-2">
            <div className="font-medium">Step {i+1}: {s.skill || s.type}</div>
            <pre className="text-xs bg-neutral-900 rounded p-2 overflow-auto">{JSON.stringify(s, null, 2)}</pre>
          </li>
        ))}
      </ol>
    </div>
  );
}


