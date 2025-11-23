import { forwardRef } from 'react';

import { cn } from '../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  surface?: 'panel' | 'elevated' | 'transparent';
}

const paddingMap: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const surfaceMap: Record<NonNullable<CardProps['surface']>, string> = {
  panel: 'bg-[var(--surface-panel)] border border-[var(--surface-border)]',
  elevated:
    'bg-[var(--surface-elevated)] border border-[var(--surface-border-strong)] shadow-[0_15px_30px_rgba(0,0,0,0.25)]',
  transparent: 'bg-transparent border border-transparent',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = 'md', surface = 'panel', ...props }, ref) => (
    <div
      {...props}
      ref={ref}
      className={cn(
        'rounded-[var(--layout-radius)] transition-colors duration-150',
        paddingMap[padding],
        surfaceMap[surface],
        className
      )}
    />
  )
);

Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn('space-y-1', className)} {...props} />;

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  ...props
}) => (
  <h3
    className={cn('text-lg font-semibold tracking-tight text-[var(--text-primary)]', className)}
    {...props}
  />
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  ...props
}) => <p className={cn('text-sm text-[var(--text-muted)]', className)} {...props} />;

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn('text-[var(--text-primary)]', className)} {...props} />;

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => <div className={cn('flex items-center justify-between pt-4', className)} {...props} />;
