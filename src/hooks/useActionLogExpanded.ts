/**
 * Hook to track ActionLog expansion state
 *
 * Default-expanded for first 5 uses, then user preference takes over.
 */

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'actionlog:expanded-count';
const DEFAULT_EXPANDED_USES = 5;

export function useActionLogExpanded() {
  const [shouldDefaultExpand, setShouldDefaultExpand] = useState(false);

  useEffect(() => {
    // Check how many times ActionLog has been seen
    const count = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);

    // If less than 5 uses, default expand
    if (count < DEFAULT_EXPANDED_USES) {
      setShouldDefaultExpand(true);
      // Increment count
      localStorage.setItem(STORAGE_KEY, String(count + 1));
    }
  }, []);

  return shouldDefaultExpand;
}
