/**
 * EcoBadge - Real-time eco feedback component
 * Shows green tier, score, and CO2 saved
 */

import { motion } from 'framer-motion';
import { Leaf, Flame, Sun, Sparkles } from 'lucide-react';

type GreenTier = 'Ultra Green' | 'Green' | 'Yellow' | 'Red';

interface EcoBadgeProps {
  score: number;
  tier: GreenTier;
  co2SavedG?: number;
  className?: string;
}

const tierConfig: Record<GreenTier, { color: string; icon: typeof Leaf; message: string }> = {
  'Ultra Green': {
    color: '#10b981', // emerald-500
    icon: Sparkles,
    message: 'AI healed the planet!',
  },
  'Green': {
    color: '#22c55e', // green-500
    icon: Leaf,
    message: 'Eco-friendly response',
  },
  'Yellow': {
    color: '#f59e0b', // amber-500
    icon: Sun,
    message: 'Moderate energy use',
  },
  'Red': {
    color: '#ef4444', // red-500
    icon: Flame,
    message: 'High energy — optimize!',
  },
};

export function EcoBadge({ score, tier, co2SavedG = 0, className = '' }: EcoBadgeProps) {
  const config = tierConfig[tier];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border backdrop-blur-sm ${className}`}
      style={{
        borderColor: `${config.color}40`,
        backgroundColor: `${config.color}10`,
      }}
    >
      <Icon size={16} style={{ color: config.color }} />
      <div className="flex items-center gap-2 text-xs">
        <span style={{ color: config.color }} className="font-semibold">
          {score}%
        </span>
        {co2SavedG > 0 && (
          <span className="text-gray-400">
            • Saved {co2SavedG.toFixed(1)}g CO₂
          </span>
        )}
      </div>
      <div
        className="text-[10px] opacity-70"
        style={{ color: config.color }}
        title={config.message}
      >
        {tier}
      </div>
    </motion.div>
  );
}

// Compact version for status bar
export function EcoBadgeCompact({ score, tier, co2SavedG = 0 }: EcoBadgeProps) {
  const config = tierConfig[tier];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md border backdrop-blur-sm"
      style={{
        borderColor: `${config.color}40`,
        backgroundColor: `${config.color}10`,
      }}
      title={`${tier}: ${score}% • ${config.message}${co2SavedG > 0 ? ` • Saved ${co2SavedG.toFixed(1)}g CO₂` : ''}`}
    >
      <Icon size={12} style={{ color: config.color }} />
      <span style={{ color: config.color }} className="text-[10px] font-semibold">
        {score}%
      </span>
      {co2SavedG > 0 && (
        <span className="text-[9px] text-gray-400">
          {co2SavedG.toFixed(1)}g
        </span>
      )}
    </motion.div>
  );
}

