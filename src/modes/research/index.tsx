// @ts-nocheck

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Info, RefreshCcw, ChevronRight } from 'lucide-react';
import { useSettingsStore } from '../../state/settingsStore';
import VoiceButton from '../../components/VoiceButton';
import { ipc } from '../../lib/ipc-typed';
import { useTabsStore } from '../../state/tabsStore';
import {
  ResearchResult,
  ResearchSource,
  ResearchSourceType,
  VerificationResult,
  ResearchInlineEvidence,
} from '../../types/research';
import { ContainerInfo } from '../../lib/ipc-events';
import { useContainerStore } from '../../state/containerStore';
import { ResearchGraphView } from '../../components/research/ResearchGraphView';

export default function ResearchPanel() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [includeCounterpoints, setIncludeCounterpoints] = useState(false);
  const [authorityBias, setAuthorityBias] = useState(50); // 0 = recency, 100 = authority
  const [region, setRegion] = useState<RegionOption>('global');
  const [graphData, setGraphData] = useState<any>(null);
  const [showGraph, setShowGraph] = useState(true);
  const { activeId } = useTabsStore();
  const useHybridSearch = useSettingsStore((s) => s.searchEngine !== 'mock');
  const { containers, activeContainerId, setContainers } = useContainerStore();
  const graphSignatureRef = useRef<string>('');

  useEffect(() => {
    if (containers.length === 0) {
      ipc.containers
        .list()
        .then((list) => {
          if (Array.isArray(list)) {
            setContainers(list as ContainerInfo[]);
          }
        })
        .catch((err) => {
          console.warn('[Research] Failed to load containers for badge', err);
        });
    }
  }, [containers.length, setContainers]);

  const queryKey = useMemo(
    () => (result?.query ? buildQueryKey(result.query) : null),
    [result?.query],
  );

  const refreshGraph = useCallback(async () => {
    if (typeof window === 'undefined' || !window.graph?.all) return;
    try {
      const snapshot = await window.graph.all();
      if (snapshot && Array.isArray(snapshot.nodes)) {
        setGraphData(snapshot);
      }
    } catch (err) {
      console.warn('[Research] Failed to load graph snapshot', err);
    }
  }, []);

  const recencyWeight = useMemo(() => (100 - authorityBias) / 100, [authorityBias]);
  const authorityWeight = useMemo(() => authorityBias / 100, [authorityBias]);

  const handleSearch = async (input?: string) => {
    const searchQuery = typeof input === 'string' ? input : query;
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveSourceId(null);

    try {
      if (!useHybridSearch) {
        setResult(generateMockResult(searchQuery));
        return;
      }

      const response = await ipc.research.queryEnhanced(searchQuery, {
        maxSources: 12,
        includeCounterpoints,
        region: region !== 'global' ? region : undefined,
        recencyWeight,
        authorityWeight,
      });
      setResult(response);
    } catch (err) {
      console.error('Research query failed:', err);
      setError('Unable to complete the research request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshGraph();
  }, [refreshGraph]);

  useEffect(() => {
    if (!result || typeof window === 'undefined' || !window.graph?.add) return;

    const signature = JSON.stringify({
      query: result.query,
      sources: result.sources.map((source) => source.url || source.title),
      citations: result.citations?.length ?? 0,
      evidence: (result.inlineEvidence ?? []).length,
    });

    if (graphSignatureRef.current === signature) {
      void refreshGraph();
      return;
    }

    graphSignatureRef.current = signature;
    const currentQueryKey = buildQueryKey(result.query);

    const queryEdges = result.sources.map((source, idx) => ({
      src: currentQueryKey,
      dst: buildSourceKey(source, idx),
      rel: 'supports',
      weight: Math.round(source.relevanceScore || 40),
    }));

    window.graph.add(
      {
        key: currentQueryKey,
        type: 'research-query',
        title: result.query.slice(0, 160),
        meta: {
          query: result.query,
          createdAt: Date.now(),
        },
      },
      queryEdges,
    );

    result.sources.forEach((source, idx) => {
      const sourceKey = buildSourceKey(source, idx);
      const relatedEvidence = (result.inlineEvidence ?? [])
        .filter((item) => item.sourceIndex === idx)
        .slice(0, 6);

      const evidenceEdges = relatedEvidence.map((item) => ({
        src: sourceKey,
        dst: buildEvidenceKey(sourceKey, item.citationIndex ?? item.from ?? idx),
        rel: 'evidence',
        weight: 1,
      }));

      window.graph.add(
        {
          key: sourceKey,
          type: 'research-source',
          title: source.title,
          meta: {
            url: source.url,
            domain: source.domain,
            snippet: source.snippet || source.text?.slice(0, 140),
            relevance: source.relevanceScore,
          },
        },
        evidenceEdges,
      );

      relatedEvidence.forEach((item) => {
        const evidenceKey = buildEvidenceKey(sourceKey, item.citationIndex ?? item.from ?? idx);
        const citation = result.citations?.find((entry) => entry.index === item.citationIndex);
        window.graph.add({
          key: evidenceKey,
          type: 'research-evidence',
          title: citation?.quote || item.quote || 'Highlighted evidence',
          meta: {
            sourceKey,
            snippet: citation?.quote || item.quote,
            fragmentUrl: (item as any)?.quoteUrl || source.url,
          },
        });
      });
    });

    (result.contradictions ?? []).forEach((contradiction) => {
      if (!Array.isArray(contradiction.sources) || contradiction.sources.length < 2) return;
      const [first, ...rest] = contradiction.sources;
      const baseSource = result.sources[first];
      if (!baseSource) return;
      const baseKey = buildSourceKey(baseSource, first);
      rest.forEach((targetIdx) => {
        const targetSource = result.sources[targetIdx];
        if (!targetSource) return;
        const targetKey = buildSourceKey(targetSource, targetIdx);
        window.graph.add(
          { key: baseKey, type: 'research-source' },
          [
            {
              src: baseKey,
              dst: targetKey,
              rel: 'contradicts',
              weight: contradiction.severityScore ?? (contradiction.disagreement === 'major' ? 2 : 1),
            },
          ],
        );
      });
    });

    void refreshGraph();
  }, [result, refreshGraph]);

  const handleOpenUrl = async (url: string) => {
    try {
      if (activeId) {
        await ipc.tabs.navigate(activeId, url);
      } else {
        await ipc.tabs.create(url);
      }
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  };

  const handleRunExample = (example: string) => {
    setQuery(example);
    void handleSearch(example);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#0f111a] text-gray-100">
      <header className="border-b border-white/5 bg-black/20 backdrop-blur">
        <div className="flex items-center justify-between px-6 pt-6 pb-3">
          <div>
            <h1 className="text-xl font-semibold text-white">Research Mode</h1>
            <p className="text-sm text-gray-400">
              Aggregate evidence, generate traceable answers, and surface counterpoints without leaving the browser.
            </p>
          </div>
          <ActiveContainerBadge containers={containers} activeContainerId={activeContainerId} />
        </div>

        <div className="px-6 pb-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await handleSearch();
            }}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-inner shadow-black/40 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all"
          >
            <input
              className="flex-1 bg-transparent text-base text-white placeholder:text-gray-500 focus:outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question, compare claims, or request a briefing…"
              disabled={loading}
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-gray-100 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? 'Researching…' : 'Run research'}
              </button>
              <VoiceButton
                onResult={(text) => {
                  setQuery(text);
                  setTimeout(() => handleSearch(text), 120);
                }}
                small
              />
            </div>
          </form>
        </div>
      </header>

      <main className="flex h-[calc(100%-152px)] gap-6 overflow-hidden px-6 pb-6">
        <section className="relative flex-1 overflow-hidden rounded-2xl border border-white/5 bg-[#111422] shadow-xl shadow-black/30">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
          <div className="flex h-full flex-col space-y-4 p-5">
            <ResearchControls
              authorityBias={authorityBias}
              includeCounterpoints={includeCounterpoints}
              region={region}
              loading={loading}
              onAuthorityBiasChange={setAuthorityBias}
              onIncludeCounterpointsChange={setIncludeCounterpoints}
              onRegionChange={(value) => setRegion(value)}
            />

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 backdrop-blur">
                {error}
              </div>
            )}

            {loading && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-gray-400">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-blue-200">
                  <Sparkles size={14} className="animate-pulse" />
                  Gathering sources and evaluating evidence…
                </div>
                <p className="text-xs text-gray-500">
                  Cross-checking accuracy, bias, and contradictions before presenting the answer.
                </p>
              </div>
            )}

            {!loading && result && (
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                <ResearchResultView
                  result={result}
                  onOpenSource={handleOpenUrl}
                  activeSourceId={activeSourceId}
                  onActiveSourceChange={setActiveSourceId}
                />
                <ResearchGraphSection
                  showGraph={showGraph}
                  onToggleGraph={() => setShowGraph((prev) => !prev)}
                  query={result.query}
                  queryKey={queryKey}
                  graphData={graphData}
                  activeSourceId={activeSourceId}
                  onSelectSource={setActiveSourceId}
                  onOpenSource={handleOpenUrl}
                />
              </div>
            )}

            {!loading && !result && !error && (
              <EmptyState onRunExample={handleRunExample} />
            )}
          </div>
        </section>

        <InsightsSidebar
          result={result}
          loading={loading}
          onOpenSource={handleOpenUrl}
          activeSourceId={activeSourceId}
          onSelectSource={setActiveSourceId}
        />
      </main>
    </div>
  );
}

