/**
 * Unified AI Bar Component
 * Phase 2, Day 5: Unified AI Bar - Consistent AI interface across all modes
 */

import React from 'react';

export interface UnifiedAIBarProps {
  mode?: string;
  onSubmit?: (query: string, options?: any) => void;
  placeholder?: string;
  disabled?: boolean;
  showHistory?: boolean;
  showVoice?: boolean;
  className?: string;
}

// Minimal v1 stub — no background listeners or voice hooks
export function UnifiedAIBar(_props: UnifiedAIBarProps) {
  return null;
}
