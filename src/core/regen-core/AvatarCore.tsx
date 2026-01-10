/**
 * Avatar Core - Anime/M3GAN-inspired Sentinel Avatar
 * 
 * A stylized eye/mask that conveys awareness without emotion.
 * Option A: Anime Eye (recommended) - single stylized eye, no mouth, blinks slowly
 */

import React from "react";
import { motion } from "framer-motion";
import { RegenCoreState } from "./regenCore.types";
import { 
  avatarBlinkVariants, 
  avatarGlowVariants, 
  avatarDilationVariants,
  avatarMicroTiltVariants 
} from "./regenCore.anim";

interface AvatarCoreProps {
  state: RegenCoreState;
  size?: number; // Avatar size in pixels (default: 32px)
}

export function AvatarCore({ state, size = 32 }: AvatarCoreProps) {
  const isAware = state === "aware" || state === "noticing"; // Awareness shift + suggestion state
  const isExecuting = state === "executing";
  const isReporting = state === "reporting";

  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      variants={avatarMicroTiltVariants}
      animate={isExecuting ? "tracking" : "idle"}
    >
      {/* Outer glow ring - intensity changes with state */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)",
          filter: "blur(8px)",
        }}
        variants={avatarGlowVariants}
        animate={isAware ? "aware" : isExecuting ? "executing" : "idle"}
      />

      {/* Glassmorphism container */}
      <div
        className="relative rounded-full overflow-hidden"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(139, 92, 246, 0.3)",
          boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.1), 0 4px 12px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Anime Eye - Option A (Recommended) */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Eye outline - porcelain/glass texture */}
          <motion.div
            className="relative rounded-full"
            style={{
              width: size * 0.65,
              height: size * 0.4,
              background: "linear-gradient(to bottom, rgba(255, 255, 255, 0.1), rgba(200, 200, 220, 0.15))",
              border: "1.5px solid rgba(200, 200, 220, 0.4)",
              boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.2)",
            }}
            variants={avatarBlinkVariants}
            animate={isAware ? "aware" : isExecuting ? "executing" : "idle"}
          >
            {/* Iris - glows subtly with state */}
            <motion.div
              className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{
                background: isAware
                  ? "radial-gradient(circle, rgba(99, 102, 241, 0.95) 0%, rgba(139, 92, 246, 0.75) 60%, rgba(79, 70, 229, 0.55) 100%)"
                  : isExecuting
                  ? "radial-gradient(circle, rgba(59, 130, 246, 0.9) 0%, rgba(37, 99, 235, 0.7) 60%, rgba(29, 78, 216, 0.5) 100%)"
                  : "radial-gradient(circle, rgba(139, 92, 246, 0.8) 0%, rgba(124, 58, 237, 0.6) 60%, rgba(109, 40, 217, 0.4) 100%)",
                filter: isAware ? "brightness(1.15)" : isExecuting ? "brightness(1.1)" : "brightness(1.0)",
              }}
              variants={avatarDilationVariants}
              animate={isAware ? "dilated" : isExecuting ? "tracking" : "neutral"}
            >
              {/* Pupil */}
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: isAware ? size * 0.25 : size * 0.22,
                  height: isAware ? size * 0.25 : size * 0.22,
                  background: "radial-gradient(circle, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 1) 100%)",
                  boxShadow: "0 0 4px rgba(139, 92, 246, 0.5)",
                }}
                animate={{
                  scale: isAware ? [1, 1.1, 1] : isExecuting ? [1, 1.05, 1] : 1,
                }}
                transition={{
                  duration: 2,
                  repeat: isExecuting ? Infinity : 0,
                  ease: "easeInOut",
                }}
              >
                {/* Highlight - gives depth */}
                <div
                  className="absolute top-1 left-1 rounded-full bg-white/40"
                  style={{
                    width: size * 0.08,
                    height: size * 0.08,
                  }}
                />
              </motion.div>
            </motion.div>

            {/* Upper eyelid - creates blink effect */}
            <motion.div
              className="absolute top-0 left-0 right-0 bg-gradient-to-b from-slate-900/95 to-transparent"
              style={{
                height: size * 0.2,
                borderRadius: "50% 50% 0 0",
              }}
              variants={avatarBlinkVariants}
              animate={isAware ? "aware" : isExecuting ? "executing" : "idle"}
            />

            {/* Lower eyelid - subtle */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/60 to-transparent"
              style={{
                height: size * 0.15,
                borderRadius: "0 0 50% 50%",
              }}
            />
          </motion.div>
        </div>

        {/* Scan lines - only during execution */}
        {isExecuting && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "repeating-linear-gradient(0deg, transparent 0%, rgba(59, 130, 246, 0.05) 1px, transparent 2px)",
              opacity: 0.6,
            }}
            animate={{
              y: [0, size * 2],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}
      </div>

      {/* Breathing glow - always present, intensifies with state */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)",
          filter: "blur(6px)",
        }}
        animate={{
          opacity: isAware ? [0.4, 0.7, 0.4] : isExecuting ? [0.5, 0.8, 0.5] : [0.3, 0.5, 0.3],
          scale: isAware ? [1, 1.1, 1] : isExecuting ? [1, 1.05, 1] : [1, 1.02, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
}
