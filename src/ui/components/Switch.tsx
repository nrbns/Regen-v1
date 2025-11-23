/**
 * Switch Component
 * Alternative switch component (similar to Toggle but different styling)
 */

import React from 'react';
import { Toggle, ToggleProps } from './Toggle';

/**
 * Switch - Alias for Toggle with different default styling
 * Can be customized separately if needed
 */
export function Switch(props: ToggleProps) {
  return <Toggle {...props} />;
}
