import { motion, AnimatePresence } from 'framer-motion';
import { PowerMode } from '../../state/powerStore';
import { setPowerMode } from '../../core/redix/power-modes';

type Props = {
  selected: PowerMode;
  effective: 'Performance' | 'Balanced' | 'PowerSave';
  onClose: () => void;
  onSelect: (mode: PowerMode) => void;
};

const MODE_CARDS: Array<{
  id: PowerMode;
  title: string;
  description: string;
  metrics: string;
}> = [
  {
    id: 'Performance',
    title: 'Performance',
    description: 'Full power, no throttling. Ideal when plugged in.',
    metrics: 'Max tabs · High AI throughput',
  },
  {
    id: 'Balanced',
    title: 'Balanced',
    description: 'Smart defaults for everyday browsing.',
    metrics: 'Adaptive caps · Standard prefetch',
  },
  {
    id: 'PowerSave',
    title: 'Power-save',
    description: 'Aggressive throttling to extend battery life.',
    metrics: 'Lower tab caps · Prefetch paused',
  },
  {
    id: 'Auto',
    title: 'Auto',
    description: 'Automatically chooses the best mode using battery signals.',
    metrics: 'Smart switching',
  },
];

export function PowerModeSelector({ selected, effective, onClose, onSelect }: Props) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="w-full max-w-3xl rounded-[32px] border border-white/10 bg-slate-950/90 p-6 shadow-[0_35px_120px_rgba(0,0,0,0.55)]"
        >
          <header className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Power modes</p>
              <h2 className="text-2xl font-semibold text-white">Optimize Redix for the moment</h2>
              <p className="text-sm text-slate-400">
                {selected === 'Auto'
                  ? `Auto is managing power. Currently running ${effective}.`
                  : `Active mode: ${selected}. Switch whenever you need.`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300 hover:border-white/40"
            >
              Close
            </button>
          </header>
          <div className="grid gap-4 md:grid-cols-2">
            {MODE_CARDS.map(card => {
              const isSelected = selected === card.id;
              const isEffective = card.id !== 'Auto' && effective === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => {
                    setPowerMode(card.id);
                    onSelect(card.id);
                  }}
                  className={`flex h-full flex-col items-start gap-2 rounded-3xl border px-4 py-4 text-left transition ${
                    isSelected
                      ? 'border-purple-400/70 bg-purple-500/10 shadow-[0_0_25px_rgba(168,85,247,0.2)]'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-white">{card.title}</p>
                      <p className="text-xs text-slate-400">{card.metrics}</p>
                    </div>
                    {isSelected && (
                      <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-200">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-300">{card.description}</p>
                  {card.id === 'Auto' && isEffective && (
                    <p className="text-xs text-emerald-300">
                      Auto is currently running {effective}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
