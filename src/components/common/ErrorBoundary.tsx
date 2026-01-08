import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="mb-4 h-16 w-16 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">
            Something went wrong
          </h2>
          <p className="mb-6 max-w-md text-sm text-[var(--text-muted)]">
            {this.state.error?.message ||
              'An unexpected error occurred. Please try refreshing the page.'}
          </p>
          <div className="flex gap-3">
            <Button tone="primary" icon={<RefreshCw size={16} />} onClick={this.handleReset}>
              Try again
            </Button>
            <Button tone="secondary" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 w-full max-w-2xl text-left">
              <summary className="mb-2 cursor-pointer text-xs text-[var(--text-muted)]">
                Error details (development only)
              </summary>
              <pre className="max-h-64 overflow-auto rounded-lg bg-[var(--surface-elevated)] p-4 text-xs">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
