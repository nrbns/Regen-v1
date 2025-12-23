/**
 * Touch Input Component
 * Input field optimized for touch with large tap targets
 */

import React from 'react';

export interface TouchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function TouchInput({ 
  label, 
  error, 
  helperText, 
  className = '', 
  ...props 
}: TouchInputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-medium text-gray-900">
          {label}
        </label>
      )}
      <input
        className={`min-h-[44px] w-full touch-manipulation rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-indigo-500 focus:outline-none ${
          error ? 'border-red-500' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1 text-sm text-gray-600">{helperText}</p>}
    </div>
  );
}
