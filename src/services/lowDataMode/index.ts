/**
 * SPRINT 0: Low-Data Mode Service
 * Disables images, reduces quality, limits bandwidth for low-network users
 */

import { useSettingsStore } from '../../state/settingsStore';

/**
 * Apply low-data mode effects to the document
 */
export function applyLowDataMode(enabled: boolean): void {
  if (typeof document === 'undefined') return;

  const html = document.documentElement;
  
  if (enabled) {
    // Add low-data class to root element for CSS targeting
    html.classList.add('low-data-mode');
    
    // Block images by default (can be unblocked by clicking)
    blockImages();
    
    // Disable autoplay videos
    disableAutoplay();
    
    // Request compressed resources via Accept headers (handled by fetch interceptor)
    // This is done via service worker or fetch wrapper
  } else {
    // Remove low-data class
    html.classList.remove('low-data-mode');
    
    // Unblock images
    unblockImages();
    
    // Re-enable autoplay (though browser policies may still restrict)
    enableAutoplay();
  }
}

/**
 * Block images - replace with placeholders that can be clicked to load
 */
function blockImages(): void {
  const images = document.querySelectorAll<HTMLImageElement>('img[src]');
  
  images.forEach(img => {
    // Store original src
    if (!img.dataset.originalSrc) {
      img.dataset.originalSrc = img.src;
    }
    
    // Replace with placeholder
    img.style.display = 'none';
    
    // Create placeholder button
    const placeholder = document.createElement('button');
    placeholder.className = 'low-data-image-placeholder';
    placeholder.innerHTML = `
      <div style="
        width: ${img.width || 200}px;
        height: ${img.height || 150}px;
        background: #1a1a1a;
        border: 1px solid #333;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: #888;
        font-size: 12px;
        border-radius: 4px;
      ">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <span style="margin-top: 8px;">Click to load image</span>
      </div>
    `;
    
    placeholder.onclick = () => {
      img.src = img.dataset.originalSrc || '';
      img.style.display = '';
      placeholder.remove();
    };
    
    img.parentNode?.insertBefore(placeholder, img);
  });
}

/**
 * Unblock images - restore original images
 */
function unblockImages(): void {
  const images = document.querySelectorAll<HTMLImageElement>('img[data-original-src]');
  
  images.forEach(img => {
    if (img.dataset.originalSrc) {
      img.src = img.dataset.originalSrc;
      img.style.display = '';
    }
  });
  
  // Remove placeholders
  document.querySelectorAll('.low-data-image-placeholder').forEach(placeholder => {
    placeholder.remove();
  });
}

/**
 * Disable autoplay videos
 */
function disableAutoplay(): void {
  const videos = document.querySelectorAll<HTMLVideoElement>('video[autoplay]');
  
  videos.forEach(video => {
    video.removeAttribute('autoplay');
    video.pause();
  });
}

/**
 * Enable autoplay videos (may still be restricted by browser policies)
 */
function enableAutoplay(): void {
  // Note: We don't re-add autoplay since it's user-controlled
  // Videos will need explicit user interaction to play
}

/**
 * Get current low-data mode state
 */
export function isLowDataModeEnabled(): boolean {
  return useSettingsStore.getState().general.lowDataMode ?? false;
}

/**
 * Set low-data mode state
 */
export function setLowDataMode(enabled: boolean): void {
  useSettingsStore.getState().updateGeneral({ lowDataMode: enabled });
  applyLowDataMode(enabled);
}

/**
 * Hook to subscribe to low-data mode changes
 */
export function subscribeToLowDataMode(callback: (enabled: boolean) => void): () => void {
  return useSettingsStore.subscribe(
    state => state.general.lowDataMode ?? false,
    callback,
    { equalityFn: (a, b) => a === b }
  );
}

