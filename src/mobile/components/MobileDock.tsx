import { motion } from 'framer-motion';
import { Globe, FlaskConical, LineChart, Library, Bot } from 'lucide-react';

type ModeId = 'Browse' | 'Research' | 'Trade';

interface MobileDockProps {
  activeMode: ModeId;
  onSelectMode: (mode: ModeId) => void;
  onOpenLibrary: () => void;
  onOpenAgent: () => void;
}

const navItems: Array<{
  id: ModeId;
  label: string;
  icon: React.ComponentType<{ size?: number | string }>;
}> = [
  { id: 'Browse', label: 'Browse', icon: Globe },
  { id: 'Research', label: 'Research', icon: FlaskConical },
  { id: 'Trade', label: 'Trade', icon: LineChart },
];

export function MobileDock({
  activeMode,
  onSelectMode,
  onOpenLibrary,
  onOpenAgent,
}: MobileDockProps) {
  return (
    <motion.nav
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 120, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3"
    >
      <div className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-950/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = item.id === activeMode;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectMode(item.id)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-semibold transition ${
                isActive
                  ? 'text-emerald-300 bg-emerald-500/10'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
              aria-pressed={isActive}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenLibrary}
          className="flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-semibold text-slate-400 transition hover:text-slate-100"
        >
          <Library size={20} />
          <span>Library</span>
        </button>

        <button
          type="button"
          onClick={onOpenAgent}
          className="flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-[11px] font-semibold text-slate-400 transition hover:text-slate-100"
        >
          <Bot size={20} />
          <span>Agent</span>
        </button>
      </div>
    </motion.nav>
  );
}
