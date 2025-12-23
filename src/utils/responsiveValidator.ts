/**
 * Layer 2: Responsive Breakpoint Validator
 * Ensures consistent breakpoints across the application
 */

export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Get current breakpoint based on window width
 */
export function getCurrentBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop';

  const width = window.innerWidth;

  if (width >= BREAKPOINTS.wide) return 'wide';
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

/**
 * Check if current viewport matches breakpoint
 */
export function matchesBreakpoint(breakpoint: Breakpoint): boolean {
  if (typeof window === 'undefined') return false;

  const width = window.innerWidth;

  switch (breakpoint) {
    case 'mobile':
      return width < BREAKPOINTS.tablet;
    case 'tablet':
      return width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
    case 'desktop':
      return width >= BREAKPOINTS.desktop && width < BREAKPOINTS.wide;
    case 'wide':
      return width >= BREAKPOINTS.wide;
    default:
      return false;
  }
}

/**
 * React hook for responsive breakpoint
 */
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<Breakpoint>(getCurrentBreakpoint);

  React.useEffect(() => {
    const handleResize = () => {
      setBreakpoint(getCurrentBreakpoint());
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop' || breakpoint === 'wide',
    isWide: breakpoint === 'wide',
  };
}

/**
 * Validate all CSS media queries match defined breakpoints
 */
export function validateResponsiveBreakpoints(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if all stylesheets use consistent breakpoints
  const styleSheets = Array.from(document.styleSheets);

  styleSheets.forEach(sheet => {
    try {
      const rules = Array.from(sheet.cssRules || []);

      rules.forEach(rule => {
        if (rule instanceof CSSMediaRule) {
          const mediaText = rule.media.mediaText;

          // Check for inconsistent breakpoints
          if (mediaText.includes('max-width: 767px') || mediaText.includes('min-width: 768px')) {
            // Expected mobile/tablet breakpoints
          } else if (mediaText.includes('min-width: 1024px')) {
            // Expected desktop breakpoint
          } else if (mediaText.includes('min-width: 1440px')) {
            // Expected wide breakpoint
          } else if (mediaText.match(/\d+px/)) {
            // Non-standard breakpoint detected
            warnings.push(`Non-standard breakpoint detected: ${mediaText}`);
          }
        }
      });
    } catch {
      // Skip cross-origin stylesheets
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

import React from 'react';
