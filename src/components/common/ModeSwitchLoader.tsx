/**
 * LAG FIX #3: Mode Switch Loader
 * Prevents white screens during mode switches (2-4s → <1s perceived)
 */

import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function ModeSwitchLoader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full w-full items-center justify-center bg-slate-950"
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        <p className="text-sm text-slate-400">Switching mode...</p>
      </div>
    </motion.div>
  );
}
