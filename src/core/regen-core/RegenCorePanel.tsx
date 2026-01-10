/**
 * Regen Core Panel
 * Expanded AI panel with M3GAN-style language
 * Avatar remains visible in all states for continuity
 */

import React from "react";
import { motion } from "framer-motion";
import { useRegenCore } from "./regenCore.store";
import { panelVariants } from "./regenCore.anim";
import { AvatarCore } from "./AvatarCore";
import { X } from "lucide-react";

export function RegenCorePanel() {
  const { state, observation, report, setState } = useRegenCore();
  const currentAction = observation?.action || null;

  if (state === "noticing" && observation) {
    return (
      <motion.div
        variants={panelVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="h-full flex flex-col"
      >
        {/* Avatar visible in panel header */}
        <div className="absolute top-4 left-4 z-10">
          <AvatarCore state={state} size={36} />
        </div>
        
        <div className="p-4 pt-20 text-sm text-violet-200 flex-1 overflow-y-auto">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-violet-400/80" />
              <p className="uppercase tracking-wider text-xs opacity-60 font-mono">
                OBSERVATION
              </p>
            </div>
            <button
              onClick={() => setState("observing")}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="mt-2 font-mono leading-relaxed">
            {observation.statement}
          </p>

          {observation.reasoning && (
            <p className="mt-2 text-xs text-slate-500 font-mono opacity-60">
              {observation.reasoning}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            {observation.actionLabel && (
              <motion.button
                onClick={() => {
                  setState("executing");
                }}
                className="px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-300 text-xs font-mono tracking-wider uppercase rounded transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.1, ease: "linear" }}
              >
                {observation.actionLabel}
              </motion.button>
            )}
            <motion.button
              onClick={() => setState("observing")}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 text-xs font-mono tracking-wider uppercase rounded transition-colors opacity-60"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.1, ease: "linear" }}
            >
              DISMISS
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (state === "executing") {
    return (
      <motion.div
        variants={panelVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="h-full flex flex-col"
      >
        {/* Avatar with tracking animation during execution */}
        <div className="absolute top-4 left-4 z-10">
          <AvatarCore state={state} size={36} />
        </div>
        
        <div className="p-4 pt-20 text-sm text-violet-200">
          <div className="flex items-center gap-2 mb-3">
            <motion.div
              className="w-1 h-6 bg-blue-400/80"
              animate={{
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear",
              }}
            />
            <p className="uppercase tracking-wider text-xs opacity-60 font-mono">
              EXECUTING
            </p>
          </div>

          <p className="font-mono">
            {currentAction === 'summarize' && 'Analyzing structure…'}
            {currentAction === 'close_duplicates' && 'Cross-checking sources…'}
            {currentAction === 'save_for_later' && 'Reducing redundancy…'}
            {currentAction === 'refine_search' && 'Processing query…'}
            {currentAction === 'use_cache' && 'Checking cache…'}
            {!currentAction && 'Processing…'}
          </p>
          <p className="opacity-60 mt-1 font-mono text-xs">
            {currentAction === 'summarize' && 'Cross-checking sources…'}
            {currentAction === 'close_duplicates' && 'Eliminating duplicates…'}
            {currentAction === 'save_for_later' && 'Storing data…'}
            {currentAction === 'refine_search' && 'Analyzing patterns…'}
            {currentAction === 'use_cache' && 'Searching alternatives…'}
            {!currentAction && 'Working…'}
          </p>

          {/* Horizontal scan line */}
          <div className="mt-3 h-0.5 bg-slate-800 rounded-full overflow-hidden relative">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/60 to-transparent"
              animate={{
                x: ["-100%", "200%"],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{ width: "50%" }}
            />
          </div>
        </div>
      </motion.div>
    );
  }

  if (state === "reporting" && report) {
    return (
      <motion.div
        variants={panelVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="h-full flex flex-col"
      >
        {/* Avatar returns to neutral in reporting state */}
        <div className="absolute top-4 left-4 z-10">
          <AvatarCore state={state} size={36} />
        </div>
        
        <div className="p-4 pt-20 text-sm text-violet-200 flex-1 overflow-y-auto">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <motion.div
                className="w-1 h-6 bg-emerald-400/80"
                animate={{
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              <p className="uppercase tracking-wider text-xs opacity-60 font-mono">
                {report.title}
              </p>
            </div>
            <button
              onClick={() => setState("observing")}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {report.metrics.map((metric, i) => (
              <p key={i} className="font-mono text-sm">
                {metric}
              </p>
            ))}
          </div>

          {report.points && report.points.length > 0 && (
            <ul className="mt-3 list-disc ml-4 space-y-1">
              {report.points.map((point, i) => (
                <li key={i} className="text-xs text-slate-400 font-mono">
                  {point}
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={() => setState("observing")}
            className="mt-4 text-xs opacity-60 font-mono uppercase tracking-wider hover:opacity-100 transition-opacity"
          >
            Return to silence
          </button>
        </div>
      </motion.div>
    );
  }

  return null;
}
