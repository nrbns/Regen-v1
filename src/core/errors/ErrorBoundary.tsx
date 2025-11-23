/**
 * Enhanced Error Boundary - Tier 2
 * Global error boundary with retry logic, toast reporting, and structured logging
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from '../../utils/toast';
import { log } from '../../utils/logger';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  retryable?: boolean;
  level?: 'component' | 'page' | 'global';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  copyStatus: 'idle' | 'success' | 'error';
}

const MAX_RETRIES = 3;

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      copyStatus: 'idle',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { componentName, level = 'component', onError } = this.props;

    // Structured logging
    log.error(
      `ErrorBoundary [${level}]${componentName ? ` in ${componentName}` : ''}:`,
      error.message,
      errorInfo.componentStack
    );

    // Store error info
    this.setState({
      error,
      errorInfo,
    });

    // Toast notification
    toast.error(
      `Error in ${componentName || 'component'}. ${this.props.retryable ? 'Retrying...' : 'Check console for details.'}`
    );

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // Send to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  }

  private handleRetry = () => {
    const { retryCount } = this.state;
    const { retryable = true } = this.props;

    if (!retryable || retryCount >= MAX_RETRIES) {
      toast.warning('Maximum retry attempts reached. Please reload the app.');
      return;
    }

    log.info(`Retrying after error (attempt ${retryCount + 1}/${MAX_RETRIES})`);

    this.setState(prev => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }));

    toast.info(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleCopyError = async () => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    const errorReport = `
Error Report
============
Component: ${this.props.componentName || 'Unknown'}
Time: ${new Date().toISOString()}
Retry Count: ${this.state.retryCount}

Error Message:
${error.message}

Stack Trace:
${error.stack || 'No stack trace available'}

Component Stack:
${errorInfo?.componentStack || 'No component stack available'}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorReport);
      this.setState({ copyStatus: 'success' });
      toast.success('Error details copied to clipboard');
      setTimeout(() => this.setState({ copyStatus: 'idle' }), 2000);
    } catch (err) {
      this.setState({ copyStatus: 'error' });
      toast.error('Failed to copy error details');
      log.error('Failed to copy error details', err);
    }
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      const { fallback, componentName, retryable = true } = this.props;
      const { error, retryCount } = this.state;

      if (fallback) {
        return fallback;
      }

      const canRetry = retryable && retryCount < MAX_RETRIES;

      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 px-6 py-12 text-gray-100">
          <div className="w-full max-w-xl space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-500/20 p-2 text-red-200">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h1 className="text-lg font-semibold text-red-200">
                  Something went wrong{componentName ? ` in ${componentName}` : ''}
                </h1>
                {error?.message && (
                  <p className="mt-2 text-sm text-red-100/80 font-mono">{error.message}</p>
                )}
                <p className="mt-2 text-sm text-gray-400">
                  {canRetry
                    ? 'The app will attempt to recover automatically. You can also retry manually or reload.'
                    : 'Please reload the app to continue. Error details have been logged.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="flex items-center gap-2 rounded-lg border border-blue-500/50 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-100 hover:border-blue-500/70 transition-colors"
                >
                  <RefreshCw size={16} />
                  Retry ({retryCount + 1}/{MAX_RETRIES})
                </button>
              )}
              <button
                onClick={this.handleReload}
                className="rounded-lg border border-blue-500/50 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-100 hover:border-blue-500/70 transition-colors"
              >
                Reload App
              </button>
              <button
                onClick={this.handleCopyError}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  this.state.copyStatus === 'success'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100'
                    : this.state.copyStatus === 'error'
                      ? 'border-red-500/50 bg-red-500/10 text-red-100'
                      : 'border-slate-700/50 bg-slate-800/50 text-gray-300 hover:border-slate-600/50'
                }`}
              >
                {this.state.copyStatus === 'success' ? (
                  <>
                    <CheckCircle2 size={16} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy Error
                  </>
                )}
              </button>
            </div>

            {retryCount >= MAX_RETRIES && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                <p className="font-medium">Maximum retries reached</p>
                <p className="mt-1 text-xs text-amber-200/80">
                  Please reload the app. If the error persists, check the console for details.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Global Error Boundary - Wrap app root
 */
export function GlobalErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary level="global" componentName="App" retryable={true}>
      {children}
    </ErrorBoundary>
  );
}
