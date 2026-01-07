import { useEffect, useState } from 'react';
import { GitBranch, Search, Sparkles, Loader2, Network, Link2, FileText, Globe } from 'lucide-react';
import { useAgentExecutor } from '../../core/agents/useAgentRuntime';

type Node = { key: string; title?: string; type?: string };
type Edge = { src: string; dst: string; rel?: string };

export default function GraphMindPanel() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string>('');
  const runGraphMindAgent = useAgentExecutor('graphmind.agent');

  useEffect(() => {
    (async () => {
      const all = await (window as any).api?.graph?.all?.();
      if (all) {
        setNodes(all.nodes);
        setEdges(all.edges);
      }
    })();
  }, []);

  useEffect(() => {
    const onAuto = async (payload: any) => {
      const g = (window as any).graph;
      if (g && payload?.nodes) {
        for (const n of payload.nodes) await g.add(n, []);
        if (payload.edges?.length) await g.add({ key: payload.nodes[0]?.key || 'tmp' }, payload.edges);
      }
      const all = await (window as any).api?.graph?.all?.();
      if (all) {
        setNodes(all.nodes);
        setEdges(all.edges);
      }
    };
    (window as any).graph?.onAuto?.(onAuto);
  }, []);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setAiResponse('');

    try {
      const agentResult = await runGraphMindAgent({
        prompt: `Explore knowledge graph connections for: ${query}`,
        context: { mode: 'GraphMind', query, nodes: nodes.length, edges: edges.length },
      });

      if (agentResult.success && agentResult.output) {
        setAiResponse(agentResult.output);
      }

      // Refresh graph data
      const all = await (window as any).api?.graph?.all?.();
      if (all) {
        setNodes(all.nodes);
        setEdges(all.edges);
      }
    } catch (error) {
      console.error('[GraphMindPanel] Query failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNodeIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'url':
      case 'web':
        return <Globe size={14} className="text-blue-400" />;
      case 'document':
      case 'file':
        return <FileText size={14} className="text-purple-400" />;
      default:
        return <Network size={14} className="text-gray-400" />;
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#1A1D28] text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800/40 bg-gray-900/40 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <GitBranch size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-100">GraphMind Mode</h2>
              <p className="text-xs text-gray-400">Knowledge graph view of SuperMemory</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <Network size={14} />
              <span>{nodes.length} nodes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Link2 size={14} />
              <span>{edges.length} connections</span>
            </div>
          </div>
        </div>
      </div>

      {/* Query Input */}
      <div className="border-b border-gray-800/40 px-6 py-4">
        <form onSubmit={handleQuery} className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Query your knowledge graph, explore connections..."
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Exploring...
              </>
            ) : (
              <>
                <GitBranch size={16} />
                Explore
              </>
            )}
          </button>
        </form>
      </div>

      {/* AI Response */}
      {aiResponse && (
        <div className="border-b border-gray-800/40 bg-blue-500/5 px-6 py-4">
          <div className="flex items-start gap-3">
            <Sparkles size={18} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-xs font-semibold text-blue-300 mb-1">GraphMind Assistant</div>
              <div className="text-sm text-gray-300 whitespace-pre-wrap">{aiResponse}</div>
            </div>
          </div>
        </div>
      )}

      {/* Graph Visualization */}
      <div className="flex-1 overflow-y-auto p-6">
        {nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="rounded-full border border-dashed border-gray-700/60 bg-gray-800/30 p-8 mb-4">
              <GitBranch size={48} className="text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Empty Knowledge Graph</h3>
            <p className="text-sm text-gray-400 max-w-md">
              Your knowledge graph will populate as you browse, search, and save content. Start exploring to build connections!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Graph Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-gray-700/50 bg-gray-800/30 p-4">
                <div className="text-xs text-gray-400 mb-1">Total Nodes</div>
                <div className="text-2xl font-bold text-gray-200">{nodes.length}</div>
              </div>
              <div className="rounded-lg border border-gray-700/50 bg-gray-800/30 p-4">
                <div className="text-xs text-gray-400 mb-1">Connections</div>
                <div className="text-2xl font-bold text-gray-200">{edges.length}</div>
              </div>
              <div className="rounded-lg border border-gray-700/50 bg-gray-800/30 p-4">
                <div className="text-xs text-gray-400 mb-1">Node Types</div>
                <div className="text-2xl font-bold text-gray-200">
                  {new Set(nodes.map((n) => n.type).filter(Boolean)).size}
                </div>
              </div>
            </div>

            {/* Nodes Grid */}
            <div>
              <div className="text-sm font-semibold text-gray-200 mb-3">Knowledge Nodes</div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {nodes.map((node) => (
                  <div
                    key={node.key}
                    className="group rounded-lg border border-gray-700/50 bg-gray-800/30 p-4 hover:border-blue-500/50 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {getNodeIcon(node.type)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-200 truncate">{node.title || node.key}</div>
                        {node.type && (
                          <div className="text-xs text-gray-400 mt-0.5 capitalize">{node.type}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {edges.filter((e) => e.src === node.key || e.dst === node.key).length} connections
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


