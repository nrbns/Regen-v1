/**
 * ErrorBoundary - Catch component errors and prevent app crashes
 * PRODUCTION CRITICAL: Prevents single component failures from crashing entire app
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;
  private MAX_RETRIES = 3;
  private RETRY_DELAY_MS = 1000;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    console.error('[ErrorBoundary]', {
      component: this.props.componentName || 'Unknown',
      error: error.message,
      stack: error.stack,
      errorInfo: errorInfo.componentStack,
    });

    // Update state with full error info
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Call optional handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // If too many errors, give up
    if (this.state.errorCount >= this.MAX_RETRIES) {
      console.error(
        `[ErrorBoundary] Max retries (${this.MAX_RETRIES}) exceeded for ${this.props.componentName}`
      );
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleRetry = () => {
    if (this.state.errorCount >= this.MAX_RETRIES) {
      console.warn('[ErrorBoundary] Max retries exceeded, cannot retry');
      return;
    }

    // Reset with delay to ensure cleanup
    this.retryTimeout = setTimeout(() => {
      this.handleReset();
    }, this.RETRY_DELAY_MS);
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      const isMaxedOut = this.state.errorCount >= this.MAX_RETRIES;

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-red-500/30 bg-red-500/5 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <div>
            <h3 className="font-semibold text-red-600">
              {this.props.componentName || 'Component'} Error
            </h3>
            <p className="mt-1 text-sm text-red-500/70">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="mt-3 max-h-40 w-full overflow-auto rounded bg-slate-900 p-2 text-left text-xs text-slate-300">
              <summary className="cursor-pointer font-mono text-xs font-semibold">
                Error Stack
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-words">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}

          <div className="flex gap-2">
            {!isMaxedOut && (
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                disabled={this.state.errorCount > 0}
              >
                <RefreshCw className="h-4 w-4" />
                Retry ({this.state.errorCount + 1}/{this.MAX_RETRIES})
              </button>
            )}
            <button
              onClick={this.handleReset}
              className="rounded bg-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-600"
            >
              Dismiss
            </button>
          </div>

          {isMaxedOut && (
            <p className="text-xs text-amber-600">
              Multiple errors detected. Please refresh the page if issues persist.
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
