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
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4 safe-top safe-bottom">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-6 text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="w-12 h-12 text-yellow-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
        <p className="text-gray-400 text-sm mb-6">
          {error?.message || 'An unexpected error occurred'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleReload}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors touch-manipulation min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4" />
            Reload
          </button>
          <button
            onClick={handleGoHome}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors touch-manipulation min-h-[44px]"
          >
            <Home className="w-4 h-4" />
            Home
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-4 text-left">
            <summary className="text-gray-400 text-xs cursor-pointer mb-2">Error details</summary>
            <pre className="text-xs text-red-400 bg-gray-900 p-2 rounded overflow-auto max-h-32">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

