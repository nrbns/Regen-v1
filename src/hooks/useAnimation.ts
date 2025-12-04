/**
 * Animation Hooks
 * Utilities for controlling animations
 */

import { useState, useEffect, useRef } from 'react';
import { useInView } from 'framer-motion';

/**
 * Hook to trigger animation when element enters viewport
 */
export function useInViewAnimation(
  options: {
    threshold?: number;
    once?: boolean;
    margin?: string;
  } = {}
) {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    amount: options.threshold || 0.1,
    once: options.once !== false,
    ...(options.margin && { margin: options.margin }),
  } as any);

  return { ref, isInView };
}

/**
 * Hook for staggered animations
 */
export function useStaggeredAnimation(count: number, delay = 0.05) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return {
    visible,
    getDelay: (index: number) => index * delay,
  };
}

/**
 * Hook for scroll-triggered animations
 */
export function useScrollAnimation(threshold = 0.5) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold]);

  return { ref, isVisible };
}
