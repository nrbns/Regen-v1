/**
 * Swipe Gesture Hook
 * Detects and handles swipe gestures on touch devices
 */

import { useEffect, useRef } from 'react';

export interface SwipeGestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

export function useSwipeGesture(
  config: SwipeGestureConfig,
  elementRef?: React.RefObject<HTMLElement>
) {
  const startX = useRef(0);
  const startY = useRef(0);
  const { threshold = 50, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown } = config;

  useEffect(() => {
    const element = elementRef?.current || window;

    const handleTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;

      const diffX = startX.current - endX;
      const diffY = startY.current - endY;

      if (Math.abs(diffX) > threshold) {
        if (diffX > 0) {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }
      }

      if (Math.abs(diffY) > threshold) {
        if (diffY > 0) {
          onSwipeUp?.();
        } else {
          onSwipeDown?.();
        }
      }
    };

    element.addEventListener('touchstart', handleTouchStart as EventListener);
    element.addEventListener('touchend', handleTouchEnd as EventListener);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart as EventListener);
      element.removeEventListener('touchend', handleTouchEnd as EventListener);
    };
  }, [threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, elementRef]);
}
