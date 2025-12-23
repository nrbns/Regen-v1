/**
 * Mobile Optimizations
 * Utilities for mobile responsiveness and touch interactions
 */

/**
 * Check if device is mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  // Check user agent
  const ua = navigator.userAgent.toLowerCase();
  const mobilePatterns = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;

  // Check screen size
  const isSmallScreen = window.innerWidth < 768;

  // Check touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return mobilePatterns.test(ua) || (isSmallScreen && hasTouch);
}

/**
 * Get optimal font size for mobile
 */
export function getMobileFontSize(baseSize: number): number {
  if (!isMobileDevice()) return baseSize;

  // Scale down fonts slightly on mobile for better fit
  return Math.max(baseSize * 0.9, 12);
}

/**
 * Prevent zoom on double-tap (mobile)
 */
export function preventDoubleTapZoom(element: HTMLElement): () => void {
  let lastTouchEnd = 0;

  const handleTouchEnd = (e: TouchEvent) => {
    const now = Date.now();
    if (now - lastTouchEnd < 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  };

  element.addEventListener('touchend', handleTouchEnd, { passive: false });

  return () => {
    element.removeEventListener('touchend', handleTouchEnd);
  };
}

/**
 * Get safe area insets for mobile (notch, home indicator)
 */
export function getSafeAreaInsets(): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  if (typeof window === 'undefined' || typeof CSS === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const style = getComputedStyle(document.documentElement);

  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0', 10),
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0', 10),
  };
}

/**
 * Optimize iframe for mobile
 */
export function optimizeIframeForMobile(iframe: HTMLIFrameElement): void {
  if (!isMobileDevice()) return;

  // Disable text selection in iframe (mobile optimization)
  iframe.style.userSelect = 'none';
  iframe.style.webkitUserSelect = 'none';

  // Optimize scrolling (vendor-specific property)
  (iframe.style as any).webkitOverflowScrolling = 'touch';

  // Prevent zoom
  iframe.setAttribute(
    'content',
    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
  );
}
