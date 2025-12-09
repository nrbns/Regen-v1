/**
 * YouTube URL Handler
 * Converts YouTube URLs to embed format or handles them appropriately
 */

/**
 * Extract video ID from various YouTube URL formats
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check if it's a YouTube domain
    if (!hostname.includes('youtube.com') && !hostname.includes('youtu.be')) {
      return null;
    }

    // Format 1: https://www.youtube.com/watch?v=VIDEO_ID
    if (hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
      return urlObj.searchParams.get('v');
    }

    // Format 2: https://youtu.be/VIDEO_ID
    if (hostname.includes('youtu.be')) {
      const videoId = urlObj.pathname.slice(1); // Remove leading slash
      return videoId || null;
    }

    // Format 3: https://www.youtube.com/embed/VIDEO_ID
    if (hostname.includes('youtube.com') && urlObj.pathname.startsWith('/embed/')) {
      return urlObj.pathname.split('/embed/')[1]?.split('?')[0] || null;
    }

    // Format 4: https://www.youtube.com/v/VIDEO_ID
    if (hostname.includes('youtube.com') && urlObj.pathname.startsWith('/v/')) {
      return urlObj.pathname.split('/v/')[1]?.split('?')[0] || null;
    }

    // Format 5: https://www.youtube.com/shorts/VIDEO_ID
    if (hostname.includes('youtube.com') && urlObj.pathname.startsWith('/shorts/')) {
      return urlObj.pathname.split('/shorts/')[1]?.split('?')[0] || null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return hostname.includes('youtube.com') || hostname.includes('youtu.be');
  } catch {
    return false;
  }
}

/**
 * Convert YouTube URL to embed format
 * Returns null if it's not a video URL (e.g., just youtube.com homepage)
 */
export function convertToYouTubeEmbed(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    return null; // Not a video URL, can't embed
  }

  // Build embed URL with any existing query parameters (like autoplay, start time, etc.)
  // Use youtube-nocookie.com for privacy-respecting embeds
  try {
    const urlObj = new URL(url);
    // Use privacy-respecting embed URL (youtube-nocookie.com)
    const embedUrl = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
    
    // Preserve useful query parameters
    const usefulParams = ['autoplay', 'start', 'end', 'loop', 'mute', 'controls', 'rel', 'modestbranding'];
    usefulParams.forEach(param => {
      const value = urlObj.searchParams.get(param);
      if (value) {
        embedUrl.searchParams.set(param, value);
      }
    });

    return embedUrl.toString();
  } catch {
    // Fallback: privacy-respecting embed URL
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  }
}

/**
 * Check if YouTube URL is embeddable (has a video ID)
 */
export function isYouTubeEmbeddable(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

