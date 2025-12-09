/**
 * Image Optimization Utilities
 * Lazy loading, responsive images, and optimization
 */

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png';
}

/**
 * Generate optimized image URL with parameters
 */
export function getOptimizedImageUrl(
  src: string,
  options: ImageOptions = {}
): string {
  if (!src) return '';

  const { width, height, quality = 80, format } = options;

  // If URL already has query params, append
  const url = new URL(src, window.location.origin);
  if (width) url.searchParams.set('w', width.toString());
  if (height) url.searchParams.set('h', height.toString());
  if (quality) url.searchParams.set('q', quality.toString());
  if (format) url.searchParams.set('f', format);

  return url.toString();
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(
  baseUrl: string,
  widths: number[] = [320, 640, 768, 1024, 1280, 1920]
): string {
  return widths
    .map((width) => `${getOptimizedImageUrl(baseUrl, { width })} ${width}w`)
    .join(', ');
}

/**
 * Check if WebP is supported
 */
export function isWebPSupported(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src =
      'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
}

/**
 * Get best image format based on browser support
 */
export async function getBestImageFormat(): Promise<'webp' | 'avif' | 'jpg'> {
  if (typeof Image === 'undefined') return 'jpg';

  // Check AVIF support
  const avifSupported = await new Promise<boolean>((resolve) => {
    const avif = new Image();
    avif.onload = avif.onerror = () => {
      resolve(avif.height === 2);
    };
    avif.src =
      'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  });

  if (avifSupported) return 'avif';

  // Check WebP support
  if (await isWebPSupported()) return 'webp';

  return 'jpg';
}



