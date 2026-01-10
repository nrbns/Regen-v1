/**
 * Regen Core - Sentinel AI Presence (Anime/M3GAN-inspired)
 * 
 * The signature AI identity of Regen Browser.
 * Not an assistant. Not a friend. A protective, precise, observant presence.
 * 
 * Visual: 48px vertical AI capsule with avatar core (anime eye/M3GAN-style)
 * States: observing → noticing → executing → reporting
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRegenCore } from "./regenCore.store";
import { RegenCorePanel } from "./RegenCorePanel";
import { AvatarCore } from "./AvatarCore";
import { spineVariants } from "./regenCore.anim";

export default function RegenCore() {
  const { state } = useRegenCore();

  // Expanded when showing panel (noticing, executing, reporting)
  // Aware state shows avatar changes but no panel
  const isExpanded = state === "noticing" || state === "executing" || state === "reporting";

  return (
    <motion.div
      className="fixed top-0 right-0 h-full z-50 pointer-events-none"
      initial="observing"
      animate={isExpanded ? "expanded" : "observing"}
      variants={spineVariants}
      style={{
        // Glassmorphism background - translucent dark glass with blur
        background: isExpanded
          ? "linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.92) 100%)"
          : "linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: isExpanded
          ? "inset -1px 0 0 rgba(139, 92, 246, 0.2), 0 0 40px rgba(0, 0, 0, 0.3)"
          : "inset -1px 0 0 rgba(139, 92, 246, 0.3), 0 0 30px rgba(139, 92, 246, 0.15)",
        borderLeft: isExpanded ? "1px solid rgba(139, 92, 246, 0.3)" : "1px solid rgba(139, 92, 246, 0.2)",
      }}
    >
      {/* Vertical AI Capsule with Avatar Core (observing/aware states) */}
      {!isExpanded && (
        <div className="h-full w-full relative flex items-center justify-center py-8">
          {/* Avatar Core - Full avatar, always visible when collapsed (64px per Figma) */}
          <AvatarCore 
            state={state} 
            size={64}
            variant="female" // Default: Female (M3GAN-inspired) per Figma
            skin="obsidian" // Default: Obsidian skin per Figma
          />
          
          {/* Ambient glow - subtle backdrop */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, rgba(139, 92, 246, 0.1) 0%, transparent 70%)",
            }}
            animate={{
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
      )}

      {/* Expanded Panel (noticing/executing/reporting states) */}
      <AnimatePresence mode="wait">
        {isExpanded && (
          <div className="h-full w-full pointer-events-auto relative">
            {/* Avatar remains visible in top-left of expanded panel */}
            <div className="absolute top-4 left-4 z-10">
              <AvatarCore state={state} size={48} variant="female" skin="obsidian" />
            </div>
            <RegenCorePanel />
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
