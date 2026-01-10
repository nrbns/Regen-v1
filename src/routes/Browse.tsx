import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Search, ArrowRight } from 'lucide-react';
import { useCommandController } from '../hooks/useCommandController';
import { showToast } from '../components/ui/Toast';

export default function Browse() {
  const [url, setUrl] = useState('');
  const [showRefineHint, setShowRefineHint] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { executeCommand } = useCommandController();

  // Show refine hint when user pauses typing
  useEffect(() => {
    if (url.trim().length > 10) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        // Check if query looks unclear (repeated words, very long)
        const words = url.trim().toLowerCase().split(/\s+/);
        const uniqueWords = new Set(words);
        if (words.length > 5 && uniqueWords.size / words.length < 0.6) {
          setShowRefineHint(true);
        }
      }, 3000); // After 3 seconds of no typing
    } else {
      setShowRefineHint(false);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [url]);

  const handleNavigate = async () => {
    if (!url.trim()) return;

    const result = await executeCommand(url, {});
    if (result.success) {
      showToast('Navigation initiated', 'success');
    } else {
      showToast('Navigation failed', 'error');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNavigate();
    }
  };

  return (
    <div className="h-full flex items-center justify-center bg-slate-900 text-white">
      <motion.div
        className="text-center space-y-6 max-w-2xl px-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <Globe className="w-10 h-10 text-white" />
        </motion.div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          Browse the Web
        </h1>
        <p className="text-base text-slate-400 mb-3">
          Enter a URL or search query
        </p>
        <motion.p
          className="text-xs text-slate-600 italic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          Regen is observing this session
        </motion.p>
        <div className="relative max-w-lg mx-auto">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search, navigate, or ask Regen..."
            className="w-full pl-12 pr-14 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          <motion.button
            onClick={handleNavigate}
            disabled={!url.trim()}
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-3 rounded-lg transition-all ${
              url.trim()
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
            whileHover={url.trim() ? { scale: 1.05 } : {}}
            whileTap={url.trim() ? { scale: 0.95 } : {}}
          >
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Micro-intelligence hint - shows when query seems unclear */}
        <AnimatePresence>
          {showRefineHint && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-3 text-xs text-slate-500 italic text-center"
            >
              Query intent unclear — refine?
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}