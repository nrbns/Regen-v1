/**
 * Enhanced Design Tokens
 * Loads from tokens.json and provides runtime access to all design tokens
 */

import tokensData from './tokens.json';

export type ThemeName = 'light' | 'dark';
export type ModeId = 'browse' | 'research' | 'trade' | 'dev';

export interface ColorTokens {
  primary: Record<string, string>;
  surface: Record<string, string>;
  text: Record<string, string>;
  accent: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

export interface SpacingTokens {
  [key: string]: string;
}

export interface FontSizeTokens {
  [key: string]: string;
}

export interface RadiusTokens {
  [key: string]: string;
}

export interface ShadowTokens {
  [key: string]: string;
}

export interface ThemeTokens {
  colors: ColorTokens;
  spacing: SpacingTokens;
  fontSize: FontSizeTokens;
  radius: RadiusTokens;
  shadow: ShadowTokens;
}

export interface ModeConfig {
  themeHints: {
    primary: string;
    accent: string;
  };
  tools: string[];
}

export interface Tokens {
  themes: {
    light: ThemeTokens;
    dark: ThemeTokens;
  };
  modes: Record<ModeId, ModeConfig>;
  animations: {
    duration: Record<string, string>;
    easing: Record<string, string>;
  };
  breakpoints: Record<string, string>;
}

// Type-safe token access
export const tokens: Tokens = tokensData as Tokens;

/**
 * Get theme tokens for a specific theme
 */
export function getThemeTokens(theme: ThemeName): ThemeTokens {
  return tokens.themes[theme];
}

/**
 * Get mode configuration
 */
export function getModeConfig(modeId: ModeId): ModeConfig {
  return tokens.modes[modeId];
}

/**
 * Get available modes
 */
export function getAvailableModes(): Array<{ id: ModeId; config: ModeConfig }> {
  return Object.entries(tokens.modes).map(([id, config]) => ({
    id: id as ModeId,
    config,
  }));
}

/**
 * Get CSS variable name for a token
 */
export function getCSSVar(path: string[]): string {
  return `var(--${path.join('-')})`;
}

/**
 * Get spacing value
 */
export function getSpacing(n: number | string): string {
  if (typeof n === 'string') {
    return tokens.themes.light.spacing[n] || `var(--space-${n})`;
  }
  return tokens.themes.light.spacing[n.toString()] || `var(--space-${n})`;
}

/**
 * Get color value for current theme
 */
export function getColor(theme: ThemeName, category: string, shade?: string): string {
  const themeTokens = tokens.themes[theme];
  if (shade) {
    return (
      (themeTokens.colors[category as keyof ColorTokens] as Record<string, string>)?.[shade] || ''
    );
  }
  return (themeTokens.colors[category as keyof ColorTokens] as string) || '';
}
