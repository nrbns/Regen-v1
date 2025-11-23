import { forwardRef, useMemo } from 'react';

import { cn } from '../lib/utils';

type ContainerWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

const widthMap: Record<Exclude<ContainerWidth, 'full'>, string> = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-[var(--layout-page-width)]',
};

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: ContainerWidth;
  padded?: boolean;
  bleed?: boolean;
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ width = '2xl', padded = true, bleed = false, className, ...props }, ref) => {
    const maxWidth = width === 'full' ? 'w-full' : widthMap[width];

    return (
      <div
        {...props}
        ref={ref}
        className={cn(
          'mx-auto w-full',
          maxWidth,
          padded && 'px-[var(--layout-page-padding)]',
          bleed && '!px-0',
          className
        )}
      />
    );
  }
);

Container.displayName = 'Container';

export interface ScrollContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md';
}

const paddingMap: Record<Exclude<ScrollContainerProps['padding'], undefined>, string> = {
  none: '',
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
};

export const ScrollContainer = forwardRef<HTMLDivElement, ScrollContainerProps>(
  ({ padding = 'md', className, ...props }, ref) => (
    <div
      {...props}
      ref={ref}
      className={cn('flex-1 overflow-y-auto', paddingMap[padding], className)}
    />
  )
);

ScrollContainer.displayName = 'ScrollContainer';

export interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: 'sm' | 'md' | 'lg';
}

const sectionSpacing: Record<Exclude<SectionProps['spacing'], undefined>, string> = {
  sm: 'py-4',
  md: 'py-6',
  lg: 'py-8',
};

export function Section({ spacing = 'md', className, children, ...props }: SectionProps) {
  return (
    <section className={cn('w-full', sectionSpacing[spacing], className)} {...props}>
      {children}
    </section>
  );
}

interface SpacerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  axis?: 'vertical' | 'horizontal';
}

const spacerSizeMap: Record<Exclude<SpacerProps['size'], undefined>, string> = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
};

export function Spacer({ size = 'md', axis = 'vertical' }: SpacerProps) {
  const style = useMemo(() => {
    const value = spacerSizeMap[size];
    return axis === 'vertical' ? { height: value } : { width: value, display: 'inline-block' };
  }, [axis, size]);

  return <span aria-hidden="true" style={style} />;
}
