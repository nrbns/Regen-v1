import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, BookOpen, Loader2, Sparkles, ShieldAlert, Calculator, Clock } from 'lucide-react';
import { ipc } from '../lib/ipc-typed';
import { useResearchStore } from '../state/researchStore';
import { useTabsStore } from '../state/tabsStore';
import { Portal } from '../components/common/Portal';
import { RedixStatus, ResearchSkeleton } from '../components/research/RedixStatus';

const ISSUE_DESCRIPTIONS: Record<string, string> = {
  uncited: 'Sentence has no supporting citation',
  contradiction: 'Verification found a conflicting claim',
};

function CitationChip({
  citeId,
  index,
  onHover,
  onLeave,
  onClick,
  active,
}: {
  citeId: string;
  index: number;
  onHover?: () => void;
  onLeave?: () => void;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border text-xs px-2 py-0.5 transition-colors ${
        active
          ? 'bg-blue-500/30 text-blue-50 border-blue-400 shadow shadow-blue-500/20'
          : 'bg-blue-500/10 text-blue-200 border-blue-500/40 hover:bg-blue-500/20'
      }`}
    >
      <span className="text-[10px]">[{index + 1}]</span>
      <span className="uppercase tracking-wide text-[9px]">cite</span>
    </button>
  );
}

function IssueBadge({ issue }: { issue: { type: 'uncited' | 'contradiction'; detail?: string; sentenceIdx: number } }) {
  const label = ISSUE_DESCRIPTIONS[issue.type] ?? 'Unknown issue';
  const tone = issue.type === 'contradiction' ? 'text-red-300 bg-red-500/10 border-red-400/30' : 'text-amber-200 bg-amber-500/10 border-amber-400/30';
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[11px] ${tone}`}>
      <ShieldAlert size={12} />
      <span>{label}</span>
    </div>
  );
}

