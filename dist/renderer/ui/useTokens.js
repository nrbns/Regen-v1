/**
 * useTokens Hook
 * Provides runtime access to design tokens
 */
/**
 * Get spacing token by number or name
 */
function getSpacing(n) {
    if (typeof n === 'string') {
        return `var(--space-${n})`;
    }
    return `var(--space-${n})`;
}
/**
 * useTokens Hook
 * Returns design tokens for runtime use
 */
export function useTokens() {
    return {
        spacing: Object.assign(getSpacing, {
            xs: 'var(--space-2)',
            sm: 'var(--space-3)',
            md: 'var(--space-4)',
            lg: 'var(--space-6)',
            xl: 'var(--space-8)',
            '2xl': 'var(--space-10)',
        }),
        fontSize: {
            xs: 'var(--font-size-xs)',
            sm: 'var(--font-size-sm)',
            base: 'var(--font-size-base)',
            lg: 'var(--font-size-lg)',
            xl: 'var(--font-size-xl)',
            '2xl': 'var(--font-size-2xl)',
            '3xl': 'var(--font-size-3xl)',
            '4xl': 'var(--font-size-4xl)',
            '5xl': 'var(--font-size-5xl)',
        },
        color: {
            primary: 'var(--color-primary-500)',
            primaryHover: 'var(--color-primary-400)',
            primaryActive: 'var(--color-primary-600)',
            surface: 'var(--surface-panel)',
            surfaceHover: 'var(--surface-hover)',
            surfaceActive: 'var(--surface-active)',
            border: 'var(--surface-border)',
            borderStrong: 'var(--surface-border-strong)',
            text: 'var(--text-primary)',
            textMuted: 'var(--text-muted)',
            accent: 'var(--accent)',
        },
        radius: {
            sm: 'var(--radius-md, 0.375rem)',
            md: 'var(--radius-lg, 0.5rem)',
            lg: 'var(--radius-2xl, 1rem)',
            pill: '9999px',
        },
        shadow: {
            sm: 'var(--shadow-sm)',
            md: 'var(--shadow-md)',
            lg: 'var(--shadow-lg)',
        },
    };
}
/**
 * getTokens - Non-hook version for use outside React components
 */
export function getTokens() {
    return useTokens();
}
