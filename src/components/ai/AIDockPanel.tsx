import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, ExternalLink, Loader2, Pin, PinOff, Send, Sparkles, Timer } from 'lucide-react';

import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import { showToast } from '../../state/toastStore';

type DockEntry = {
  id: string;
  prompt: string;
  answer: string;
  timestamp: number;
  latencyMs: number;
  tokens: number;
  model: string;
  sources: string[];
  scrape?: {
    status: number;
    cached: boolean;
    fetchedAt?: string;
  };
};

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `dock-${Math.random().toString(36).slice(2, 10)}`;
};

const estimateTokens = (prompt: string, answer: string) => {
  const combined = prompt.length + answer.length;
  return Math.max(32, Math.round(combined / 4));
};

export function AIDockPanel() {
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pinned, setPinned] = useState(true);
  const [history, setHistory] = useState<DockEntry[]>([]);
  const activeTab = useTabsStore(state => {
    const tab = state.tabs.find(t => t.id === state.activeId);
    return tab ? { url: tab.url, title: tab.title } : null;
  });

  const latest = history[0];

  const contextLabel = useMemo(() => {
    if (!activeTab?.url) {
      return 'general';
    }
    try {
      const parsed = new URL(activeTab.url);
      return parsed.hostname;
    } catch {
      return 'current page';
    }
  }, [activeTab?.url]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = prompt.trim();
    if (!question || isSubmitting) {
      return;
    }

    if (!activeTab?.url) {
      showToast('error', 'Open a tab to provide page context.');
      return;
    }

    setIsSubmitting(true);
    const started = performance.now();
    let jobId: string | null = null;

    try {
      const response = await ipc.agent.askWithScrape({
        url: activeTab.url,
        question,
        task: 'qa',
        waitFor: 8,
      });

      // Handle 202 enqueued response - poll for result
      if (response.status === 'enqueued' && response.jobId) {
        jobId = response.jobId;
        showToast('info', 'Fetching page safely... This may take a few seconds.');

        // Poll for result
        const pollInterval = setInterval(async () => {
          try {
            const resultEndpoint =
              process.env.AGENT_QUERY_ENDPOINT?.replace('/api/agent/query', '') ||
              'http://127.0.0.1:4000';
            const resultResponse = await fetch(`${resultEndpoint}/api/agent/result/${jobId}/qa`, {
              method: 'GET',
              headers: { 'content-type': 'application/json' },
            });

            if (resultResponse.ok) {
              clearInterval(pollInterval);
              const result = await resultResponse.json();
              if (result.status === 'complete' && result.agentResult) {
                const agentResult = result.agentResult;
                const answer = agentResult.answer?.trim() || 'No answer returned yet.';
                const sources =
                  Array.isArray(agentResult.sources) && agentResult.sources.length > 0
                    ? agentResult.sources.map((s: { url: string }) => s.url)
                    : [activeTab.url];

                const modelName =
                  typeof agentResult.model === 'string'
                    ? agentResult.model
                    : agentResult.model?.name || 'agent:auto';
                const tokens =
                  typeof agentResult.model === 'object' && agentResult.model.tokensUsed
                    ? agentResult.model.tokensUsed
                    : estimateTokens(question, answer);

                const latencyMs = Math.round(performance.now() - started);

                const entry: DockEntry = {
                  id: jobId || createId(),
                  prompt: question,
                  answer,
                  timestamp: Date.now(),
                  latencyMs,
                  tokens,
                  model: modelName,
                  sources,
                  scrape: {
                    status: agentResult.provenance?.status || 200,
                    cached: agentResult.provenance?.cached || false,
                    fetchedAt: agentResult.provenance?.fetchedAt,
                  },
                };

                setHistory(prev => [entry, ...prev].slice(0, 5));
                setPrompt('');
                setIsSubmitting(false);
              }
            } else if (resultResponse.status === 404) {
              // Still pending, continue polling
            } else {
              clearInterval(pollInterval);
              throw new Error(`Polling failed: ${resultResponse.status}`);
            }
          } catch (error) {
            clearInterval(pollInterval);
            console.error('[AIDockPanel] polling failed', error);
            showToast('error', 'Failed to get result');
            setIsSubmitting(false);
          }
        }, 1000); // Poll every 1 second

        // Timeout after 30 seconds
        setTimeout(() => {
          clearInterval(pollInterval);
          if (isSubmitting) {
            setIsSubmitting(false);
            showToast('error', 'Request timed out. Please try again.');
          }
        }, 30000);

        return;
      }

      // Handle immediate response (200)
      const answer = response?.answer?.trim() || 'No answer returned yet.';
      const sources =
        Array.isArray(response?.sources) && response.sources.length > 0
          ? response.sources
          : [activeTab.url];

      const modelName =
        typeof response?.model === 'string'
          ? response.model
          : (typeof response?.model === 'object' &&
            response.model !== null &&
            'name' in response.model
              ? (response.model as { name?: string }).name
              : typeof response?.model === 'string'
                ? response.model
                : undefined) || 'agent:auto';
      const tokens =
        typeof response?.model === 'object' &&
        (response.model as { tokensUsed?: number })?.tokensUsed
          ? (response.model as { tokensUsed: number }).tokensUsed
          : estimateTokens(question, answer);

      const latencyMs = Math.round(performance.now() - started);

      const entry: DockEntry = {
        id: response?.jobId ?? createId(),
        prompt: question,
        answer,
        timestamp: Date.now(),
        latencyMs,
        tokens,
        model: modelName,
        sources,
        scrape: response?.scrape,
      };

      setHistory(prev => [entry, ...prev].slice(0, 5));
      setPrompt('');
    } catch (error) {
      console.error('[AIDockPanel] ask failed', error);
      showToast('error', error instanceof Error ? error.message : 'AI Dock request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const populateFollowUp = () => {
    if (!latest) return;
    setPrompt(`Follow up on "${latest.prompt}": `);
  };

  return (
    <section aria-label="AI Dock" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400">AI Dock</p>
          <p className="text-sm text-gray-300">Ask questions about the {contextLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => setPinned(state => !state)}
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition ${
            pinned
              ? 'border-blue-500/60 bg-blue-500/10 text-blue-200'
              : 'border-slate-700/60 bg-slate-900/60 text-slate-300 hover:bg-slate-800'
          }`}
        >
          {pinned ? <Pin size={14} /> : <PinOff size={14} />}
          {pinned ? 'Pinned' : 'Pin'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <label htmlFor="ai-dock-question" className="sr-only">
          Ask the agent a question
        </label>
        <textarea
          id="ai-dock-question"
          value={prompt}
          onChange={event => setPrompt(event.target.value)}
          disabled={isSubmitting}
          rows={3}
          placeholder="Ask Omni about this page, summarize findings, or request an action..."
          className="w-full rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
        />
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{prompt.length} chars</span>
          <button
            type="submit"
            disabled={!prompt.trim() || isSubmitting}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600/80 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Ask
          </button>
        </div>
      </form>

      {latest && (
        <motion.div
          layout
          className="space-y-3 rounded-xl border border-slate-700/70 bg-slate-900/60 p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-200">
              <Sparkles size={16} className="text-blue-300" />
              Latest answer
            </div>
            <button
              type="button"
              onClick={populateFollowUp}
              className="text-xs font-medium text-blue-300 hover:text-blue-200"
            >
              Ask follow-up
            </button>
          </div>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{latest.answer}</p>
          {latest.scrape && (
            <div className="text-xs text-gray-500 flex flex-wrap items-center gap-3">
              <span>{latest.scrape.cached ? 'Cached result' : 'Fresh fetch'}</span>
              <span>HTTP {latest.scrape.status}</span>
              {latest.scrape.fetchedAt && (
                <span>{new Date(latest.scrape.fetchedAt).toLocaleTimeString()}</span>
              )}
            </div>
          )}
          <div className="rounded-lg border border-slate-800/70 bg-slate-950/60 p-2 text-xs text-gray-400">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <Bot size={12} /> {latest.model}
              </span>
              <span className="inline-flex items-center gap-1">
                <Timer size={12} /> {latest.latencyMs} ms
              </span>
              <span>{latest.tokens} tokens (est.)</span>
              <span>{new Date(latest.timestamp).toLocaleTimeString()}</span>
            </div>
            {latest.sources.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-gray-500">Sources:</span>
                {latest.sources.map((source, index) => (
                  <button
                    key={`${latest.id}-source-${index}`}
                    type="button"
                    onClick={() => window.open(source, '_blank')}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-800/70 px-2 py-0.5 text-[11px] text-blue-200 hover:border-blue-500/60"
                  >
                    <ExternalLink size={12} />
                    {source.replace(/https?:\/\//, '').slice(0, 42)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {history.length > 1 && (
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wide text-gray-500">Recent questions</div>
          <div className="space-y-2">
            {history.slice(1).map(entry => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setPrompt(entry.prompt)}
                className="w-full rounded-xl border border-transparent bg-slate-900/40 p-3 text-left text-sm text-gray-300 transition hover:border-slate-700/70"
              >
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  <span>{entry.tokens} tokens</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-gray-200">{entry.prompt}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
