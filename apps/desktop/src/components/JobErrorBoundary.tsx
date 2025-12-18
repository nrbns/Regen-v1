import React from 'react';

interface JobErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
  onDiagnostics?: () => void;
}

interface JobErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

// Error boundary for job UI surfaces with recovery affordances
export class JobErrorBoundary extends React.Component<
  JobErrorBoundaryProps,
  JobErrorBoundaryState
> {
  constructor(props: JobErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any): JobErrorBoundaryState {
    return { hasError: true, message: error?.message || 'Unexpected error' };
  }

  componentDidCatch(error: any, info: any) {
    console.error('[JobErrorBoundary]', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: undefined });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-2 rounded border border-red-700 bg-red-900/50 p-3 text-sm text-red-100">
          <div className="font-semibold">Something went wrong</div>
          <div className="text-xs">{this.state.message}</div>
          <div className="flex gap-2">
            <button
              onClick={this.handleReset}
              className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
            >
              Try again
            </button>
            <button
              onClick={this.props.onDiagnostics}
              className="rounded border border-slate-600 bg-slate-800 px-3 py-1 text-xs text-white hover:bg-slate-700"
            >
              Diagnostics
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default JobErrorBoundary;
