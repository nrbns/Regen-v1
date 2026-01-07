import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, ChevronLeft, Layers, Shield, Sparkles, Trash2 } from 'lucide-react';
import type { ComparedAnswer } from '../../state/researchCompareStore';

type CompareAnswersProps = {
  open: boolean;
  answers: ComparedAnswer[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onClose: () => void;
  onRemove: (id: string) => void;
};

export function CompareAnswersPanel({
  open,
  answers,
  selectedIds,
  onToggleSelect,
  onClose,
  onRemove,
}: CompareAnswersProps) {
  const selectedAnswers = selectedIds
    .map(id => answers.find(answer => answer.id === id))
    .filter(Boolean) as ComparedAnswer[];

  const overlapStats = useMemo(() => {
    if (selectedAnswers.length < 2) {
      return { sharedDomains: [] as string[] };
    }
    const [first, second] = selectedAnswers;
    const firstDomains = new Set((first.sources ?? []).map(source => source.domain || source.url));
    const secondDomains = new Set(
      (second.sources ?? []).map(source => source.domain || source.url)
    );
    const sharedDomains = [...firstDomains].filter(domain => domain && secondDomains.has(domain));
    return { sharedDomains };
  }, [selectedAnswers]);

  const differenceSummary = useMemo(() => {
    if (selectedAnswers.length < 2) {
      return [];
    }
    const [first, second] = selectedAnswers;
    return extractUniqueSentences(first.summary, second.summary, first.id, second.id);
  }, [selectedAnswers]);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-[80] max-h-[70vh] overflow-hidden rounded-t-3xl border border-white/10 bg-[#070912]/95 shadow-2xl shadow-black/40 backdrop-blur"
        >
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-sky-300">Compare answers</p>
              <p className="text-sm text-gray-400">{answers.length} saved • select up to 2</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs text-gray-200 hover:border-white/30"
            >
              <ChevronLeft size={14} />
              Close
            </button>
          </div>

          <div className="grid gap-4 border-b border-white/5 px-6 py-4 md:grid-cols-2">
            {answers.length === 0 && (
              <div className="col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-gray-400">
                Save answers from Research Mode to compare them here.
              </div>
            )}
            {answers.map(answer => {
              const isSelected = selectedIds.includes(answer.id);
              return (
                <button
                  key={answer.id}
                  type="button"
                  onClick={() => onToggleSelect(answer.id)}
                  className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                    isSelected
                      ? 'border-sky-500/60 bg-sky-500/10 shadow-[0_0_35px_rgba(56,189,248,0.2)]'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(answer.createdAt).toLocaleString()}</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-300">
                      <Shield size={12} className="text-emerald-300" />
                      {(answer.provider || answer.model || 'ai').toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-gray-200">{answer.summary}</p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-400">
                    <span>{answer.sources.length} sources</span>
                    <span>•</span>
                    <span>Authority bias {answer.settings.authorityBias}%</span>
                    <span>•</span>
                    <span>{answer.settings.region}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-sky-300">
                      {isSelected ? 'Selected' : 'Tap to select'}
                    </span>
                    <button
                      type="button"
                      onClick={event => {
                        event.stopPropagation();
                        onRemove(answer.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-red-500/30 px-2 py-0.5 text-[10px] uppercase tracking-wide text-red-200 hover:border-red-400"
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 px-6 py-4 md:grid-cols-2">
            {selectedAnswers.length === 0 && (
              <div className="col-span-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-gray-400">
                Select two answers above to view a detailed comparison.
              </div>
            )}

            {selectedAnswers.slice(0, 2).map(answer => (
              <div
                key={answer.id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
              >
                <header className="flex items-center justify-between text-xs text-gray-400">
                  <span className="inline-flex items-center gap-1 text-white">
                    <Sparkles size={12} className="text-sky-300" />
                    {answer.query}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(answer.createdAt).toLocaleTimeString()}
                  </span>
                </header>
                <p className="mt-3 text-sm text-gray-200 whitespace-pre-line">{answer.summary}</p>
                <div className="mt-3 grid gap-2 text-xs text-gray-400 sm:grid-cols-3">
                  <StatBlock label="Confidence" value={formatPercent(answer.confidence)} />
                  <StatBlock label="Sources" value={`${answer.sources.length}`} />
                  <StatBlock
                    label="Settings"
                    value={`${answer.settings.authorityBias}% authority`}
                  />
                </div>
              </div>
            ))}

            {selectedAnswers.length >= 2 && (
              <>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Layers size={14} className="text-sky-300" />
                    Shared sources ({overlapStats.sharedDomains.length})
                  </h4>
                  <ul className="mt-3 space-y-1 text-xs text-gray-300">
                    {overlapStats.sharedDomains.length > 0 ? (
                      overlapStats.sharedDomains.map(domain => (
                        <li key={domain} className="rounded border border-white/10 px-2 py-1">
                          {domain}
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-500">No overlapping domains.</li>
                    )}
                  </ul>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <h4 className="text-sm font-semibold text-white">Unique takeaways</h4>
                  <ul className="mt-3 space-y-2 text-sm text-gray-300">
                    {differenceSummary.length > 0 ? (
                      differenceSummary.map(diff => (
                        <li key={diff.text} className="rounded border border-white/10 px-3 py-2">
                          <span className="text-[11px] uppercase tracking-wide text-sky-300">
                            {diff.owner === selectedAnswers[0].id ? 'Answer A' : 'Answer B'}
                          </span>
                          <p className="text-gray-200">{diff.text}</p>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-500">Summaries are largely aligned.</li>
                    )}
                  </ul>
                </div>
              </>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

type StatBlockProps = {
  label: string;
  value?: string;
};

function StatBlock({ label, value }: StatBlockProps) {
  return (
    <div className="rounded border border-white/10 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-white">{value ?? '—'}</p>
    </div>
  );
}

function formatPercent(value?: number) {
  if (typeof value !== 'number') {
    return '—';
  }
  return `${Math.round(value * 100)}%`;
}

function extractUniqueSentences(
  a: string,
  b: string,
  ownerA: string,
  ownerB: string
): Array<{ owner: string; text: string }> {
  const sentencesA = normalizeSentences(a).map(text => ({ id: `a-${text}`, text }));
  const sentencesB = normalizeSentences(b).map(text => ({ id: `b-${text}`, text }));
  const setA = new Set(sentencesA.map(sentence => sentence.text));
  const setB = new Set(sentencesB.map(sentence => sentence.text));
  const uniques: Array<{ owner: string; text: string }> = [];

  sentencesA.forEach(sentence => {
    if (!setB.has(sentence.text)) {
      uniques.push({ owner: ownerA, text: sentence.text });
    }
  });

  sentencesB.forEach(sentence => {
    if (!setA.has(sentence.text)) {
      uniques.push({ owner: ownerB, text: sentence.text });
    }
  });

  return uniques.slice(0, 6);
}

function normalizeSentences(paragraph: string): string[] {
  return paragraph
    .split(/(?<=[.!?])\s+/)
    .map(sentence => sentence.trim())
    .filter(Boolean);
}
