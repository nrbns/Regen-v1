import { ipcMain } from 'electron';

type Node = { key: string; type?: string; title?: string; created_at?: number };
type Edge = { src: string; dst: string; rel?: string; weight?: number; created_at?: number };

const nodes = new Map<string, Node>();
const edges: Edge[] = [];

export function addToGraph(n: Node, e: Edge[] = []) {
  const now = Date.now();
  const node = { ...n, created_at: n.created_at || now };
  nodes.set(node.key, node);
  for (const ed of e) edges.push({ ...ed, created_at: ed.created_at || now });
}

export function registerGraphIpc() {
  ipcMain.handle('graph:add', (_e, n: Node, e: Edge[] = []) => { addToGraph(n, e); return true; });

  ipcMain.handle('graph:get', (_e, key: string) => {
    const node = nodes.get(key) || null;
    const neigh = edges.filter(ed => ed.src === key || ed.dst === key);
    return { node, edges: neigh };
  });

  ipcMain.handle('graph:all', () => {
    return { nodes: Array.from(nodes.values()), edges };
  });
}


