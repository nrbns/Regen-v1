/**
 * Avatar Variants - Full Avatar System
 * 
 * Supports 3 variants per Figma spec:
 * 1. Female (M3GAN-inspired) - DEFAULT
 * 2. Gender-Neutral (Synthetic Sentinel)
 * 3. Skins (Obsidian, Porcelain, Steel, Ghost)
 */

import React from "react";
import { motion } from "framer-motion";
import { RegenCoreState } from "./regenCore.types";

export type AvatarVariant = "female" | "gender-neutral";
export type AvatarSkin = "obsidian" | "porcelain" | "steel" | "ghost";

interface AvatarVariantsProps {
  variant?: AvatarVariant;
  skin?: AvatarSkin;
  state: RegenCoreState;
  size?: number;
}

/**
 * Get skin colors based on variant
 */
function getSkinColors(skin: AvatarSkin) {
  switch (skin) {
    case "obsidian":
      return {
        base: "rgba(15, 23, 42, 0.95)",
        highlight: "rgba(30, 41, 59, 0.8)",
        shadow: "rgba(0, 0, 0, 0.9)",
        glow: "rgba(139, 92, 246, 0.3)",
      };
    case "porcelain":
      return {
        base: "rgba(241, 245, 249, 0.95)",
        highlight: "rgba(255, 255, 255, 0.9)",
        shadow: "rgba(148, 163, 184, 0.3)",
        glow: "rgba(139, 92, 246, 0.2)",
      };
    case "steel":
      return {
        base: "rgba(71, 85, 105, 0.95)",
        highlight: "rgba(100, 116, 139, 0.8)",
        shadow: "rgba(30, 41, 59, 0.9)",
        glow: "rgba(59, 130, 246, 0.3)",
      };
    case "ghost":
      return {
        base: "rgba(148, 163, 184, 0.6)",
        highlight: "rgba(203, 213, 225, 0.5)",
        shadow: "rgba(71, 85, 105, 0.4)",
        glow: "rgba(139, 92, 246, 0.4)",
      };
  }
}

/**
 * Female Avatar (M3GAN-inspired) - DEFAULT
 */
