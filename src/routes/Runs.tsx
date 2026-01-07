import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type Run = { id: string; startedAt: number; finishedAt?: number; steps: number; goal?: string };

export default function Runs() {
  const [runs, setRuns] = useState<Run[]>([]);
  useEffect(()=>{ (async ()=>{ const list = await window.agent?.runs?.(); setRuns((list || []) as any[]); })(); },[]);
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-3">Agent Runs</h2>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-neutral-400"><th>ID</th><th>Goal</th><th>Steps</th><th>Started</th><th>Status</th></tr></thead>
        <tbody>
          {runs.map(r => (
            <tr key={r.id} className="border-t border-neutral-800">
              <td className="py-2"><Link className="text-indigo-400" to={`/replay/${r.id}`}>{r.id.slice(0,8)}…</Link></td>
              <td>{r.goal || '-'}</td>
              <td>{r.steps}</td>
              <td>{new Date(r.startedAt).toLocaleString()}</td>
              <td>{r.finishedAt ? 'done' : 'running'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


