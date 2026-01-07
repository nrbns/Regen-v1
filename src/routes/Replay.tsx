import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { safeErrorString } from '../utils/safeErrorSerializer';

function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        // Skip React elements and DOM nodes
        if ((value as any).$$typeof || (value as any).nodeType) {
          return '[React/DOM Element]';
        }
      }
      return value;
    }, 2);
  } catch {
    return safeErrorString(obj);
  }
}

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
            <pre className="text-xs bg-neutral-900 rounded p-2 overflow-auto">{safeStringify(s)}</pre>
          </li>
        ))}
      </ol>
    </div>
  );
}