function FemaleAvatar({ state, size, skinColors }: { state: RegenCoreState; size: number; skinColors: ReturnType<typeof getSkinColors> }) {
  const isAware = state === "aware" || state === "noticing";
  const isExecuting = state === "executing";
  const isReporting = state === "reporting";

  return (
    <motion.svg
      width={size}
      height={size * 1.4}
      viewBox="0 0 100 140"
      className="absolute inset-0"
      animate={{
        y: [0, -2, 0], // Slow breathing motion (2-3s loop)
      }}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Hair - Short clean / tied back */}
      <motion.path
        d="M 20 25 Q 30 15, 50 18 Q 70 15, 80 25 L 85 35 Q 85 45, 80 50 Q 75 55, 70 55 L 30 55 Q 25 55, 20 50 Q 15 45, 15 35 Z"
        fill={skinColors.shadow}
        opacity={0.8}
      />

      {/* Head outline - Porcelain synthetic */}
      <motion.ellipse
        cx={50}
        cy={55}
        rx={28}
        ry={32}
        fill={`linear-gradient(135deg, ${skinColors.base}, ${skinColors.highlight})`}
        stroke={skinColors.shadow}
        strokeWidth={0.5}
        animate={{
          scale: isAware ? [1, 1.02, 1] : 1,
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Eyes - Sharp, focused */}
      <motion.g
        animate={{
          x: isAware ? [0, 2, -2, 0] : isExecuting ? [0, 3, -3, 0] : 0, // Micro eye movement / tracking
        }}
        transition={{
          duration: isExecuting ? 2 : 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Left eye */}
        <motion.ellipse
          cx={40}
          cy={52}
          rx={isAware ? 6 : 5}
          ry={isAware ? 4 : 3}
          fill={skinColors.shadow}
          opacity={0.9}
          animate={{
            scaleY: [1, 0.05, 1], // Blink
          }}
          transition={{
            duration: 0.3,
            repeat: Infinity,
            repeatDelay: 6, // Every 6-8s when idle
            ease: "easeInOut",
          }}
        />
        {/* Right eye */}
        <motion.ellipse
          cx={60}
          cy={52}
          rx={isAware ? 6 : 5}
          ry={isAware ? 4 : 3}
          fill={skinColors.shadow}
          opacity={0.9}
          animate={{
            scaleY: [1, 0.05, 1], // Blink (synchronized)
          }}
          transition={{
            duration: 0.3,
            repeat: Infinity,
            repeatDelay: 6,
            ease: "easeInOut",
          }}
        />
      </motion.g>

      {/* Neutral expression - minimal detail */}
      <line
        x1={50}
        y1={65}
        x2={50}
        y2={65}
        stroke={skinColors.shadow}
        strokeWidth={1}
        opacity={0.4}
      />

      {/* Neck */}
      <rect
        x={45}
        y={85}
        width={10}
        height={15}
        rx={5}
        fill={skinColors.base}
        opacity={0.9}
      />

      {/* Futuristic suit - Black collar */}
      <path
        d="M 35 100 L 65 100 L 70 110 L 30 110 Z"
        fill={skinColors.shadow}
        opacity={0.9}
      />
    </motion.svg>
  );
}

/**
 * Gender-Neutral Avatar (Synthetic Sentinel)
 */
function GenderNeutralAvatar({ state, size, skinColors }: { state: RegenCoreState; size: number; skinColors: ReturnType<typeof getSkinColors> }) {
  const isAware = state === "aware" || state === "noticing";
  const isExecuting = state === "executing";

  return (
    <motion.svg
      width={size}
      height={size * 1.3}
      viewBox="0 0 100 130"
      className="absolute inset-0"
      animate={{
        y: [0, -2, 0], // Breathing
      }}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Androgynous head - minimal detail */}
      <motion.ellipse
        cx={50}
        cy={55}
        rx={26}
        ry={30}
        fill={`linear-gradient(135deg, ${skinColors.base}, ${skinColors.highlight})`}
        stroke={skinColors.shadow}
        strokeWidth={0.5}
      />

      {/* Minimal hair/head covering */}
      <motion.ellipse
        cx={50}
        cy={40}
        rx={28}
        ry={20}
        fill={skinColors.shadow}
        opacity={0.7}
      />

      {/* Eyes - simple, focused */}
      <motion.g
        animate={{
          x: isAware ? [0, 2, -2, 0] : isExecuting ? [0, 3, -3, 0] : 0,
        }}
        transition={{
          duration: isExecuting ? 2 : 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <motion.ellipse
          cx={40}
          cy={52}
          rx={isAware ? 5 : 4}
          ry={isAware ? 3 : 2.5}
          fill={skinColors.shadow}
          opacity={0.9}
          animate={{
            scaleY: [1, 0.05, 1],
          }}
          transition={{
            duration: 0.3,
            repeat: Infinity,
            repeatDelay: 6,
            ease: "easeInOut",
          }}
        />
        <motion.ellipse
          cx={60}
          cy={52}
          rx={isAware ? 5 : 4}
          ry={isAware ? 3 : 2.5}
          fill={skinColors.shadow}
          opacity={0.9}
          animate={{
            scaleY: [1, 0.05, 1],
          }}
          transition={{
            duration: 0.3,
            repeat: Infinity,
            repeatDelay: 6,
            ease: "easeInOut",
          }}
        />
      </motion.g>

      {/* Neutral/no mouth */}
      {/* Minimal feature line */}
      <line
        x1={50}
        y1={63}
        x2={50}
        y2={63}
        stroke={skinColors.shadow}
        strokeWidth={0.5}
        opacity={0.3}
      />

      {/* Neck/body */}
      <rect
        x={46}
        y={82}
        width={8}
        height={20}
        rx={4}
        fill={skinColors.base}
        opacity={0.9}
      />
    </motion.svg>
  );
}

/**
 * Avatar Variants Component
 */
export function AvatarVariants({ variant = "female", skin = "obsidian", state, size = 64 }: AvatarVariantsProps) {
  const isAware = state === "aware" || state === "noticing";
  const isExecuting = state === "executing";
  const isReporting = state === "reporting";

  const skinColors = getSkinColors(skin);

  return (
    <motion.div
      className="relative flex items-center justify-center w-full h-full"
      style={{ height: size * 1.4 }}
      animate={{
        rotate: isAware ? [0, 2, -2, 0] : isExecuting ? [0, 3, -2, 0] : 0, // Head turns slightly when aware/executing
      }}
      transition={{
        duration: isExecuting ? 2 : 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Outer glow - intensifies with state */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(ellipse, ${skinColors.glow} 0%, transparent 70%)`,
          filter: "blur(10px)",
        }}
        animate={{
          opacity: isAware ? [0.4, 0.7, 0.4] : isExecuting ? [0.5, 0.8, 0.5] : [0.3, 0.5, 0.3],
          scale: isAware ? [1, 1.1, 1] : isExecuting ? [1, 1.05, 1] : [1, 1.02, 1],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Render avatar based on variant */}
      {variant === "female" ? (
        <FemaleAvatar state={state} size={size} skinColors={skinColors} />
      ) : (
        <GenderNeutralAvatar state={state} size={size} skinColors={skinColors} />
      )}

      {/* Scan lines - only during execution */}
      {isExecuting && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "repeating-linear-gradient(0deg, transparent 0%, rgba(59, 130, 246, 0.05) 1px, transparent 2px)",
            opacity: 0.6,
          }}
          animate={{
            y: [0, size * 1.4],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      )}

      {/* Subtle nod - only during reporting */}
      {isReporting && (
        <motion.div
          className="absolute inset-0"
          animate={{
            y: [0, 1, 0],
          }}
          transition={{
            duration: 0.5,
            repeat: 1,
            ease: "easeInOut",
          }}
        />
      )}
    </motion.div>
  );
}
