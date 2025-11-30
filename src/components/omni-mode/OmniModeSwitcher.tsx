/**
 * AI Omni Mode Switcher - Hero Feature
 * One button → browser becomes an AI operating system
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Code,
  BookOpen,
  FileText,
  Languages,
  Image as ImageIcon,
  Sparkles,
  X,
} from 'lucide-react';
import { useAppStore } from '../../state/appStore';

export type OmniMode = 'search' | 'code' | 'research' | 'writing' | 'translate' | 'image';

interface ModeConfig {
  id: OmniMode;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}

const OMNI_MODES: ModeConfig[] = [
  {
    id: 'search',
    name: 'AI Search',
    icon: Search,
    description: 'Intelligent search with AI-powered results',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'code',
    name: 'AI Code',
    icon: Code,
    description: 'Code generation, debugging, and explanation',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'research',
    name: 'AI Research',
    icon: BookOpen,
    description: 'Deep research with multi-source aggregation',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'writing',
    name: 'AI Writing',
    icon: FileText,
    description: 'Content creation, editing, and enhancement',
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 'translate',
    name: 'AI Translate',
    icon: Languages,
    description: 'Real-time translation in 100+ languages',
    color: 'from-indigo-500 to-purple-500',
  },
  {
    id: 'image',
    name: 'AI Image',
    icon: ImageIcon,
    description: 'Image generation, analysis, and editing',
    color: 'from-pink-500 to-rose-500',
  },
];

export function OmniModeSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<OmniMode | null>(null);
  const { setMode } = useAppStore();

  const handleModeSelect = (mode: OmniMode) => {
    setSelectedMode(mode);
    
    // Map Omni modes to app modes
    const modeMap: Record<OmniMode, 'Browse' | 'Research' | 'Docs' | 'Images'> = {
      search: 'Browse',
      code: 'Browse',
      research: 'Research',
      writing: 'Docs',
      translate: 'Browse',
      image: 'Images',
    };
    
    setMode(modeMap[mode]);
    
    // Close after selection
    setTimeout(() => setIsOpen(false), 300);
  };

  return (
    <>
      {/* Omni Mode Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-semibold transition-all hover:scale-105"
      >
        <Sparkles className="w-5 h-5" />
        <span>AI Omni Mode</span>
      </button>

      {/* Mode Selection Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            >
              <div className="bg-slate-900 border border-purple-500/50 rounded-3xl p-8 max-w-4xl w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                      <Sparkles className="w-8 h-8 text-purple-400" />
                      AI Omni Mode
                    </h2>
                    <p className="text-gray-400 mt-2">
                      Transform your browser into an AI operating system
                    </p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Mode Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {OMNI_MODES.map((mode) => {
                    const Icon = mode.icon;
                    return (
                      <motion.button
                        key={mode.id}
                        onClick={() => handleModeSelect(mode.id)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`bg-gradient-to-br ${mode.color} p-6 rounded-2xl text-left hover:shadow-xl transition-all group`}
                      >
                        <Icon className="w-8 h-8 text-white mb-3 group-hover:scale-110 transition-transform" />
                        <h3 className="text-xl font-bold text-white mb-1">{mode.name}</h3>
                        <p className="text-white/80 text-sm">{mode.description}</p>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="mt-6 text-center text-gray-400 text-sm">
                  Press <kbd className="px-2 py-1 bg-slate-800 rounded">Esc</kbd> to close
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Keyboard shortcut */}
      {typeof window !== 'undefined' && (
        <OmniModeKeyboardHandler onToggle={() => setIsOpen(!isOpen)} />
      )}
    </>
  );
}

function OmniModeKeyboardHandler({ onToggle }: { onToggle: () => void }) {
  if (typeof window === 'undefined') return null;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ctrl+Shift+O for Omni Mode
      if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        onToggle();
      }
      // Esc to close
      if (e.key === 'Escape') {
        onToggle();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onToggle]);

  return null;
}

