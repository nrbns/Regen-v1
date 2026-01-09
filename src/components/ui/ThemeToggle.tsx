import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme, highContrast, setHighContrast } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);

  const themes = [
    { key: 'light' as const, label: 'Light', icon: Sun, color: 'text-yellow-500' },
    { key: 'dark' as const, label: 'Dark', icon: Moon, color: 'text-blue-400' },
    { key: 'system' as const, label: 'System', icon: Monitor, color: 'text-purple-400' },
  ];

  const currentTheme = themes.find(t => t.key === theme);

  return (
    <div className={`relative ${className}`}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        aria-label="Theme selector"
      >
        {currentTheme && (
          <>
            <currentTheme.icon className={`w-4 h-4 ${currentTheme.color}`} />
            <span className="text-sm text-slate-300 capitalize">{currentTheme.label}</span>
          </>
        )}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </motion.button>

      <motion.div
        initial={false}
        animate={{
          opacity: isOpen ? 1 : 0,
          scale: isOpen ? 1 : 0.95,
          y: isOpen ? 0 : -10
        }}
        transition={{ duration: 0.2 }}
        className={`absolute top-full mt-2 right-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[160px] ${
          isOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {themes.map((themeOption, index) => (
          <motion.button
            key={themeOption.key}
            onClick={() => {
              setTheme(themeOption.key);
              setIsOpen(false);
            }}
            className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-left first:rounded-t-lg last:rounded-b-lg"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <themeOption.icon className={`w-4 h-4 ${themeOption.color}`} />
            <span className="text-sm text-slate-200">{themeOption.label}</span>
            {theme === themeOption.key && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto"
              >
                <Check className="w-4 h-4 text-green-400" />
              </motion.div>
            )}
          </motion.button>
        ))}

        {/* High Contrast Toggle */}
        <div className="px-4 py-3 border-t border-slate-700/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">High Contrast</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setHighContrast(!highContrast);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                highContrast ? 'bg-blue-600' : 'bg-slate-600'
              }`}
              aria-label={`Toggle high contrast mode ${highContrast ? 'off' : 'on'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  highContrast ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Current Status */}
        <div className="px-4 py-2 border-t border-slate-700/50">
          <p className="text-xs text-slate-400">
            Theme: <span className="text-slate-300 capitalize">{resolvedTheme}</span>
            {theme === 'system' && (
              <span className="text-slate-500"> (system)</span>
            )}
            {highContrast && (
              <span className="text-blue-400"> • High Contrast</span>
            )}
          </p>
        </div>
      </motion.div>

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}