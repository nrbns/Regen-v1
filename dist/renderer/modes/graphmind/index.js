import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { GitBranch, Search, Sparkles, Loader2, Network, Link2, FileText, Globe } from 'lucide-react';
import { useAgentExecutor } from '../../core/agents/useAgentRuntime';
export default function GraphMindPanel() {
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const runGraphMindAgent = useAgentExecutor('graphmind.agent');
    useEffect(() => {
        (async () => {
            const all = await window.api?.graph?.all?.();
            if (all) {
                setNodes(all.nodes);
                setEdges(all.edges);
            }
        })();
    }, []);
    useEffect(() => {
        const onAuto = async (payload) => {
            const g = window.graph;
            if (g && payload?.nodes) {
                for (const n of payload.nodes)
                    await g.add(n, []);
                if (payload.edges?.length)
                    await g.add({ key: payload.nodes[0]?.key || 'tmp' }, payload.edges);
            }
            const all = await window.api?.graph?.all?.();
            if (all) {
                setNodes(all.nodes);
                setEdges(all.edges);
            }
        };
        window.graph?.onAuto?.(onAuto);
    }, []);
    const handleQuery = async (e) => {
        e.preventDefault();
        if (!query.trim())
            return;
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
            const all = await window.api?.graph?.all?.();
            if (all) {
                setNodes(all.nodes);
                setEdges(all.edges);
            }
        }
        catch (error) {
            console.error('[GraphMindPanel] Query failed:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const getNodeIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'url':
            case 'web':
                return _jsx(Globe, { size: 14, className: "text-blue-400" });
            case 'document':
            case 'file':
                return _jsx(FileText, { size: 14, className: "text-purple-400" });
            default:
                return _jsx(Network, { size: 14, className: "text-gray-400" });
        }
    };
    return (_jsxs("div", { className: "flex h-full flex-col bg-[#1A1D28] text-gray-100", children: [_jsx("div", { className: "border-b border-gray-800/40 bg-gray-900/40 px-6 py-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "rounded-lg bg-blue-500/10 p-2", children: _jsx(GitBranch, { size: 20, className: "text-blue-400" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-100", children: "GraphMind Mode" }), _jsx("p", { className: "text-xs text-gray-400", children: "Knowledge graph view of SuperMemory" })] })] }), _jsxs("div", { className: "flex items-center gap-4 text-xs text-gray-400", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(Network, { size: 14 }), _jsxs("span", { children: [nodes.length, " nodes"] })] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(Link2, { size: 14 }), _jsxs("span", { children: [edges.length, " connections"] })] })] })] }) }), _jsx("div", { className: "border-b border-gray-800/40 px-6 py-4", children: _jsxs("form", { onSubmit: handleQuery, className: "flex gap-3", children: [_jsxs("div", { className: "flex-1 relative", children: [_jsx(Search, { size: 18, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" }), _jsx("input", { type: "text", value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Query your knowledge graph, explore connections...", className: "w-full bg-gray-800/50 border border-gray-700/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50" })] }), _jsx("button", { type: "submit", disabled: loading || !query.trim(), className: "px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { size: 16, className: "animate-spin" }), "Exploring..."] })) : (_jsxs(_Fragment, { children: [_jsx(GitBranch, { size: 16 }), "Explore"] })) })] }) }), aiResponse && (_jsx("div", { className: "border-b border-gray-800/40 bg-blue-500/5 px-6 py-4", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx(Sparkles, { size: 18, className: "text-blue-400 mt-0.5 flex-shrink-0" }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-xs font-semibold text-blue-300 mb-1", children: "GraphMind Assistant" }), _jsx("div", { className: "text-sm text-gray-300 whitespace-pre-wrap", children: aiResponse })] })] }) })), _jsx("div", { className: "flex-1 overflow-y-auto p-6", children: nodes.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center h-full text-center", children: [_jsx("div", { className: "rounded-full border border-dashed border-gray-700/60 bg-gray-800/30 p-8 mb-4", children: _jsx(GitBranch, { size: 48, className: "text-gray-500" }) }), _jsx("h3", { className: "text-lg font-semibold text-gray-200 mb-2", children: "Empty Knowledge Graph" }), _jsx("p", { className: "text-sm text-gray-400 max-w-md", children: "Your knowledge graph will populate as you browse, search, and save content. Start exploring to build connections!" })] })) : (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("div", { className: "rounded-lg border border-gray-700/50 bg-gray-800/30 p-4", children: [_jsx("div", { className: "text-xs text-gray-400 mb-1", children: "Total Nodes" }), _jsx("div", { className: "text-2xl font-bold text-gray-200", children: nodes.length })] }), _jsxs("div", { className: "rounded-lg border border-gray-700/50 bg-gray-800/30 p-4", children: [_jsx("div", { className: "text-xs text-gray-400 mb-1", children: "Connections" }), _jsx("div", { className: "text-2xl font-bold text-gray-200", children: edges.length })] }), _jsxs("div", { className: "rounded-lg border border-gray-700/50 bg-gray-800/30 p-4", children: [_jsx("div", { className: "text-xs text-gray-400 mb-1", children: "Node Types" }), _jsx("div", { className: "text-2xl font-bold text-gray-200", children: new Set(nodes.map((n) => n.type).filter(Boolean)).size })] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm font-semibold text-gray-200 mb-3", children: "Knowledge Nodes" }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3", children: nodes.map((node) => (_jsxs("div", { className: "group rounded-lg border border-gray-700/50 bg-gray-800/30 p-4 hover:border-blue-500/50 hover:bg-gray-800/50 transition-colors", children: [_jsxs("div", { className: "flex items-start gap-2 mb-2", children: [getNodeIcon(node.type), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "font-medium text-sm text-gray-200 truncate", children: node.title || node.key }), node.type && (_jsx("div", { className: "text-xs text-gray-400 mt-0.5 capitalize", children: node.type }))] })] }), _jsxs("div", { className: "text-xs text-gray-500", children: [edges.filter((e) => e.src === node.key || e.dst === node.key).length, " connections"] })] }, node.key))) })] })] })) })] }));
}
