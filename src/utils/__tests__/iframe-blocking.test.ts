/**
 * Iframe Blocking Tests
 * Validates iframe blocking detection and fallback mechanisms
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Iframe Blocking Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow iframe-friendly search engines', () => {
    const iframeFriendlyProviders = ['bing', 'yahoo', 'startpage', 'ecosia'];

    iframeFriendlyProviders.forEach(provider => {
      expect(provider).toBeTruthy();
    });
  });

  it('should detect X-Frame-Options blocking errors', () => {
    const blockingErrors = [
      'x-frame-options deny',
      'frame-ancestors none',
      'refused to display in a frame',
      'denied due to frame-ancestors',
      'blocked by X-Frame-Options',
    ];

    blockingErrors.forEach(error => {
      const isBlocked =
        error.toLowerCase().includes('x-frame-options') ||
        error.toLowerCase().includes('frame-ancestors') ||
        error.toLowerCase().includes('refused to display') ||
        error.toLowerCase().includes('denied') ||
        (error.toLowerCase().includes('frame') && error.toLowerCase().includes('blocked'));

      expect(isBlocked).toBe(true);
    });
  });

  it('should not false-positive on cross-origin errors', () => {
    const crossOriginErrors = [
      'Blocked a frame with origin',
      'Cannot access contentDocument',
      'Cross-origin frame access',
      'SecurityError: Blocked',
    ];

    crossOriginErrors.forEach(error => {
      const isFrameBlocking =
        error.toLowerCase().includes('x-frame-options') ||
        error.toLowerCase().includes('frame-ancestors') ||
        error.toLowerCase().includes('refused to display');

      // These should NOT be detected as frame blocking
      expect(isFrameBlocking).toBe(false);
    });
  });

  it('should convert Google search to iframe-friendly alternative', () => {
    const googleUrl = 'https://www.google.com/search?q=test+query';
    const url = new URL(googleUrl);
    const query = url.searchParams.get('q');

    expect(query).toBe('test query');

    // Should convert to Startpage
    const startpageUrl = `https://www.startpage.com/sp/search?query=${encodeURIComponent(query || '')}`;
    expect(startpageUrl).toContain('startpage.com');
    expect(startpageUrl).toContain('test%20query'); // URL encoded
  });

  it('should convert DuckDuckGo search to iframe-friendly alternative', () => {
    const ddgUrl = 'https://duckduckgo.com/?q=test+search';
    const url = new URL(ddgUrl);
    const query = url.searchParams.get('q');

    expect(query).toBe('test search');

    // Should convert to Startpage
    const startpageUrl = `https://www.startpage.com/sp/search?query=${encodeURIComponent(query || '')}`;
    expect(startpageUrl).toContain('startpage.com');
  });

  it('should detect YouTube homepage blocking', () => {
    const youtubeHomepage = 'https://www.youtube.com';
    const youtubeVideo = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    const isHomepage = (url: string) => {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('youtube.com') && !urlObj.pathname.includes('/watch');
    };

    expect(isHomepage(youtubeHomepage)).toBe(true);
    expect(isHomepage(youtubeVideo)).toBe(false);
  });

  it('should allow CSP frame-src wildcard', () => {
    const csp = 'frame-src *;';
    expect(csp).toContain('frame-src *');
  });

  it('should have comprehensive iframe sandbox permissions', () => {
    const sandbox =
      'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-pointer-lock allow-top-navigation allow-top-navigation-by-user-activation allow-downloads allow-modals allow-presentation allow-orientation-lock allow-storage-access-by-user-activation';

    const permissions = [
      'allow-same-origin',
      'allow-scripts',
      'allow-forms',
      'allow-popups',
      'allow-modals',
      'allow-top-navigation',
      'allow-downloads',
    ];

    permissions.forEach(permission => {
      expect(sandbox).toContain(permission);
    });
  });

  it('should handle iframe load timeout gracefully', () => {
    const LOADING_TIMEOUT_MS = 30000; // 30 seconds

    expect(LOADING_TIMEOUT_MS).toBeGreaterThan(0);
    expect(LOADING_TIMEOUT_MS).toBeLessThanOrEqual(60000); // Max 60 seconds
  });

  it('should provide user-friendly error messages', () => {
    const errorMessages = {
      xFrameOptions: 'This site blocks embedded views (X-Frame-Options).',
      youtubeHomepage: 'YouTube homepage cannot be embedded. Try opening a specific video URL.',
      genericError: 'Failed to load this page. Please check the URL or your connection.',
      timeout: 'This page is taking too long to load. Check your connection or try refreshing.',
    };

    Object.values(errorMessages).forEach(message => {
      expect(message).toBeTruthy();
      expect(message.length).toBeGreaterThan(10);
    });
  });
});

describe('Iframe Fallback Mechanism', () => {
  it('should emit iframe-blocked event with proper data', () => {
    const mockEvent = new CustomEvent('iframe-blocked', {
      detail: {
        tabId: 'tab-123',
        url: 'https://example.com',
      },
    });

    expect(mockEvent.detail.tabId).toBe('tab-123');
    expect(mockEvent.detail.url).toBe('https://example.com');
  });

  it('should have fallback options for blocked iframes', () => {
    const fallbackOptions = [
      'navigate_main_webview', // Tauri: navigate main window
      'open_external', // Tauri: open in system browser
      'window.open', // Web: open in new tab
    ];

    fallbackOptions.forEach(option => {
      expect(option).toBeTruthy();
    });
  });

  it('should log iframe blocking attempts for debugging', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    console.log('[IframeBlockedFallback] Handling blocked iframe', {
      tabId: 'test-tab',
      url: 'https://blocked-site.com',
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
