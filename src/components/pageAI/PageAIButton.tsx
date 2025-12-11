/**
 * Page AI Button Component
 * Floating button to open AI assistant panel
 */

import { Sparkles } from 'lucide-react';
import { useMobileDetection } from '../../mobile';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../state/appStore';

export function PageAIButton() {
  const { isMobile } = useMobileDetection();
  const { isPageAIPanelOpen, setPageAIPanelOpen } = useAppStore();

  if (isMobile) {
    // On mobile, show fixed button above mobile nav
    return (
      <AnimatePresence>
        {!isPageAIPanelOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setPageAIPanelOpen(true)}
            className="fixed right-4 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors touch-manipulation"
            style={{ 
              zIndex: 110,
              bottom: 'calc(80px + env(safe-area-inset-bottom, 0px) + 16px)' // Above mobile nav with spacing
            }}
            aria-label="Open AI Assistant"
          >
            <Sparkles className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
    );
  }

  // On desktop, show fixed button on right side
  return (
    <AnimatePresence>
      {!isPageAIPanelOpen && (
        <motion.button
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          onClick={() => setPageAIPanelOpen(true)}
            className="fixed right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors hidden md:flex"
            style={{ zIndex: 102 }}
          aria-label="Open AI Assistant"
        >
          <Sparkles className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

