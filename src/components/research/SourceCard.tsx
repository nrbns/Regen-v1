import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Info, Sparkles } from 'lucide-react';
import type { ResearchSource } from '../../types/research';

type SourceCardProps = {
  source: ResearchSource;
  index: number;
  isActive: boolean;
  onActivate(sourceKey: string): void;
  onOpen(url: string): void;
};

const SOURCE_LABEL: Record<string, string> = {
  news: 'News',
  academic: 'Academic',
  documentation: 'Docs',
  forum: 'Forum',
  other: 'Web',
};

const BADGE_STYLE: Record<string, string> = {
  news: 'bg-blue-500/10 text-blue-200 border-blue-500/30',
  academic: 'bg-purple-500/10 text-purple-200 border-purple-500/30',
  documentation: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30',
  forum: 'bg-amber-500/10 text-amber-200 border-amber-500/30',
  other: 'bg-slate-500/10 text-slate-200 border-slate-500/30',
};

export function SourceCard({ source, index, isActive, onActivate, onOpen }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const sourceKey = source.url ?? `source-${index}`;
  const provider =
    typeof source.metadata?.provider === 'string' ? source.metadata.provider : undefined;
  const relevance = Number.isFinite(source.relevanceScore) ? source.relevanceScore : null;
  const type = source.sourceType || source.type || 'other';
  const canOpen = Boolean(source.url);
  const fetchedAtLabel = source.fetchedAt ? new Date(source.fetchedAt).toLocaleString() : null;
  const languageLabel = source.lang ? source.lang.toUpperCase() : null;
  const selectorMatched = Boolean(source.metadata?.selectorMatched);

  const preview = useMemo(() => {
    if (expanded) {
      return source.text || source.snippet || source.excerpt || '';
    }
    return (
      source.excerpt ||
      source.snippet ||
      (source.text ? `${source.text.slice(0, 220)}${source.text.length > 220 ? '…' : ''}` : '')
    );
  }, [expanded, source.excerpt, source.snippet, source.text]);

  const handleActivate = () => {
    onActivate(sourceKey);
  };

  return (
    <article
      className={`rounded-2xl border p-4 transition-colors ${
        isActive
          ? 'border-blue-500/50 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.15)]'
          : 'border-white/10 bg-white/[0.02] hover:border-white/20'
      }`}
    >
      <header className="flex flex-wrap items-start gap-3">
        <button type="button" onClick={handleActivate} className="flex-1 text-left">
          <p className="text-xs uppercase tracking-wide text-gray-500">Source {index + 1}</p>
          <h4 className="mt-0.5 text-base font-semibold text-white hover:text-blue-200 transition-colors">
            {source.title || source.url || 'Untitled source'}
          </h4>
          <p className="text-xs text-gray-500">{source.domain || provider || 'unknown-domain'}</p>
        </button>
        <div className="flex flex-col items-end gap-2 text-xs">
          <span
            className={`rounded-full border px-2 py-0.5 capitalize ${BADGE_STYLE[type] ?? BADGE_STYLE.other}`}
          >
            {SOURCE_LABEL[type] ?? SOURCE_LABEL.other}
          </span>
          {provider && (
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-400">
              {provider}
            </span>
          )}
          {relevance !== null && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-gray-300">
              <Sparkles size={12} className="text-blue-200" />
              {Math.round(relevance)}
            </span>
          )}
        </div>
      </header>

      {source.image && (
        <div className="mt-3 h-36 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
          <img
            src={source.image}
            alt={source.title || 'Preview'}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <p className="mt-3 text-sm text-gray-300 leading-relaxed whitespace-pre-line">{preview}</p>

      <footer className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
        {source.wordCount && source.wordCount > 0 && (
          <span className="rounded-full border border-white/10 px-2 py-0.5">
            {source.wordCount.toLocaleString()} words
          </span>
        )}
        {languageLabel && (
          <span className="rounded-full border border-white/10 px-2 py-0.5">
            Lang {languageLabel}
          </span>
        )}
        {source.rendered && (
          <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 text-indigo-200">
            <Info size={11} />
            Rendered
          </span>
        )}
        {source.fromCache && (
          <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-200">
            Cached
          </span>
        )}
        {selectorMatched && (
          <span className="rounded-full border border-blue-400/30 bg-blue-500/10 px-2 py-0.5 text-blue-200">
            Focused extract
          </span>
        )}
        {fetchedAtLabel && (
          <span className="rounded-full border border-white/10 px-2 py-0.5">{fetchedAtLabel}</span>
        )}
      </footer>

      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          onClick={() => canOpen && onOpen(source.url)}
          disabled={!canOpen}
          className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium ${
            canOpen
              ? 'border-white/20 text-white hover:border-blue-400/50 hover:text-blue-100'
              : 'border-white/5 text-gray-500 cursor-not-allowed'
          }`}
        >
          {canOpen ? 'Open source' : 'No link'}
          <ExternalLink size={14} />
        </button>
        <button
          type="button"
          onClick={() => setExpanded(prev => !prev)}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:text-white"
        >
          {expanded ? (
            <>
              Collapse
              <ChevronUp size={14} />
            </>
          ) : (
            <>
              Expand details
              <ChevronDown size={14} />
            </>
          )}
        </button>
      </div>
    </article>
  );
}