function SourceCard({
  cite,
  index,
  active,
  onPreview,
}: {
  cite: { id: string; title: string; url: string; snippet?: string; publishedAt?: string };
  index: number;
  active?: boolean;
  onPreview?: () => void;
}) {
  return (
    <motion.li
      layout
      className={`rounded-xl border px-3 py-2 space-y-1 transition-colors ${
        active ? 'border-blue-500/60 bg-blue-500/10 shadow-lg shadow-blue-500/10' : 'border-gray-800/60 bg-gray-900/60'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold">
          {index + 1}
        </span>
        <div className="flex-1">
          <button
            onClick={() => window.open(cite.url, '_blank', 'noopener')}
            className="text-sm font-semibold text-blue-200 hover:text-blue-100 transition-colors"
          >
            {cite.title}
          </button>
          {cite.publishedAt && (
            <p className="text-[11px] text-gray-400">Published {cite.publishedAt}</p>
          )}
        </div>
        {onPreview && (
          <button
            type="button"
            onClick={onPreview}
            className="rounded-lg border border-blue-500/40 px-2 py-1 text-[11px] text-blue-200 hover:bg-blue-500/20 transition-colors"
          >
            Preview
          </button>
        )}
      </div>
      {cite.snippet && (
        <p className="text-xs text-gray-400 leading-relaxed">{cite.snippet}</p>
      )}
      <p className="text-[10px] text-gray-500 break-all">{cite.url}</p>
    </motion.li>
  );
}

export function Research() {
  const {
    question,
    setQuestion,
    isLoading,
    setLoading,
    chunks,
    appendChunk,
    reset,
    setSources,
    sources,
    setIssues,
    issues,
    setError,
    error,
    previewCiteId,
    setPreviewCite,
  } = useResearchStore();
  const { activeId, tabs } = useTabsStore();
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeId), [tabs, activeId]);
  const [jobChannel, setJobChannel] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [lastCompletedAt, setLastCompletedAt] = useState<number | null>(null);
  const researcherListenerRef = useRef<((event: any, payload: any) => void) | null>(null);

  const sourcesAsFlat = useMemo(() => {
    const entries: Array<{ cite: any; idx: number }> = [];
    const citeKeys = Object.keys(sources);
    citeKeys.forEach((key) => {
      const list = sources[key];
      list.forEach((entry, index) => entries.push({ cite: entry, idx: index }));
    });
    return entries;
  }, [sources]);

  const previewEntries = useMemo(() => {
    if (!previewCiteId) return [];
    return sources[previewCiteId] ?? [];
  }, [previewCiteId, sources]);

  useEffect(() => {
    return () => {
      if (jobChannel && researcherListenerRef.current && window.ipc?.removeListener) {
        window.ipc.removeListener(jobChannel, researcherListenerRef.current);
      }
    };
  }, [jobChannel]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewCite(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setPreviewCite]);

  const startResearch = useCallback(async (mode?: 'default' | 'threat' | 'trade') => {
    if (!question.trim()) return;
    setLoading(true);
    reset();
    setError(undefined);

    try {
      const { jobId: freshJobId, channel } = await ipc.researchStream.start(question.trim(), mode);
      setJobChannel(channel);
      setJobId(freshJobId);

      if (window.ipc?.on) {
        const listener = (_event: any, payload: any) => {
          switch (payload?.type) {
            case 'status':
              setLoading(true);
              break;
            case 'chunk':
              appendChunk({ content: payload.content, citations: payload.citations || [] });
              break;
            case 'sources':
              setSources(payload.entries || {});
              break;
            case 'issues':
              setIssues(payload.entries || []);
              break;
            case 'complete':
              setLoading(false);
              break;
            case 'error':
              setError(payload.message || 'Research failed');
              setLoading(false);
              break;
          }
        };
        researcherListenerRef.current = listener;
        window.ipc.on(channel, listener);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }, [appendChunk, question, reset, setError, setIssues, setLoading, setSources]);

  useEffect(() => {
    if (!isLoading && chunks.length > 0) {
      setLastCompletedAt(Date.now());
    }
  }, [isLoading, chunks.length]);

  const formattedAnswer = useMemo(() => {
    let offset = 0;
    return chunks.map((chunk, chunkIndex) => {
      const sentences = chunk.content.split(/(?<=[.!?])\s+/);
      const decorated = sentences.map((sentence, sentenceIdx) => {
        const globalIdx = offset + sentenceIdx;
        const badges = issues.filter((issue) => issue.sentenceIdx === globalIdx);
        return {
          text: sentence,
          badges,
          citations: chunk.citations,
        };
      });
      offset += sentences.length;
      return { decorated, chunkIndex };
    });
  }, [chunks, issues]);

  useEffect(() => {
    if (!question.trim() && activeTab?.url) {
      setQuestion(`Summarize: ${activeTab.title || activeTab.url}`);
    }
  }, [activeTab, question, setQuestion]);

  return (
    <div className="h-full w-full overflow-auto bg-slate-950 text-gray-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-500/20 p-2 text-blue-200">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-blue-100">Research Mode</h1>
              <p className="text-sm text-slate-400">
                Ask a question. We gather sources, draft an answer with inline citations, and flag anything unverified.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="What do you want to investigate?"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <div className="flex gap-2">
              <button
                disabled={isLoading}
                onClick={() => startResearch('default')}
                className="inline-flex items-center justify-center rounded-xl border border-blue-500/50 bg-blue-600/20 px-4 py-2 text-sm font-medium text-blue-100 transition-colors hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800/50 disabled:text-slate-500"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Run Research
              </button>
              <button
                disabled={isLoading}
                onClick={() => startResearch('threat')}
                className="inline-flex items-center justify-center rounded-xl border border-purple-500/40 bg-purple-600/20 px-4 py-2 text-sm font-medium text-purple-100 transition-colors hover:bg-purple-600/30 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800/50 disabled:text-slate-500"
              >
                Mode: Threat
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <div>
                <p className="font-medium">Research failed</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          <RedixStatus
            loading={isLoading}
            hasIssues={issues.length > 0}
            lastRunAt={lastCompletedAt}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
          <section className="space-y-4">
            <header className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-200">Findings</h2>
              {isLoading && (
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/50 bg-blue-500/10 px-3 py-1 text-xs text-blue-200">
                  <Loader2 className="h-3 w-3 animate-spin" /> Streaming answer…
                </div>
              )}
            </header>

            {isLoading && (
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-6">
                <ResearchSkeleton />
              </div>
            )}

            {chunks.length === 0 && !isLoading ? (
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-6 text-sm text-slate-400">
                Results will appear here as soon as you run a question.
              </div>
            ) : (
              !isLoading && (
              <div className="space-y-4">
                {formattedAnswer.map(({ decorated, chunkIndex }) => (
                  <motion.article
                    key={`chunk-${chunkIndex}`}
                    layout
                    className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-5 space-y-3"
                  >
                    {decorated.map((sentence, sentenceIdx) => (
                      <div key={`${chunkIndex}-${sentenceIdx}`} className="space-y-2">
                        <p className="text-sm leading-relaxed text-slate-200">
                          {sentence.text}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {sentence.badges.map((issue, idx) => (
                            <IssueBadge key={`${chunkIndex}-${sentenceIdx}-${idx}`} issue={issue} />
                          ))}
                          {sentence.citations.map((citeId, idx) => (
                            <CitationChip
                              key={`${chunkIndex}-${sentenceIdx}-cite-${citeId}-${idx}`}
                              citeId={citeId}
                              index={idx}
                              active={previewCiteId === citeId}
                              onClick={() => setPreviewCite(previewCiteId === citeId ? null : citeId)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </motion.article>
                ))}
              </div>
              )
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <BookOpen size={16} /> Sources ({sourcesAsFlat.length})
              </h3>
              <ul className="mt-4 space-y-3">
                <AnimatePresence initial={false}>
                  {sourcesAsFlat.map(({ cite, idx }) => (
                    <SourceCard
                      key={`${cite.id}-${idx}`}
                      cite={cite}
                      index={idx}
                      active={previewCiteId === cite.id}
                      onPreview={() => setPreviewCite(cite.id)}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </div>

            {issues.length > 0 && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                  <ShieldAlert size={16} /> Verification Alerts
                </h3>
                <ul className="space-y-2 text-xs text-amber-200">
                  {issues.map((issue, idx) => (
                    <li key={`${issue.type}-${idx}`}>
                      Sentence {issue.sentenceIdx + 1}: {ISSUE_DESCRIPTIONS[issue.type] || issue.type}
                      {issue.detail ? ` — ${issue.detail}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
      {previewCiteId && previewEntries.length > 0 && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 py-6 sm:items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="w-full max-w-3xl overflow-hidden rounded-2xl border border-blue-500/30 bg-slate-950/95 shadow-xl shadow-blue-500/10"
            >
              <header className="flex flex-col gap-3 border-b border-blue-500/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-blue-300">Evidence Preview</p>
                  <h2 className="text-lg font-semibold text-blue-100">{previewEntries[0]?.title}</h2>
                  <p className="text-xs text-slate-400 break-all">{previewEntries[0]?.url}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const target = previewEntries[0]?.url;
                      if (target) {
                        window.open(target, '_blank', 'noopener');
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-100 transition-colors hover:bg-blue-500/20"
                  >
                    <Sparkles size={14} /> Open Source
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewCite(null)}
                    className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-700"
                  >
                    Close
                  </button>
                </div>
              </header>
              <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-4">
                {previewEntries.map((entry, idx) => (
                  <motion.article
                    key={`${entry.id}-${idx}`}
                    layout
                    className="rounded-xl border border-blue-500/20 bg-slate-900/70 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-blue-300">
                        <Calculator size={12} />
                        Evidence {idx + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => window.open(entry.url, '_blank', 'noopener')}
                        className="text-[11px] text-blue-300 underline-offset-2 hover:underline"
                      >
                        Open in new tab
                      </button>
                    </div>
                    {entry.snippet ? (
                      <blockquote className="border-l-2 border-blue-500/50 pl-3 text-sm leading-relaxed text-slate-200">
                        {entry.snippet}
                      </blockquote>
                    ) : (
                      <p className="text-sm text-slate-300">No snippet available. Open the source to review.</p>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Clock size={12} />
                      <span>{entry.publishedAt ? `Published ${entry.publishedAt}` : 'No publish date'}</span>
                    </div>
                  </motion.article>
                ))}
              </div>
            </motion.div>
          </div>
        </Portal>
      )}
    </div>
  );
}
