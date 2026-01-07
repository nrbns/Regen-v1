/**
 * AIModeButton - Prominent green AI Mode button
 * Used in top right corner and next to search bar
 */

import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface AIModeButtonProps {
  onClick: () => void;
  variant?: 'default' | 'search';
  className?: string;
}

export function AIModeButton({ onClick, variant = 'default', className = '' }: AIModeButtonProps) {
  const isSearchVariant = variant === 'search';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        inline-flex items-center gap-2 font-semibold text-white
        rounded-lg shadow-lg transition-all flex-shrink-0
        bg-gradient-to-r from-green-500 to-emerald-600
        hover:from-green-600 hover:to-emerald-700
        focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
        ${isSearchVariant ? 'px-3 sm:px-4 py-2 sm:py-3' : 'px-4 sm:px-5 py-2 sm:py-2.5'}
        ${className}
      `}
      aria-label="AI Mode"
      title="Activate AI Mode"
      style={{
        boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)',
      }}
    >
      <Sparkles
        size={isSearchVariant ? 18 : 16}
        className="sm:w-5 sm:h-5 text-white flex-shrink-0"
      />
      <span className="text-xs sm:text-sm md:text-base whitespace-nowrap">AI Mode</span>
    </motion.button>
  );
}
