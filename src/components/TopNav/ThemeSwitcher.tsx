import { LayoutGroup, motion } from 'framer-motion';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../state/themeStore';

const OPTIONS: Array<{
  id: 'system' | 'light' | 'dark';
  label: string;
  icon: typeof Monitor;
}> = [
  { id: 'system', label: 'Auto', icon: Monitor },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
];

export function ThemeSwitcher() {
  const preference = useThemeStore((state) => state.preference);
  const resolved = useThemeStore((state) => state.resolved);
  const setPreference = useThemeStore((state) => state.setPreference);
  const cyclePreference = useThemeStore((state) => state.cyclePreference);

  return (
    <LayoutGroup id="theme-switcher">
      <div
        className="no-drag button-surface px-2 py-1.5 rounded-lg flex items-center gap-1 text-[11px]"
        role="radiogroup"
        aria-label="Theme preference"
        title={`Theme: ${preference === 'system' ? `Auto (${resolved})` : preference}`}
        onDoubleClick={cyclePreference}
      >
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = preference === option.id || (preference === 'system' && option.id === resolved);
          return (
            <motion.button
              key={option.id}
              type="button"
              onClick={() => setPreference(option.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative flex items-center gap-1 px-2.5 py-1 rounded-md transition-all duration-150 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                isActive ? 'theme-pill-active' : 'theme-pill'
              }`}
              role="radio"
              aria-checked={isActive}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{option.label}</span>
              {isActive && (
                <motion.span
                  layoutId="theme-pill-indicator"
                  className="absolute inset-0 -z-10 rounded-md bg-blue-500/15 border border-blue-500/40"
                  transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
