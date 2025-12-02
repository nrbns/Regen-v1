/**
 * Performance Mode Utilities
 * Applies performance optimizations when performance boost is enabled
 */

/**
 * Apply performance mode optimizations to the document
 */
export function applyPerformanceMode(enabled: boolean): void {
  const html = document.documentElement;

  if (enabled) {
    html.setAttribute('data-performance-mode', 'true');

    // Disable animations and transitions
    const style = document.createElement('style');
    style.id = 'performance-mode-styles';
    style.textContent = `
      [data-performance-mode="true"] *,
      [data-performance-mode="true"] *::before,
      [data-performance-mode="true"] *::after {
        animation-duration: 0.01ms !important;
        animation-delay: 0.01ms !important;
        transition-duration: 0.01ms !important;
        transition-delay: 0.01ms !important;
        scroll-behavior: auto !important;
      }
      
      [data-performance-mode="true"] iframe {
        will-change: auto !important;
      }
    `;
    document.head.appendChild(style);

    // Enable aggressive caching hints
    if ('serviceWorker' in navigator) {
      // Service worker caching would be handled separately
      console.log('[PerformanceMode] Performance optimizations enabled');
    }
  } else {
    html.removeAttribute('data-performance-mode');

    // Remove performance mode styles
    const existingStyle = document.getElementById('performance-mode-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
  }
}

/**
 * Initialize performance mode from settings
 */
export function initPerformanceMode(): void {
  // This will be called on app startup to sync with settings
  // The actual state is managed by the settings store
}
