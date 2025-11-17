/**
 * ARIALiveRegion - Accessible live region for dynamic content announcements
 * Announces changes to screen readers without visual display
 */

import { useEffect, useRef } from 'react';

interface ARIALiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
  className?: string;
}

export function ARIALiveRegion({ 
  message, 
  priority = 'polite', 
  className = '' 
}: ARIALiveRegionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && ref.current) {
      ref.current.textContent = message;
      // Clear after announcement to allow re-announcement of same message
      const timer = setTimeout(() => {
        if (ref.current) ref.current.textContent = '';
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div
      ref={ref}
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className={`sr-only ${className}`}
    />
  );
}

