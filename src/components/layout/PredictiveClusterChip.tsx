import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlayCircle, Navigation } from 'lucide-react';

type Cluster = { id: string; label: string; tabIds: string[]; confidence?: number };

type PrefetchEntry = { tabId: string; url: string; reason: string; confidence?: number };

interface PredictiveClusterChipProps {
  clusters: Cluster[];
  summary?: string | null;
  onApply: (clusterId: string) => void;
}

export function PredictiveClusterChip({ clusters, summary, onApply }: PredictiveClusterChipProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!clusters.length) {
      setIndex(0);
    } else if (index >= clusters.length) {
      setIndex(0);
    }
  }, [clusters, index]);

  if (!clusters.length) return null;

  const current = clusters[index];
  const confidence = typeof current.confidence === 'number' ? Math.round(current.confidence * 100) : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="no-drag flex items-center gap-2 mr-3"
    >
      <button
        type="button"
        onClick={() => onApply(current.id)}
        className="flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/15 px-3 py-1.5 text-xs text-blue-100 transition-colors hover:bg-blue-500/25"
        title={summary ?? 'Redix suggests regrouping these tabs into a focused workspace.'}
      >
        <PlayCircle size={12} />
        <span className="font-semibold">Regroup {current.label}</span>
        {confidence !== null && <span className="text-[11px] text-blue-200/80">{confidence}%</span>}
      </button>
      {clusters.length > 1 && (
        <button
          type="button"
          onClick={() => setIndex((prev) => (prev + 1) % clusters.length)}
          className="rounded-full border border-slate-700/60 p-1.5 text-[10px] text-slate-300 transition-colors hover:text-slate-100"
          aria-label="Next suggested cluster"
        >
          ●
        </button>
      )}
    </motion.div>
  );
}

interface PredictivePrefetchHintProps {
  entry: PrefetchEntry | null;
  onOpen: (entry: PrefetchEntry) => void;
}

export function PredictivePrefetchHint({ entry, onOpen }: PredictivePrefetchHintProps) {
  if (!entry) return null;

  let hostLabel = entry.url;
  try {
    hostLabel = new URL(entry.url).hostname.replace(/^www\./, '');
  } catch {
    // keep original url
  }

  const confidence = typeof entry.confidence === 'number' ? Math.round(entry.confidence * 100) : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="no-drag flex items-center gap-2 mr-3"
    >
      <button
        type="button"
        onClick={() => onOpen(entry)}
        className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-100 transition-colors hover:bg-emerald-500/25"
        title={entry.reason}
      >
        <Navigation size={12} />
        <span className="font-semibold">Scout {hostLabel}</span>
        {confidence !== null && <span className="text-[11px] text-emerald-200/80">{confidence}%</span>}
      </button>
    </motion.div>
  );
}
