import { cn } from '../lib/utils';

type HeadingSize = 'xs' | 'sm' | 'md' | 'lg';

const headingSizeMap: Record<HeadingSize, string> = {
  xs: 'text-base sm:text-lg',
  sm: 'text-xl sm:text-2xl',
  md: 'text-2xl sm:text-3xl',
  lg: 'text-3xl sm:text-4xl',
};

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  size?: HeadingSize;
  eyebrow?: string;
}

export function Heading({ size = 'md', eyebrow, className, children, ...props }: HeadingProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {eyebrow && (
        <p className="text-[11px] uppercase tracking-[0.35em] text-[var(--text-muted)]">
          {eyebrow}
        </p>
      )}
      <h2
        {...props}
        className={cn(
          'font-semibold tracking-tight text-[var(--text-primary)]',
          headingSizeMap[size]
        )}
      >
        {children}
      </h2>
    </div>
  );
}

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  muted?: boolean;
  subtle?: boolean;
}

export function Text({ muted, subtle, className, children, ...props }: TextProps) {
  return (
    <p
      {...props}
      className={cn(
        'text-sm leading-relaxed',
        muted && 'text-[var(--text-muted)]',
        subtle && 'text-xs uppercase tracking-[0.28em] text-[var(--text-muted)]',
        !muted && !subtle && 'text-[var(--text-primary)]',
        className
      )}
    >
      {children}
    </p>
  );
}
