import { forwardRef } from 'react';

import { cn } from '../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, leadingIcon, trailingIcon, disabled, ...props }, ref) => {
    return (
      <label
        className={cn(
          'inline-flex h-11 items-center gap-2 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] px-3 text-sm text-[var(--text-primary)] transition focus-within:border-[var(--surface-border-strong)] focus-within:ring-2 focus-within:ring-[var(--accent)]',
          disabled && 'opacity-60 cursor-not-allowed',
          className
        )}
      >
        {leadingIcon && <span className="text-[var(--text-muted)]">{leadingIcon}</span>}
        <input
          {...props}
          ref={ref}
          disabled={disabled}
          className="h-full flex-1 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
        />
        {trailingIcon && <span className="text-[var(--text-muted)]">{trailingIcon}</span>}
      </label>
    );
  }
);

Input.displayName = 'Input';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, label, disabled, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">{label}</p>
      )}
      <textarea
        {...props}
        ref={ref}
        disabled={disabled}
        className={cn(
          'w-full rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition focus:border-[var(--surface-border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]',
          disabled && 'opacity-60 cursor-not-allowed',
          className
        )}
      />
    </div>
  )
);

TextArea.displayName = 'TextArea';
