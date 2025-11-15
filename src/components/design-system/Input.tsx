/**
 * Input Component
 * Design system input field
 */

import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface InputProps extends Omit<HTMLMotionProps<'input'>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      error = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles = 'w-full bg-gray-800/50 border rounded-lg text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const errorStyles = error
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500';
    
    const iconPadding = leftIcon ? 'pl-10' : rightIcon ? 'pr-10' : '';

    return (
      <div className={`relative ${fullWidth ? 'w-full' : 'inline-block'}`}>
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <motion.input
          ref={ref}
          whileFocus={{ scale: 1.01 }}
          className={`
            ${baseStyles}
            ${sizeStyles[size]}
            ${errorStyles}
            ${iconPadding}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends Omit<HTMLMotionProps<'textarea'>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      size = 'md',
      error = false,
      fullWidth = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles = 'w-full bg-gray-800/50 border rounded-lg text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed resize-y';
    
    const errorStyles = error
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500';
    
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm min-h-[80px]',
      md: 'px-4 py-2 text-sm min-h-[100px]',
      lg: 'px-4 py-3 text-base min-h-[120px]',
    };

    return (
      <motion.textarea
        ref={ref}
        whileFocus={{ scale: 1.01 }}
        className={`
          ${baseStyles}
          ${sizeStyles[size]}
          ${errorStyles}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

