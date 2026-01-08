/**
 * SPRINT 0: Page load progress bar component
 * Shows tiny progress bar in address bar during page load
 */

import { useEffect, useState } from 'react';

interface URLBarProgressProps {
  isLoading: boolean;
  progress?: number; // 0-100
  className?: string;
}

export function URLBarProgress({ isLoading, progress, className = '' }: URLBarProgressProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      // Fade out when done
      setDisplayProgress(100);
      const timer = setTimeout(() => setDisplayProgress(0), 300);
      return () => clearTimeout(timer);
    } else {
      // Simulate progress if not provided
      if (progress === undefined) {
        let current = 0;
        const interval = setInterval(() => {
          current = Math.min(current + Math.random() * 30, 90);
          setDisplayProgress(current);
          if (current >= 90) clearInterval(interval);
        }, 200);
        return () => clearInterval(interval);
      } else {
        setDisplayProgress(progress);
      }
    }
  }, [isLoading, progress]);

  if (!isLoading && displayProgress === 0) return null;

  return (
    <div
      className={`urlbar-progress ${className}`}
      style={{
        width: `${displayProgress}%`,
        transition: isLoading ? 'width 200ms ease-out' : 'opacity 300ms ease-out',
      }}
      role="progressbar"
      aria-valuenow={displayProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page loading progress"
    />
  );
}
