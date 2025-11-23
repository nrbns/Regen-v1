/**
 * Toggle Component
 * Accessible toggle switch
 */

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useTokens } from '../useTokens';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  'aria-label'?: string;
  className?: string;
}

/**
 * Toggle - Accessible toggle switch
 *
 * Features:
 * - Keyboard accessible
 * - ARIA attributes
 * - Smooth animations
 * - Reduced motion support
 */
export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  'aria-label': ariaLabel,
  className = '',
}: ToggleProps) {
  const tokens = useTokens();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!disabled) {
        onChange(!checked);
      }
    }
  };

  return (
    <label
      className={`
        inline-flex items-center gap-2 cursor-pointer
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {label && (
        <span className="text-[var(--text-primary)]" style={{ fontSize: tokens.fontSize.sm }}>
          {label}
        </span>
      )}
      <div
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || label}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`
          relative inline-flex items-center rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1
          ${checked ? 'bg-[var(--color-primary-600)]' : 'bg-[var(--surface-elevated)]'}
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          width: '44px',
          height: '24px',
        }}
      >
        <motion.div
          layout
          className="absolute bg-white rounded-full shadow-sm"
          style={{
            width: '20px',
            height: '20px',
            left: checked ? '22px' : '2px',
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
        />
        <input
          ref={inputRef}
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
          aria-hidden="true"
        />
      </div>
    </label>
  );
}
