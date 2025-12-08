/**
 * Resource Preloading Utilities
 * Preload critical resources for better performance
 */

/**
 * Preload a resource (script, style, font, etc.)
 */
export function preloadResource(
  href: string,
  as: 'script' | 'style' | 'font' | 'image' | 'fetch',
  crossorigin?: boolean
): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  if (crossorigin) {
    link.crossOrigin = 'anonymous';
  }
  document.head.appendChild(link);
}

/**
 * Prefetch a resource (for likely next navigation)
 */
export function prefetchResource(href: string): void {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Preconnect to an origin (DNS + TCP + TLS)
 */
export function preconnectOrigin(origin: string, crossorigin = false): void {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = origin;
  if (crossorigin) {
    link.crossOrigin = 'anonymous';
  }
  document.head.appendChild(link);
}

/**
 * DNS prefetch (DNS lookup only)
 */
export function dnsPrefetch(origin: string): void {
  const link = document.createElement('link');
  link.rel = 'dns-prefetch';
  link.href = origin;
  document.head.appendChild(link);
}

/**
 * Preload critical resources on app startup
 */
export function preloadCriticalResources(): void {
  // Preconnect to API origins
  if (process.env.VITE_API_BASE_URL) {
    try {
      const apiUrl = new URL(process.env.VITE_API_BASE_URL);
      preconnectOrigin(apiUrl.origin);
    } catch {
      // Invalid URL, skip
    }
  }

  // Preconnect to common CDN origins
  dnsPrefetch('https://fonts.googleapis.com');
  dnsPrefetch('https://fonts.gstatic.com');
}


