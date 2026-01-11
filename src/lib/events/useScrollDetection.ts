/**
 * Scroll Detection Hook - Real-time scroll depth tracking
 * Emits SCROLL events to EventBus for AI observation
 */

import { useEffect, useRef } from 'react';
import { emitScroll } from './EventBus';
import { useTabsStore } from '../../state/tabsStore';
import { emitScrollEnd } from '../../core/regen-v1/integrationHelpers';

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

      // Debounce scroll depth calculation (300ms for faster response)
      scrollTimeoutRef.current = setTimeout(() => {
        const depth = calculateScrollDepth();
        
        // Only emit if depth changed significantly (avoid spam)
        if (Math.abs(depth - lastScrollDepthRef.current) > 5) {
          lastScrollDepthRef.current = depth;
          emitScroll(depth, activeTab.url || '');
        }
        
        // Emit SCROLL_END to Regen-v1 event bus (non-blocking)
        emitScrollEnd();
      }, 300); // Debounce 300ms after scroll stops (faster response)
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
