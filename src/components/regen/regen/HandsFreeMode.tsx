/**
 * Hands-Free Mode (stub)
 * Original implementation moved to src/_deferred/regen/HandsFreeMode.tsx
 * This lightweight stub preserves the named export to avoid breaking imports
 * while keeping the active bundle minimal for v1.
 */

import React from 'react';

interface HandsFreeModeProps {
  sessionId: string;
  mode: 'research' | 'trade';
  onCommand?: (command: { type: string; payload: any }) => void;
  onClose?: () => void;
}

export function HandsFreeMode(_props: HandsFreeModeProps) {
  return null;
}
