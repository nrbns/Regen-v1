/**
 * Scroll Detection Hook - Real-time scroll depth tracking
 * Emits SCROLL events to EventBus for AI observation
 */

import { useEffect, useRef } from 'react';
import { emitScroll } from './EventBus';
import { useTabsStore } from '../../state/tabsStore';

export function useScrollDetection() {
  const { activeTabId, tabs } = useTabsStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const lastScrollDepthRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!activeTab?.url || activeTab.url.startsWith('about:')) return;

    const calculateScrollDepth = (): number => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      if (documentHeight <= windowHeight) return 0;

      const scrollableHeight = documentHeight - windowHeight;
      const scrollDepth = (scrollTop / scrollableHeight) * 100;
      return Math.min(100, Math.max(0, scrollDepth));
    };

    const handleScroll = () => {
      // Clear previous timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Debounce scroll depth calculation
      scrollTimeoutRef.current = setTimeout(() => {
        const depth = calculateScrollDepth();
        
        // Only emit if depth changed significantly (avoid spam)
        if (Math.abs(depth - lastScrollDepthRef.current) > 5) {
          lastScrollDepthRef.current = depth;
          emitScroll(depth, activeTab.url || '');
        }
      }, 500); // Debounce 500ms after scroll stops
    };

    // Listen to window scroll events
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial scroll depth check
    const initialDepth = calculateScrollDepth();
    if (initialDepth > 0) {
      lastScrollDepthRef.current = initialDepth;
      emitScroll(initialDepth, activeTab.url || '');
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [activeTab?.url, activeTabId]);
}
