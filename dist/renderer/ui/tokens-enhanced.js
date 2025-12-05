/**
 * Enhanced Design Tokens
 * Loads from tokens.json and provides runtime access to all design tokens
 */
import tokensData from './tokens.json';
// Type-safe token access
export const tokens = tokensData;
/**
 * Get theme tokens for a specific theme
 */
export function getThemeTokens(theme) {
    return tokens.themes[theme];
}
/**
 * Get mode configuration
 */
export function getModeConfig(modeId) {
    return tokens.modes[modeId];
}
/**
 * Get available modes
 */
export function getAvailableModes() {
    return Object.entries(tokens.modes).map(([id, config]) => ({
        id: id,
        config,
    }));
}
/**
 * Get CSS variable name for a token
 */
export function getCSSVar(path) {
    return `var(--${path.join('-')})`;
}
/**
 * Get spacing value
 */
export function getSpacing(n) {
    if (typeof n === 'string') {
        return tokens.themes.light.spacing[n] || `var(--space-${n})`;
    }
    return tokens.themes.light.spacing[n.toString()] || `var(--space-${n})`;
}
/**
 * Get color value for current theme
 */
export function getColor(theme, category, shade) {
    const themeTokens = tokens.themes[theme];
    if (shade) {
        return (themeTokens.colors[category]?.[shade] || '');
    }
    return themeTokens.colors[category] || '';
}
