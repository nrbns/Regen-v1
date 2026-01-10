/**
 * Avatar Core - Full Avatar System (Figma Spec)
 * 
 * Full avatar with variants:
 * - Female (M3GAN-inspired) - DEFAULT
 * - Gender-Neutral (Synthetic Sentinel)
 * - Skins (Obsidian, Porcelain, Steel, Ghost)
 * 
 * Per Figma: Semi-realistic anime, porcelain synthetic skin, neutral expression
 */

import React from "react";
import { RegenCoreState } from "./regenCore.types";
import { AvatarVariants, AvatarVariant, AvatarSkin } from "./AvatarVariants";

interface AvatarCoreProps {
  state: RegenCoreState;
  size?: number; // Avatar size in pixels (default: 64px per Figma)
  variant?: AvatarVariant; // "female" | "gender-neutral"
  skin?: AvatarSkin; // "obsidian" | "porcelain" | "steel" | "ghost"
}

export function AvatarCore({ state, size = 64, variant = "female", skin = "obsidian" }: AvatarCoreProps) {
  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <AvatarVariants
        variant={variant}
        skin={skin}
        state={state}
        size={size}
      />
    </div>
  );
}
