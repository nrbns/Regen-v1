// PageAIButton deferred for v1 — original in src/_deferred/pageAI/PageAIButton.tsx
export function PageAIButton(_props: any) {
  return null;
}

export default PageAIButton;
/**
 * Page AI Button Component
 * Floating button to open AI assistant panel
 */

import { Sparkles } from 'lucide-react';
import { useMobileDetection } from '../../mobile';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../state/appStore';

function __removed_PageAIButton_impl() {
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
            className="fixed right-4 flex h-14 w-14 touch-manipulation items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-colors hover:bg-indigo-700"
            style={{
              zIndex: 110,
              bottom: 'calc(80px + env(safe-area-inset-bottom, 0px) + 16px)', // Above mobile nav with spacing
            }}
            aria-label="Open AI Assistant"
          >
            <Sparkles className="h-6 w-6" />
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
          className="fixed right-4 top-1/2 flex hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-colors hover:bg-indigo-700 md:flex"
          style={{ zIndex: 102 }}
          aria-label="Open AI Assistant"
        >
          <Sparkles className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
