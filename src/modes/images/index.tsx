import { useState } from 'react';
import {
  Search,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Download,
  ExternalLink,
} from 'lucide-react';
import { MockImageEngine } from './engines';
import { useAgentExecutor } from '../../core/agents/useAgentRuntime';

export default function ImagesPanel() {
  const engine = new MockImageEngine();
  const [prompt, setPrompt] = useState('');
  const [imgs, setImgs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string>('');
  const runImagesAgent = useAgentExecutor('images.agent');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

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
    } catch (error) {
      console.error('[ImagesPanel] Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#1A1D28] text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800/40 bg-gray-900/40 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-500/10 p-2">
            <ImageIcon size={20} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Image Mode</h2>
            <p className="text-xs text-gray-400">Visual search and inspiration boards</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="border-b border-gray-800/40 px-6 py-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Search for images, describe what you want to see..."
              className="w-full rounded-lg border border-gray-700/50 bg-gray-800/50 py-2.5 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search size={16} />
                Search
              </>
            )}
          </button>
        </form>
      </div>

      {/* AI Response */}
      {aiResponse && (
        <div className="border-b border-gray-800/40 bg-purple-500/5 px-6 py-4">
          <div className="flex items-start gap-3">
            <Sparkles size={18} className="mt-0.5 flex-shrink-0 text-purple-400" />
            <div className="flex-1">
              <div className="mb-1 text-xs font-semibold text-purple-300">AI Assistant</div>
              <div className="whitespace-pre-wrap text-sm text-gray-300">{aiResponse}</div>
            </div>
          </div>
        </div>
      )}

      {/* Image Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {imgs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 rounded-full border border-dashed border-gray-700/60 bg-gray-800/30 p-8">
              <ImageIcon size={48} className="text-gray-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-gray-200">No images yet</h3>
            <p className="max-w-md text-sm text-gray-400">
              Enter a search query above to find images, generate visual content, or create
              inspiration boards.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {imgs.map((src, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-lg border border-gray-700/50 bg-gray-800/50 transition-colors hover:border-purple-500/50"
              >
                <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                  <div className="p-4 text-center text-xs text-gray-400">{src}</div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-colors group-hover:bg-black/40 group-hover:opacity-100">
                  <button className="flex items-center gap-1.5 rounded bg-white/10 px-3 py-1.5 text-xs text-white backdrop-blur-sm transition-colors hover:bg-white/20">
                    <Download size={14} />
                    Download
                  </button>
                  <button className="flex items-center gap-1.5 rounded bg-white/10 px-3 py-1.5 text-xs text-white backdrop-blur-sm transition-colors hover:bg-white/20">
                    <ExternalLink size={14} />
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
