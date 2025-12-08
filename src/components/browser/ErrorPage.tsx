/**
 * Error Page Component
 * Displays error messages for failed page loads with retry options
 */

import { AlertTriangle, RefreshCw, Home, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ErrorPageProps {
  error: {
    code?: string;
    message?: string;
    url?: string;
  };
  onRetry?: () => void;
  onGoHome?: () => void;
  className?: string;
}

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  'ERR_INTERNET_DISCONNECTED': {
    title: 'No Internet Connection',
    description: 'Check your internet connection and try again.',
  },
  'ERR_NAME_NOT_RESOLVED': {
    title: 'Can\'t Find This Website',
    description: 'The site might be down or the URL might be incorrect.',
  },
  'ERR_CONNECTION_REFUSED': {
    title: 'Connection Refused',
    description: 'The server is not accepting connections.',
  },
  'ERR_CONNECTION_TIMED_OUT': {
    title: 'Connection Timed Out',
    description: 'The server took too long to respond.',
  },
  'ERR_CONNECTION_RESET': {
    title: 'Connection Reset',
    description: 'The connection was interrupted.',
  },
  'ERR_SSL_PROTOCOL_ERROR': {
    title: 'SSL Protocol Error',
    description: 'There was a problem with the secure connection.',
  },
  'ERR_CERT_AUTHORITY_INVALID': {
    title: 'Invalid Certificate',
    description: 'The security certificate is not valid.',
  },
  'ERR_BLOCKED_BY_CLIENT': {
    title: 'Blocked by Ad Blocker',
    description: 'This page was blocked by your ad blocker or privacy settings.',
  },
  'X-Frame-Options': {
    title: 'Cannot Display Page',
    description: 'This site cannot be displayed in a frame due to security restrictions.',
  },
  'CORS': {
    title: 'Cross-Origin Restriction',
    description: 'This site cannot be loaded due to cross-origin restrictions.',
  },
  default: {
    title: 'Failed to Load Page',
    description: 'An error occurred while loading this page.',
  },
};

export function ErrorPage({ error, onRetry, onGoHome, className }: ErrorPageProps) {
  const errorInfo = ERROR_MESSAGES[error.code || ''] || ERROR_MESSAGES.default;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-full p-8 bg-slate-950 text-slate-100',
        className
      )}
    >
      <div className="max-w-md w-full text-center space-y-6">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-red-500/20 border border-red-500/30">
            <AlertTriangle size={48} className="text-red-400" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">{errorInfo.title}</h1>
          <p className="text-slate-400">{errorInfo.description}</p>
          {error.message && (
            <p className="text-sm text-slate-500 mt-2">{error.message}</p>
          )}
        </div>

        {/* URL Display */}
        {error.url && (
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
            <p className="text-xs text-slate-500 mb-1">URL:</p>
            <p className="text-sm text-slate-300 break-all">{error.url}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              <RefreshCw size={18} />
              Retry
            </button>
          )}
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
            >
              <Home size={18} />
              Go Home
            </button>
          )}
          {error.url && (
            <a
              href={error.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
            >
              <ExternalLink size={18} />
              Open Externally
            </a>
          )}
        </div>

        {/* Help Text */}
        <p className="text-xs text-slate-500 mt-6">
          If this problem persists, try opening the URL in an external browser or check your
          internet connection.
        </p>
      </div>
    </div>
  );
}


