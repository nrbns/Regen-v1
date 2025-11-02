import { useEffect, useState } from 'react';

type Node = { key: string; title?: string; type?: string };
type Edge = { src: string; dst: string; rel?: string };

export default function GraphMindPanel() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(()=>{ (async ()=>{ const all = await (window as any).api?.graph?.all?.(); if (all) { setNodes(all.nodes); setEdges(all.edges);} })(); },[]);
  useEffect(()=>{
    const onAuto = async (payload: any)=>{
      const g = (window as any).graph;
      if (g && payload?.nodes) {
        for (const n of payload.nodes) await g.add(n, []);
        if (payload.edges?.length) await g.add({ key: payload.nodes[0]?.key || 'tmp' }, payload.edges);
      }
      const all = await (window as any).api?.graph?.all?.();
      if (all) { setNodes(all.nodes); setEdges(all.edges);}    
    };
    (window as any).graph?.onAuto?.(onAuto);
  },[]);

  return (
    <div className="h-full w-full p-3">
      <h3 className="font-medium mb-2">GraphMind</h3>
      <div className="text-xs text-neutral-300 mb-2">Nodes: {nodes.length} · Edges: {edges.length}</div>
      <div className="grid grid-cols-4 gap-2 text-sm">
        {nodes.map(n => (
          <div key={n.key} className="border border-neutral-800 rounded p-2">
            <div className="font-medium">{n.title || n.key}</div>
            <div className="text-neutral-400">{n.type}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


