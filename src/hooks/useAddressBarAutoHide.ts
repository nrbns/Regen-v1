/**
 * SPRINT 0: Address bar auto-hide on scroll
 * Hides address bar when scrolling down, reveals when scrolling up
 */

import { useEffect, useState, useRef } from 'react';

interface UseAddressBarAutoHideOptions {
  enabled?: boolean;
  threshold?: number; // Scroll distance before hiding
  hideDelay?: number; // Delay before hiding (ms)
}

export function useAddressBarAutoHide({
  enabled = true,
  threshold = 50,
  hideDelay = 100,
}: UseAddressBarAutoHideOptions = {}) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY || document.documentElement.scrollTop;

          // Clear any pending hide timer
          if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
          }

          // Show immediately when scrolling up
          if (currentScrollY < lastScrollY.current) {
            setIsVisible(true);
          }
          // Hide when scrolling down past threshold
          else if (currentScrollY > lastScrollY.current && currentScrollY > threshold) {
            hideTimerRef.current = setTimeout(() => {
              setIsVisible(false);
            }, hideDelay);
          }
          // Show if near top
          else if (currentScrollY <= threshold) {
            setIsVisible(true);
          }

          lastScrollY.current = currentScrollY;
          ticking = false;
        });

        ticking = true;
      }
    };

    // Listen to scroll events
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Also listen to scroll events on document (for some browsers)
    document.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [enabled, threshold, hideDelay]);

  return { isVisible, show: () => setIsVisible(true), hide: () => setIsVisible(false) };
}

