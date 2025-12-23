/**
 * Mobile Error Boundary
 * Catches errors in mobile components and shows a friendly message
 */

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MobileErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[MobileErrorBoundary] Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <MobileErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

function MobileErrorFallback({ error }: { error: Error | null }) {
  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="safe-top safe-bottom fixed inset-0 flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md rounded-lg bg-gray-800 p-6 text-center">
        <div className="mb-4 flex justify-center">
          <AlertTriangle className="h-12 w-12 text-yellow-400" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-white">Something went wrong</h2>
        <p className="mb-6 text-sm text-gray-400">
          {error?.message || 'An unexpected error occurred'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleReload}
            className="flex min-h-[44px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <RefreshCw className="h-4 w-4" />
            Reload
          </button>
          <button
            onClick={handleGoHome}
            className="flex min-h-[44px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-lg bg-gray-700 px-4 py-3 font-medium text-white transition-colors hover:bg-gray-600"
          >
            <Home className="h-4 w-4" />
            Home
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-4 text-left">
            <summary className="mb-2 cursor-pointer text-xs text-gray-400">Error details</summary>
            <pre className="max-h-32 overflow-auto rounded bg-gray-900 p-2 text-xs text-red-400">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
