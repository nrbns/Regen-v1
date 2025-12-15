/**
 * Keyboard Handler Utils
 * Utilities for handling keyboard and input on mobile
 */

/**
 * Prevent iOS zoom on input focus
 */
export function preventIOSZoom(): void {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
  }
}

/**
 * Scroll element into view when focused
 */
export function scrollIntoViewWhenFocused(element: HTMLElement): void {
  element?.addEventListener('focus', () => {
    setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  });
}

/**
 * Handle viewport resize events
 */
export function handleViewportResize(callback: () => void): void {
  window.addEventListener('resize', callback);
  window.addEventListener('orientationchange', callback);
}

/**
 * Prevent default keyboard behavior when needed
 */
export function preventKeyboardDefault(element: HTMLElement): void {
  element?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
    }
  });
}

/**
 * Safe auto-focus that respects user preferences
 */
export function safeAutoFocus(element: HTMLElement | null): void {
  if (element && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setTimeout(() => {
      element.focus({ preventScroll: true });
    }, 100);
  }
}
