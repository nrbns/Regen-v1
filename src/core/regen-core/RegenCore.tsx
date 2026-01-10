/**
 * Regen Core - Sentinel AI Presence
 * 
 * The signature AI identity of Regen Browser.
 * Not an assistant. Not a friend. A protective, precise, observant presence.
 * 
 * Default: 14px vertical light core (Sentinel Spine)
 * States: observing → noticing → executing → reporting
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRegenCore } from "./regenCore.store";
import { RegenCorePanel } from "./RegenCorePanel";
import { spineVariants, lightPulseVariants, flickerVariants } from "./regenCore.anim";

export default function RegenCore() {
  const { state } = useRegenCore();

  const isExpanded = state !== "observing";

  return (
    <motion.div
      className="fixed top-0 right-0 h-full z-50 pointer-events-none"
      initial="observing"
      animate={isExpanded ? "expanded" : "observing"}
      variants={spineVariants}
      style={{
        background: isExpanded
          ? "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.95))"
          : "linear-gradient(180deg, rgba(139, 92, 246, 0.4), rgba(139, 92, 246, 0.1))",
        boxShadow: isExpanded
          ? "0 0 0 rgba(139, 92, 246, 0)"
          : "0 0 20px rgba(139, 92, 246, 0.25)",
        borderLeft: isExpanded ? "1px solid rgba(139, 92, 246, 0.3)" : "none",
      }}
    >
      {/* Sentinel Spine - Vertical Light Core (observing state) */}
      {!isExpanded && (
        <div className="h-full w-full relative overflow-hidden">
          {/* Vertical light core - animated up/down with pulse */}
          <motion.div
            className="absolute inset-y-0 w-full"
            variants={lightPulseVariants}
            animate="animate"
          >
            {/* Core light - cold violet/blue */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-violet-500/40 to-transparent blur-sm" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/30 to-transparent blur-sm" />

            {/* Vertical spine line */}
            <motion.div
              className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-violet-400/60"
              animate={{
                opacity: [0.6, 0.9, 0.6],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{ transform: "translateX(-50%)" }}
            />
          </motion.div>

          {/* Micro flicker every 5-7 seconds */}
          <motion.div
            className="absolute inset-0 bg-white/10"
            variants={flickerVariants}
            animate="animate"
          />
        </div>
      )}

      {/* Expanded Panel (noticing/executing/reporting states) */}
      <AnimatePresence mode="wait">
        {isExpanded && (
          <div className="h-full w-full pointer-events-auto">
            <RegenCorePanel />
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
