import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Search, Image as ImageIcon, Sparkles, Loader2, Download, ExternalLink } from 'lucide-react';
import { MockImageEngine } from './engines';
import { useAgentExecutor } from '../../core/agents/useAgentRuntime';
export default function ImagesPanel() {
    const engine = new MockImageEngine();
    const [prompt, setPrompt] = useState('');
    const [imgs, setImgs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const runImagesAgent = useAgentExecutor('images.agent');
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!prompt.trim())
            return;
        setLoading(true);
        setAiResponse('');
        try {
            // Generate images using mock engine
            const generated = engine.generate(prompt);
            setImgs(generated);
            // Run AI agent for image analysis/suggestions
            const agentResult = await runImagesAgent({
                prompt: `Find and analyze images related to: ${prompt}`,
                context: { mode: 'Images', query: prompt },
            });
            if (agentResult.success && agentResult.output) {
                setAiResponse(agentResult.output);
            }
        }
        catch (error) {
            console.error('[ImagesPanel] Search failed:', error);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "flex h-full flex-col bg-[#1A1D28] text-gray-100", children: [_jsx("div", { className: "border-b border-gray-800/40 bg-gray-900/40 px-6 py-4", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "rounded-lg bg-purple-500/10 p-2", children: _jsx(ImageIcon, { size: 20, className: "text-purple-400" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-100", children: "Image Mode" }), _jsx("p", { className: "text-xs text-gray-400", children: "Visual search and inspiration boards" })] })] }) }), _jsx("div", { className: "border-b border-gray-800/40 px-6 py-4", children: _jsxs("form", { onSubmit: handleSearch, className: "flex gap-3", children: [_jsxs("div", { className: "flex-1 relative", children: [_jsx(Search, { size: 18, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" }), _jsx("input", { type: "text", value: prompt, onChange: (e) => setPrompt(e.target.value), placeholder: "Search for images, describe what you want to see...", className: "w-full bg-gray-800/50 border border-gray-700/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50" })] }), _jsx("button", { type: "submit", disabled: loading || !prompt.trim(), className: "px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { size: 16, className: "animate-spin" }), "Searching..."] })) : (_jsxs(_Fragment, { children: [_jsx(Search, { size: 16 }), "Search"] })) })] }) }), aiResponse && (_jsx("div", { className: "border-b border-gray-800/40 bg-purple-500/5 px-6 py-4", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx(Sparkles, { size: 18, className: "text-purple-400 mt-0.5 flex-shrink-0" }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-xs font-semibold text-purple-300 mb-1", children: "AI Assistant" }), _jsx("div", { className: "text-sm text-gray-300 whitespace-pre-wrap", children: aiResponse })] })] }) })), _jsx("div", { className: "flex-1 overflow-y-auto p-6", children: imgs.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center h-full text-center", children: [_jsx("div", { className: "rounded-full border border-dashed border-gray-700/60 bg-gray-800/30 p-8 mb-4", children: _jsx(ImageIcon, { size: 48, className: "text-gray-500" }) }), _jsx("h3", { className: "text-lg font-semibold text-gray-200 mb-2", children: "No images yet" }), _jsx("p", { className: "text-sm text-gray-400 max-w-md", children: "Enter a search query above to find images, generate visual content, or create inspiration boards." })] })) : (_jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", children: imgs.map((src, i) => (_jsxs("div", { className: "group relative bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden hover:border-purple-500/50 transition-colors", children: [_jsx("div", { className: "aspect-square bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center", children: _jsx("div", { className: "text-xs text-gray-400 text-center p-4", children: src }) }), _jsxs("div", { className: "absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100", children: [_jsxs("button", { className: "px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded text-xs text-white hover:bg-white/20 transition-colors flex items-center gap-1.5", children: [_jsx(Download, { size: 14 }), "Download"] }), _jsxs("button", { className: "px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded text-xs text-white hover:bg-white/20 transition-colors flex items-center gap-1.5", children: [_jsx(ExternalLink, { size: 14 }), "Open"] })] })] }, i))) })) })] }));
}
