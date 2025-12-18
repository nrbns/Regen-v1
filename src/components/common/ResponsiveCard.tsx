/**
 * Responsive Card Component
 * Consistent spacing and responsive grid layout for mobile/tablet/desktop
 */

import { useMobileDetection } from '../../mobile';
import { cn } from '../../lib/utils';

export interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function ResponsiveCard({
  children,
  className,
  onClick,
  hoverable = false,
  padding = 'md',
  onMouseEnter,
  onMouseLeave,
  ...props
}: ResponsiveCardProps) {
  const detection = useMobileDetection() as any;
  const isMobile = detection?.isMobile ?? false;
  const isTablet = detection?.isTablet ?? false;

  const paddingClasses = {
    none: '',
    sm: isMobile ? 'p-3' : isTablet ? 'p-4' : 'p-4',
    md: isMobile ? 'p-4' : isTablet ? 'p-5' : 'p-6',
    lg: isMobile ? 'p-5' : isTablet ? 'p-6' : 'p-8',
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        'rounded-lg border border-slate-800 bg-slate-900/70 backdrop-blur-sm',
        'transition-all duration-200',
        paddingClasses[padding],
        hoverable && 'cursor-pointer hover:border-slate-700 hover:bg-slate-900/90',
        onClick && 'cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Responsive Grid Container
 * Automatically adjusts columns based on screen size
 */
export interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
  minColumnWidth?: string;
}

export function ResponsiveGrid({
  children,
  className,
  gap = 'md',
  minColumnWidth = '300px',
}: ResponsiveGridProps) {
  const detection = useMobileDetection() as any;
  const isMobile = detection?.isMobile ?? false;
  const isTablet = detection?.isTablet ?? false;

  const gapClasses = {
    sm: isMobile ? 'gap-2' : isTablet ? 'gap-3' : 'gap-4',
    md: isMobile ? 'gap-3' : isTablet ? 'gap-4' : 'gap-5',
    lg: isMobile ? 'gap-4' : isTablet ? 'gap-5' : 'gap-6',
  };

  return (
    <div
      className={cn('responsive-grid', gapClasses[gap], className)}
      style={{
        gridTemplateColumns: isMobile
          ? '1fr'
          : isTablet
            ? 'repeat(2, 1fr)'
            : `repeat(auto-fit, minmax(${minColumnWidth}, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}
