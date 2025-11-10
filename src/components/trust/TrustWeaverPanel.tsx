import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Loader2, ExternalLink, Send, Tags, Activity, Users } from 'lucide-react';
import { useTrustWeaverStore } from '../../state/trustWeaverStore';
import { useTabsStore } from '../../state/tabsStore';
import type { TrustSummary } from '../../types/trustWeaver';

function verdictTone(verdict: TrustSummary['verdict']): string {
  switch (verdict) {
    case 'trusted':
      return 'text-emerald-300 bg-emerald-500/10 border-emerald-400/40';
    case 'caution':
      return 'text-amber-300 bg-amber-500/10 border-amber-400/40';
    case 'risk':
    default:
      return 'text-red-300 bg-red-500/10 border-red-400/40';
  }
}

function formatTimeAgo(timestamp: number): string {
  const delta = Date.now() - timestamp;
  if (delta < 60_000) return 'just now';
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 70 ? 'text-emerald-200' : score >= 45 ? 'text-amber-200' : 'text-red-200';
  return <span className={`text-lg font-semibold ${tone}`}>{Math.round(score)}</span>;
}

export function TrustWeaverPanel() {
  const { tabs, activeId } = useTabsStore();
  const activeTab = tabs.find((tab) => tab.id === activeId);
  const activeDomain = useMemo(() => {
    if (!activeTab?.url) return null;
    try {
      return new URL(activeTab.url).hostname;
    } catch {
      return activeTab.url.replace(/^https?:\/\//, '');
    }
  }, [activeTab]);

  const { records, loading, submitting, error, activeSummary, fetchAll, inspect, submit } = useTrustWeaverStore();

  const [score, setScore] = useState(80);
  const [confidence, setConfidence] = useState(0.7);
  const [tags, setTags] = useState('privacy, research');
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!records.length && !loading) {
      void fetchAll();
    }
  }, [records.length, loading, fetchAll]);

  useEffect(() => {
    if (activeDomain) {
      void inspect(activeDomain);
    }
  }, [activeDomain, inspect]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeDomain) return;
    const parsedTags = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    await submit({
      domain: activeDomain,
      url: activeTab?.url,
      title: activeTab?.title,
      score,
      confidence,
      tags: parsedTags,
      comment: comment.trim() || undefined,
      sourcePeer: 'ob://local',
    });
    setComment('');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <ShieldCheck size={16} className="text-sky-400" />
            Trust Weaver Network
          </h2>
          <p className="text-[11px] text-gray-500 mt-1">
            Community-vetted safety intelligence for sites you browse.
          </p>
        </div>
        <button
          onClick={() => void fetchAll()}
          className="text-xs rounded-lg border border-slate-700/60 bg-slate-900/70 px-3 py-1.5 text-slate-200 hover:bg-slate-900/90"
        >
          Refresh mesh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-800/60 bg-slate-900/70 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">Active site</div>
            <div className="mt-1 text-sm text-gray-200 flex items-center gap-2">
              {activeDomain ?? 'No tab active'}
              {activeTab?.url && (
                <a
                  href={activeTab.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-500 hover:text-slate-300"
                >
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><Users size={12} />{records.length} domains</span>
            {loading && <Loader2 size={12} className="animate-spin" />}
          </div>
        </div>

        <AnimatePresence>
          {activeSummary && (
            <motion.div
              key={activeSummary.domain}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-lg border border-slate-800/80 bg-slate-900/80 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ScoreBadge score={activeSummary.score} />
                  <div>
                    <div className="text-sm text-gray-200 font-medium">Trust score</div>
                    <div className="text-[11px] text-slate-500">{Math.round(activeSummary.confidence * 100)}% confidence · {activeSummary.signals} signals</div>
                  </div>
                </div>
                <span className={`text-[11px] px-3 py-1 rounded-full border ${verdictTone(activeSummary.verdict)}`}>
                  {activeSummary.verdict.toUpperCase()}
                </span>
              </div>
              {activeSummary.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                  <Tags size={11} />
                  {activeSummary.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-slate-700/60 px-2 py-0.5">#{tag}</span>
                  ))}
                </div>
              )}
              <div className="text-[11px] text-slate-500">Updated {formatTimeAgo(activeSummary.lastUpdated)}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {activeDomain && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Share insight</div>
            <div className="grid grid-cols-1 gap-4">
              <label className="flex flex-col gap-2 text-xs text-slate-400">
                Score ({score})
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(event) => setScore(Number(event.target.value))}
                  className="accent-sky-400"
                />
              </label>
              <label className="flex flex-col gap-2 text-xs text-slate-400">
                Confidence {(confidence * 100).toFixed(0)}%
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={confidence}
                  onChange={(event) => setConfidence(Number(event.target.value))}
                  className="accent-sky-400"
                />
              </label>
              <label className="flex flex-col gap-2 text-xs text-slate-400">
                Tags (comma separated)
                <input
                  type="text"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  className="rounded-lg border border-slate-800/60 bg-slate-950 px-3 py-2 text-gray-200 focus:border-sky-500 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-2 text-xs text-slate-400">
                Comment (optional)
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={3}
                  className="rounded-lg border border-slate-800/60 bg-slate-950 px-3 py-2 text-sm text-gray-200 focus:border-sky-500 focus:outline-none"
                  placeholder="What makes this site safe or risky?"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-200 hover:bg-sky-500/20 disabled:opacity-60"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Weaver signal
            </button>
          </form>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wide">
          <Activity size={12} className="text-sky-400" />
          Mesh activity
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {records.length === 0 && !loading ? (
            <div className="rounded-lg border border-dashed border-slate-800/60 bg-slate-900/60 px-4 py-6 text-center text-xs text-slate-500">
              No trust intelligence yet. Be the first to cast a signal.
            </div>
          ) : (
            records.slice(0, 12).map((record) => (
              <div key={record.domain} className="rounded-lg border border-slate-800/60 bg-slate-900/70 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-200 font-medium">{record.domain}</div>
                    <div className="text-[11px] text-slate-500">{record.signals} signals · {Math.round(record.confidence * 100)}% confidence</div>
                  </div>
                  <ScoreBadge score={record.score} />
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span className={`rounded-full border px-2 py-0.5 ${verdictTone(record.verdict)}`}>{record.verdict.toUpperCase()}</span>
                  <span>Updated {formatTimeAgo(record.lastUpdated)}</span>
                </div>
                {record.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 text-[10px] text-slate-500">
                    {record.tags.slice(0, 5).map((tag) => (
                      <span key={tag} className="rounded-full border border-slate-800/60 px-2 py-0.5">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="text-[10px] text-slate-500">
        Signals are community-sourced heuristics. Combine with Privacy Sentinel findings before taking action.
      </div>
    </div>
  );
}