type RegionOption = 'global' | 'us' | 'uk' | 'eu' | 'asia' | 'custom';

const REGION_OPTIONS: Array<{ value: RegionOption; label: string }> = [
  { value: 'global', label: 'Global' },
  { value: 'us', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'eu', label: 'Europe' },
  { value: 'asia', label: 'Asia Pacific' },
];

const SOURCE_BADGE_STYLES: Record<ResearchSourceType, string> = {
  news: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  academic: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  documentation: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  forum: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  other: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
};

interface ResearchControlsProps {
  authorityBias: number;
  includeCounterpoints: boolean;
  region: RegionOption;
  loading: boolean;
  onAuthorityBiasChange(value: number): void;
  onIncludeCounterpointsChange(value: boolean): void;
  onRegionChange(value: RegionOption): void;
}

function ResearchControls({
  authorityBias,
  includeCounterpoints,
  region,
  loading,
  onAuthorityBiasChange,
  onIncludeCounterpointsChange,
  onRegionChange,
}: ResearchControlsProps) {
  return (
    <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-xs text-gray-200 shadow-inner shadow-black/30 sm:grid-cols-[minmax(0,_1fr)_auto_auto]">
      <div className="space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Recency vs authority
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-gray-500">Recency</span>
          <div className="relative flex-1">
            <input
              type="range"
              min={0}
              max={100}
              value={authorityBias}
              disabled={loading}
              onChange={(e) => onAuthorityBiasChange(Number(e.target.value))}
              className="h-1 w-full cursor-pointer accent-blue-500 disabled:opacity-40"
            />
          </div>
          <span className="text-[11px] text-gray-500">Authority</span>
          <span className="rounded border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-200">
            {authorityBias}%
          </span>
        </div>
      </div>

      <label className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-[11px]">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 rounded border-white/20 bg-transparent text-blue-500 focus:ring-blue-500 disabled:opacity-40"
          checked={includeCounterpoints}
          disabled={loading}
          onChange={(e) => onIncludeCounterpointsChange(e.target.checked)}
        />
        Include counterpoints
      </label>

      <label className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-[11px]">
        Region
        <select
          value={region}
          disabled={loading}
          onChange={(e) => onRegionChange(e.target.value as RegionOption)}
          className="rounded border border-white/10 bg-[#0c0e18] px-2 py-1 text-[11px] text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-0 disabled:opacity-40"
        >
          {REGION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

interface ResearchResultViewProps {
  result: ResearchResult;
  activeSourceId: string | null;
  onActiveSourceChange(sourceKey: string): void;
  onOpenSource(url: string): void;
}

function ResearchResultView({
  result,
  activeSourceId,
  onActiveSourceChange,
  onOpenSource,
}: ResearchResultViewProps) {
  const confidencePercent = Math.round(result.confidence * 100);
  const verification = result.verification;
  const getSourceKey = (sourceIndex: number) => {
    const source = result.sources[sourceIndex];
    return source?.url ?? `source-${sourceIndex}`;
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/5 bg-white/5 px-6 py-5 shadow-inner shadow-black/30">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">AI answer with citations</h2>
            <p className="text-xs text-gray-400">
              {result.sources.length} sources considered • Confidence {confidencePercent}%
            </p>
          </div>
          {verification && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                verification.verified
                  ? 'border border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                  : 'border border-amber-500/50 bg-amber-500/10 text-amber-200'
              }`}
            >
              {verification.verified ? 'Verified' : 'Needs review'}
            </span>
          )}
        </header>
        <AnswerWithCitations
          summary={result.summary}
          citations={result.citations}
          inlineEvidence={result.inlineEvidence}
          sources={result.sources}
          activeSourceId={activeSourceId}
          onActivate={onActiveSourceChange}
          onOpenSource={onOpenSource}
        />

        {result.citations.length > 0 && (
          <div className="mt-5 rounded-xl border border-white/5 bg-[#1a1d2a] px-4 py-3">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Citations
            </h3>
            <ul className="space-y-2">
              {result.citations.map((citation) => {
                const source = result.sources[citation.sourceIndex];
                const sourceKey = getSourceKey(citation.sourceIndex);
                const isActive = activeSourceId === sourceKey;
                if (!source) return null;
                return (
                  <li
                    key={citation.index}
                    className={`rounded-lg border px-3 py-2 text-xs transition-colors ${
                      isActive
                        ? 'border-blue-500/40 bg-blue-500/10 text-blue-100'
                        : 'border-white/5 bg-white/[0.02] text-gray-300 hover:border-blue-400/40 hover:bg-blue-400/5'
                    }`}
                  >
                    <button
                      className="font-semibold text-indigo-300 hover:text-indigo-200"
                      onClick={() => {
                        onActiveSourceChange(sourceKey);
                        onOpenSource(source.url);
                      }}
                    >
                      [{citation.index}] {source.title}
                    </button>
                    <div className="text-[11px] text-gray-500">
                      Confidence {(citation.confidence * 100).toFixed(0)}% • {source.domain}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {verification && (
        <VerificationSummary verification={verification} />
      )}

      <SourcesList
        sources={result.sources}
        activeSourceId={activeSourceId}
        onActivate={onActiveSourceChange}
        onOpenSource={onOpenSource}
      />
    </div>
  );
}

const importanceLabel = {
  high: 'Critical evidence',
  medium: 'Supporting evidence',
  low: 'Context',
} as const;

function InsightsSidebar({
  result,
  loading,
  onOpenSource,
  activeSourceId,
  onSelectSource,
}: {
  result: ResearchResult | null;
  loading: boolean;
  onOpenSource(url: string): void;
  activeSourceId: string | null;
  onSelectSource(sourceKey: string): void;
}) {
  if (loading) {
    return (
      <aside className="w-[310px] shrink-0 space-y-4 overflow-y-auto rounded-2xl border border-white/5 bg-[#0f1220] p-4 shadow-inner shadow-black/50">
        <div className="h-20 animate-pulse rounded-xl bg-white/5" />
        <div className="h-32 animate-pulse rounded-xl bg-white/5" />
        <div className="h-32 animate-pulse rounded-xl bg-white/5" />
      </aside>
    );
  }

  if (!result) {
    return (
      <aside className="w-[310px] shrink-0 overflow-y-auto rounded-2xl border border-white/5 bg-[#0f1220] p-5 shadow-inner shadow-black/50">
        <div className="space-y-4 text-sm text-gray-400">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-gray-300">
            <p className="flex items-center gap-2 text-gray-200">
              <Sparkles size={14} className="text-blue-300" />
              Try questions that need multiple independent sources.
            </p>
          </div>
          <EmptyState onRunExample={onSelectSource as unknown as (example: string) => void} minimal />
        </div>
      </aside>
    );
  }

  const topEvidence = (result.evidence ?? []).slice(0, 3);
  const contradictions = (result.contradictions ?? []).slice(0, 2);
  const activeEvidenceKey = activeSourceId;

  return (
    <aside className="w-[310px] shrink-0 space-y-4 overflow-y-auto rounded-2xl border border-white/5 bg-[#0f1220] p-5 shadow-inner shadow-black/50">
      <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Confidence</span>
          <span className="text-sm font-semibold text-blue-200">
            {(result.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded bg-white/10">
          <div
            className="h-full rounded bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
            style={{ width: `${Math.min(100, Math.max(0, result.confidence * 100))}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-500">
          {result.sources.length} vetted sources • {result.citations.length} inline citations
        </p>
        <button
          className="inline-flex items-center gap-2 rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-gray-300 hover:border-blue-400/40 hover:text-blue-200"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <RefreshCcw size={12} />
          Adjust research settings
        </button>
      </div>

      {topEvidence.length > 0 && (
        <div className="space-y-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.07] px-4 py-3">
          <div className="flex items-center justify-between gap-2 text-xs text-blue-100">
            <span className="font-semibold uppercase tracking-wide">Key evidence</span>
            <span>{topEvidence.length} of {(result.evidence ?? []).length}</span>
          </div>
          <div className="space-y-2 text-xs text-blue-100/90">
            {topEvidence.map((item) => {
              const source = result.sources[item.sourceIndex];
              if (!source) return null;
              const sourceKey = source.url ?? `source-${item.sourceIndex}`;
              const isActive = activeEvidenceKey === sourceKey;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectSource(sourceKey);
                    onOpenSource(item.fragmentUrl || source.url);
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    isActive ? 'border-blue-300 bg-blue-400/20' : 'border-blue-400/30 hover:bg-blue-400/15'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide text-blue-200/80">
                    <span>{importanceLabel[item.importance]}</span>
                    <span>{source.domain}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-blue-50/90 line-clamp-3">{item.quote}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {contradictions.length > 0 && (
        <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3">
          <div className="flex items-center justify-between text-xs text-amber-100">
            <span className="font-semibold uppercase tracking-wide">Contradictions</span>
            <span>{contradictions.length}</span>
          </div>
          <ul className="space-y-2 text-[11px] text-amber-50/90">
            {contradictions.map((item, index) => {
              const severity = item.disagreement === 'major' ? 'Major' : 'Minor';
              return (
                <li key={`${item.claim}-${index}`} className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-amber-100">{item.claim}</span>
                    <span className="text-amber-200">{severity}</span>
                  </div>
                  <p className="mt-1 text-amber-100/70">{item.summary || 'Investigate differing positions.'}</p>
                  <button
                    onClick={() => {
                      const firstSource = item.sources[0];
                      if (typeof firstSource === 'number') {
                        const source = result.sources[firstSource];
                        if (source) {
                          onSelectSource(source.url ?? `source-${firstSource}`);
                          onOpenSource(source.url);
                        }
                      }
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-200 hover:text-amber-100"
                  >
                    View sources
                    <ChevronRight size={12} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {result.biasProfile && (
        <div className="space-y-2 rounded-xl border border-sky-500/20 bg-sky-500/[0.06] px-4 py-3 text-xs text-sky-100">
          <div className="flex items-center justify-between">
            <span className="font-semibold uppercase tracking-wide">Bias snapshot</span>
            <span>{result.biasProfile.authorityBias}% authority</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded bg-sky-500/20">
            <div
              className="h-full bg-gradient-to-r from-sky-500 via-blue-500 to-purple-500"
              style={{ width: `${result.biasProfile.authorityBias}%` }}
            />
          </div>
          <div className="space-y-1 pt-2">
            {result.biasProfile.domainMix.slice(0, 3).map((entry) => (
              <div key={entry.type} className="flex items-center justify-between text-[11px]">
                <span>{capitalize(entry.type)}</span>
                <span>{entry.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.taskChains && result.taskChains.length > 0 && (
        <div className="space-y-2 rounded-xl border border-purple-500/20 bg-purple-500/[0.07] px-4 py-3">
          <div className="flex items-center justify-between text-xs text-purple-100">
            <span className="font-semibold uppercase tracking-wide">Next checks</span>
            <span>{result.taskChains.length}</span>
          </div>
          <ol className="space-y-2 text-[11px] text-purple-50/80">
            {result.taskChains.flatMap((chain) => chain.steps)
              .filter((step) => step.status !== 'done')
              .slice(0, 3)
              .map((step) => (
                <li key={step.id} className="rounded-lg border border-purple-400/30 bg-purple-400/10 px-3 py-2">
                  <span className="font-semibold text-purple-100">{step.title}</span>
                  <p className="text-purple-100/70">{step.description}</p>
                </li>
              ))}
          </ol>
        </div>
      )}
    </aside>
  );
}

function ActiveContainerBadge({
  containers,
  activeContainerId,
}: {
  containers: ContainerInfo[];
  activeContainerId: string;
}) {
  const activeContainer =
    containers.find((container) => container.id === activeContainerId) ??
    containers.find((container) => container.id === 'default');

  if (!activeContainer) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-200 shadow-inner shadow-black/20">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: activeContainer.color ?? '#6366f1' }}
      />
      <span className="font-medium">{activeContainer.name}</span>
      <span className="text-[10px] uppercase tracking-wide text-gray-400">
        {capitalize(activeContainer.scope ?? 'session')}
      </span>
    </div>
  );
}

function EmptyState({
  onRunExample,
  minimal = false,
}: {
  onRunExample: (example: string) => void;
  minimal?: boolean;
}) {
  const examples = [
    'Compare claims about Mediterranean diet heart benefits.',
    'Does remote work hurt productivity? Provide counterpoints.',
    'Summarize AI safety regulations as of 2025 with sources.',
  ];

  if (minimal) {
    return (
      <ul className="space-y-2 text-xs text-gray-400">
        {examples.slice(0, 2).map((example) => (
          <li key={example}>
            <button
              className="text-left text-gray-300 hover:text-blue-200"
              onClick={() => onRunExample(example)}
            >
              {example}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-10 py-14 text-center text-sm text-gray-400">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-blue-300">
        <Info size={20} />
      </div>
      <div>
        <p className="font-medium text-gray-200">Ready when you are.</p>
        <p className="text-sm text-gray-400">
          Ask for a briefing, compare opposing claims, or verify a statement with live evidence.
        </p>
      </div>
      <div className="space-y-2 text-sm">
        {examples.map((example) => (
          <button
            key={example}
            onClick={() => onRunExample(example)}
            className="block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-gray-200 hover:border-blue-400/40 hover:bg-blue-400/10"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}

function SourcesList({
  sources,
  activeSourceId,
  onActivate,
  onOpenSource,
}: {
  sources: ResearchSource[];
  activeSourceId: string | null;
  onActivate(sourceKey: string): void;
  onOpenSource(url: string): void;
}) {
  if (!sources || sources.length === 0) return null;
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">
          Sources ({sources.length})
        </h3>
        <span className="text-xs text-gray-500">
          Ranked by relevance & consensus
        </span>
      </header>
      <ul className="divide-y divide-white/5">
        {sources.map((source, idx) => {
          const sourceKey = source.url ?? `source-${idx}`;
          const isActive = activeSourceId === sourceKey;
          return (
            <li
              key={source.url || idx}
              className={`p-4 space-y-2 transition-colors ${
                isActive ? 'bg-blue-500/10' : 'hover:bg-white/5'
              }`}
            >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-medium text-gray-200">{source.title}</span>
                <span className="text-xs text-gray-500">{source.domain}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`px-2 py-0.5 rounded-full border ${SOURCE_BADGE_STYLES[source.sourceType]}`}
                >
                  {source.sourceType}
                </span>
                <span className="text-gray-400">
                  Relevance {source.relevanceScore.toFixed(0)}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              {source.snippet || source.text.slice(0, 200)}
              {source.text.length > 200 ? '…' : ''}
            </p>
            <button
              className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
              onClick={() => {
                onActivate(sourceKey);
                onOpenSource(source.url);
              }}
            >
              Open source ↗
            </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}


function ResearchGraphSection({
  showGraph,
  onToggleGraph,
  query,
  queryKey,
  graphData,
  activeSourceId,
  onSelectSource,
  onOpenSource,
}: {
  showGraph: boolean;
  onToggleGraph(): void;
  query: string;
  queryKey: string | null;
  graphData: any;
  activeSourceId: string | null;
  onSelectSource(sourceKey: string): void;
  onOpenSource(url: string): void;
}) {
  const hasGraphData =
    graphData &&
    Array.isArray(graphData.nodes) &&
    graphData.nodes.some((node: any) => typeof node?.type === 'string' && node.type.startsWith('research-'));

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 shadow-inner shadow-black/20">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Knowledge graph</h3>
          <p className="text-xs text-gray-400">
            Connections for “{query.slice(0, 60)}
            {query.length > 60 ? '…' : ''}” across sources and evidence.
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleGraph}
          className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-gray-200 hover:border-blue-400/40 hover:text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
        >
          {showGraph ? 'Hide graph' : 'Show graph'}
        </button>
      </header>
      {showGraph ? (
        <ResearchGraphView
          query={query}
          queryKey={queryKey}
          graphData={graphData}
          activeSourceId={activeSourceId}
          onSelectSource={onSelectSource}
          onOpenSource={onOpenSource}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center text-xs text-gray-400">
          Graph hidden. Toggle “Show graph” to explore relationships again.
        </div>
      )}

      {!hasGraphData && showGraph && (
        <div className="mt-3 rounded-lg border border-white/10 bg-blue-500/5 px-3 py-2 text-[11px] text-blue-200">
          First research run captured. Subsequent questions will layer onto this graph for deeper context.
        </div>
      )}
    </section>
  );
}


interface VerificationSummaryProps {
  verification: VerificationResult;
}

function VerificationSummary({ verification }: VerificationSummaryProps) {
  if (!verification) return null;
  return (
    <section className="rounded border border-neutral-800 bg-neutral-900/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-200">
          Verification summary
        </h3>
        <span
          className={`text-xs font-medium px-2 py-1 rounded border ${
            verification.verified
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
          }`}
        >
          {verification.verified ? 'Pass' : 'Review suggested'}
        </span>
      </div>

      <div className="grid gap-3 text-xs text-gray-300 sm:grid-cols-4">
        <Metric label="Claim density" value={`${verification.claimDensity.toFixed(1)} / 100 words`} />
        <Metric label="Citation coverage" value={`${verification.citationCoverage.toFixed(0)}%`} />
        <Metric label="Hallucination risk" value={`${(verification.hallucinationRisk * 100).toFixed(0)}%`} />
        <Metric label="Ungrounded claims" value={`${verification.ungroundedClaims.length}`} />
      </div>

      {verification.ungroundedClaims.length > 0 && (
        <details className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
          <summary className="cursor-pointer font-semibold text-amber-300">
            Ungrounded claims ({verification.ungroundedClaims.length})
          </summary>
          <ul className="mt-2 space-y-1 text-[11px] text-amber-100">
            {verification.ungroundedClaims.map((claim, idx) => (
              <li key={`${claim.position}-${idx}`}>
                <span className="font-medium capitalize">{claim.severity}</span>: {claim.text}
              </li>
            ))}
          </ul>
        </details>
      )}

      {verification.suggestions.length > 0 && (
        <div className="space-y-1 text-xs text-gray-300">
          <h4 className="font-semibold text-gray-200">Suggestions</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            {verification.suggestions.map((suggestion, idx) => (
              <li key={`${suggestion}-${idx}`}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded border border-neutral-800 bg-neutral-950/60 p-3">
      <span className="text-[11px] uppercase tracking-wide text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-200">{value}</span>
    </div>
  );
}

function normaliseMockSnippet(snippet: string): string {
  if (!snippet) return '';
  const cleaned = snippet.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const sentence = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function composeMockSummary(
  segments: Array<{ text: string; sourceIndex: number; quote: string }>,
  sources: ResearchSource[],
) {
  let summaryBuilder = '';
  const inlineEvidence: ResearchInlineEvidence[] = [];
  const citations: ResearchResult['citations'] = [];
  let cursor = 0;

  segments.forEach((segment, idx) => {
    const isNewParagraph = idx > 0 && idx % 2 === 0;
    if (idx > 0) {
      const separator = isNewParagraph ? '\n\n' : ' ';
      summaryBuilder += separator;
      cursor += separator.length;
    }

    const from = cursor;
    summaryBuilder += segment.text;
    const to = cursor + segment.text.length;
    const citationIndex = idx + 1;

    inlineEvidence.push({
      from,
      to,
      citationIndex,
      sourceIndex: segment.sourceIndex,
      quote: segment.quote,
    });

    const source = sources[segment.sourceIndex];
    const confidence = source ? Math.min(1, Math.max(0.2, (source.relevanceScore || 40) / 80)) : 0.5;
    citations.push({
      index: citationIndex,
      sourceIndex: segment.sourceIndex,
      quote: segment.quote.slice(0, 140),
      confidence,
    });

    cursor = to;
  });

  const summary = summaryBuilder.trim();
  const uniqueSources = Array.from(new Set(segments.map((segment) => segment.sourceIndex)));
  const avgRelevance = uniqueSources.reduce(
    (acc, idx) => acc + (sources[idx]?.relevanceScore ?? 50),
    0,
  ) / Math.max(1, uniqueSources.length);
  const confidence = Math.max(0.35, Math.min(1, (avgRelevance / 60) * Math.min(1, uniqueSources.length / 3)));

  return { summary, inlineEvidence, citations, confidence };
}

function generateMockResult(query: string): ResearchResult {
  const mockSources: ResearchSource[] = [
    {
      url: 'https://example.com/research',
      title: `Overview of ${query}`,
      text: `Mock content discussing ${query}.`,
      snippet: `A concise overview of ${query} with supporting context.`,
      domain: 'example.com',
      relevanceScore: 68,
      sourceType: 'documentation',
      timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
    },
    {
      url: 'https://knowledge.example.org/article',
      title: `In-depth analysis of ${query}`,
      text: `Extended mock analysis for ${query}.`,
      snippet: `Detailed analysis exploring key aspects of ${query}.`,
      domain: 'knowledge.example.org',
      relevanceScore: 72,
      sourceType: 'academic',
      timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
    },
  ];

  const segments = mockSources.map((source, idx) => ({
    text: normaliseMockSnippet(source.snippet || source.text),
    sourceIndex: idx,
    quote: source.snippet || source.text.slice(0, 140),
  }));

  const { summary, inlineEvidence, citations, confidence } = composeMockSummary(segments, mockSources);

  const mockVerification: VerificationResult = {
    verified: true,
    claimDensity: 8.5,
    citationCoverage: 92,
    ungroundedClaims: [],
    hallucinationRisk: 0.1,
    suggestions: ['Mock verification successful.'],
  };

  return {
    query,
    sources: mockSources,
    summary,
    citations,
    confidence,
    verification: mockVerification,
    inlineEvidence,
  };
}

function simpleHash(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function buildQueryKey(query: string) {
  return `research-query:${simpleHash(query.slice(0, 256))}`;
}

function buildSourceKey(source: ResearchSource, index: number) {
  if (source?.url) return source.url;
  return `research-source:${index}:${simpleHash(source?.title || String(index))}`;
}

function buildEvidenceKey(sourceKey: string, id: number) {
  return `${sourceKey}#evidence:${id}`;
}

