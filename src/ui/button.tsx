import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { motion, HTMLMotionProps } from 'framer-motion';

import { cn } from '../lib/utils';

type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size' | 'children'> {
  tone?: ButtonTone;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const toneClassMap: Record<ButtonTone, string> = {
  primary:
    'bg-[var(--color-primary-600)] text-white shadow-[0_12px_20px_rgba(37,99,235,0.25)] hover:bg-[var(--color-primary-500)] focus-visible:ring-[var(--color-primary-400)]',
  secondary:
    'bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--surface-border)] hover:bg-[var(--surface-hover)] focus-visible:ring-[var(--surface-border-strong)]',
  ghost:
    'bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-hover)] focus-visible:ring-[var(--surface-border)]',
  danger: 'bg-[#dc2626] text-white hover:bg-[#b91c1c] focus-visible:ring-[#f87171]',
};

const sizeClassMap: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      tone = 'primary',
      size = 'md',
      loading = false,
      icon,
      trailingIcon,
      fullWidth,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        {...props}
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-root)]',
          toneClassMap[tone],
          sizeClassMap[size],
          fullWidth && 'w-full',
          isDisabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        disabled={isDisabled}
        whileHover={!isDisabled ? { scale: 1.015 } : undefined}
        whileTap={!isDisabled ? { scale: 0.97 } : undefined}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} />
            <span>Loading</span>
          </>
        ) : (
          <>
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children && <span className="truncate">{children}</span>}
            {trailingIcon && <span className="flex-shrink-0">{trailingIcon}</span>}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

/**
 * IconButton - Icon-only button variant
 */
export interface IconButtonProps extends Omit<ButtonProps, 'icon' | 'trailingIcon' | 'children'> {
  icon: React.ReactNode;
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', ...props }, ref) => {
    const iconSize = size === 'sm' ? 16 : size === 'md' ? 18 : 20;

    return (
      <Button
        ref={ref}
        {...props}
        size={size}
        className={cn(
          'rounded-full p-0',
          size === 'sm' && 'w-8 h-8',
          size === 'md' && 'w-10 h-10',
          size === 'lg' && 'w-12 h-12',
          props.className
        )}
      >
        <span
          style={{ width: iconSize, height: iconSize }}
          className="flex items-center justify-center"
        >
          {icon}
        </span>
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

/**
 * FAB - Floating Action Button
 */
export interface FABProps extends Omit<ButtonProps, 'size'> {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  fixed?: boolean;
}

export const FAB = forwardRef<HTMLButtonElement, FABProps>(
  ({ position = 'bottom-right', fixed = true, className, ...props }, ref) => {
    const positionClasses = {
      'bottom-right': fixed ? 'fixed bottom-6 right-6' : '',
      'bottom-left': fixed ? 'fixed bottom-6 left-6' : '',
      'top-right': fixed ? 'fixed top-6 right-6' : '',
      'top-left': fixed ? 'fixed top-6 left-6' : '',
    };

    return (
      <Button
        ref={ref}
        {...props}
        size="lg"
        className={cn('rounded-full shadow-lg z-50', positionClasses[position], className)}
      />
    );
  }
);

FAB.displayName = 'FAB';
