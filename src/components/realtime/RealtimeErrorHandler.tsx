import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, X, Wifi, WifiOff, MicOff, Zap } from 'lucide-react';

interface RealtimeError {
  id: string;
  type: 'streaming' | 'voice' | 'connection' | 'performance' | 'general';
  message: string;
  details?: string;
  timestamp: number;
  canRetry: boolean;
  onRetry?: () => void;
  severity: 'low' | 'medium' | 'high';
}

interface RealtimeErrorHandlerProps {
  children: React.ReactNode;
}

/**
 * Realtime Error Handler - User-friendly error handling for realtime features
 *
 * Provides:
 * - Toast notifications for realtime errors
 * - Retry mechanisms
 * - Error recovery suggestions
 * - Non-intrusive error display
 */
export function RealtimeErrorHandler({ children }: RealtimeErrorHandlerProps) {
  const [errors, setErrors] = useState<RealtimeError[]>([]);

  // Global error listener
  useEffect(() => {
    const handleRealtimeError = (event: CustomEvent<RealtimeError>) => {
      addError(event.detail);
    };

    const handleStreamingError = (event: CustomEvent<{ message: string; canRetry?: boolean }>) => {
      addError({
        id: `streaming_${Date.now()}`,
        type: 'streaming',
        message: event.detail.message,
        canRetry: event.detail.canRetry ?? true,
        severity: 'medium',
        timestamp: Date.now(),
      });
    };

    const handleVoiceError = (event: CustomEvent<{ message: string }>) => {
      addError({
        id: `voice_${Date.now()}`,
        type: 'voice',
        message: event.detail.message,
        canRetry: true,
        severity: 'medium',
        timestamp: Date.now(),
      });
    };

    const handleConnectionError = (event: CustomEvent<{ message: string; reconnecting?: boolean }>) => {
      addError({
        id: `connection_${Date.now()}`,
        type: 'connection',
        message: event.detail.message,
        canRetry: !event.detail.reconnecting,
        severity: event.detail.reconnecting ? 'low' : 'medium',
        timestamp: Date.now(),
      });
    };

    // Listen for custom events
    window.addEventListener('realtime:error', handleRealtimeError as EventListener);
    window.addEventListener('streaming:error', handleStreamingError as EventListener);
    window.addEventListener('voice:error', handleVoiceError as EventListener);
    window.addEventListener('connection:error', handleConnectionError as EventListener);

    return () => {
      window.removeEventListener('realtime:error', handleRealtimeError as EventListener);
      window.removeEventListener('streaming:error', handleStreamingError as EventListener);
      window.removeEventListener('voice:error', handleVoiceError as EventListener);
      window.removeEventListener('connection:error', handleConnectionError as EventListener);
    };
  }, []);

  const addError = (error: RealtimeError) => {
    setErrors(prev => {
      // Prevent duplicate errors within 5 seconds
      const recentError = prev.find(e =>
        e.message === error.message &&
        Date.now() - e.timestamp < 5000
      );

      if (recentError) return prev;

      // Keep only last 3 errors
      const newErrors = [...prev, error].slice(-3);
      return newErrors;
    });

    // Auto-dismiss low severity errors after 5 seconds
    if (error.severity === 'low') {
      setTimeout(() => {
        dismissError(error.id);
      }, 5000);
    }
  };

  const dismissError = (errorId: string) => {
    setErrors(prev => prev.filter(e => e.id !== errorId));
  };

  const retryError = (error: RealtimeError) => {
    if (error.onRetry) {
      error.onRetry();
    } else {
      // Default retry actions based on error type
      switch (error.type) {
        case 'streaming':
          // Re-emit streaming restart event
          window.dispatchEvent(new CustomEvent('streaming:retry'));
          break;
        case 'voice':
          // Re-emit voice restart event
          window.dispatchEvent(new CustomEvent('voice:retry'));
          break;
        case 'connection':
          // Re-emit connection retry event
          window.dispatchEvent(new CustomEvent('connection:retry'));
          break;
        default:
          // No default action
          break;
      }
    }
    dismissError(error.id);
  };

  const getErrorIcon = (type: RealtimeError['type']) => {
    switch (type) {
      case 'streaming':
        return <Zap size={16} className="text-yellow-400" />;
      case 'voice':
        return <MicOff size={16} className="text-red-400" />;
      case 'connection':
        return <WifiOff size={16} className="text-orange-400" />;
      case 'performance':
        return <AlertTriangle size={16} className="text-red-400" />;
      default:
        return <AlertTriangle size={16} className="text-gray-400" />;
    }
  };

  const getErrorColor = (severity: RealtimeError['severity']) => {
    switch (severity) {
      case 'high':
        return 'border-red-500 bg-red-900/20';
      case 'medium':
        return 'border-yellow-500 bg-yellow-900/20';
      case 'low':
        return 'border-blue-500 bg-blue-900/20';
    }
  };

  return (
    <>
      {children}

      {/* Error Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {errors.map((error) => (
          <div
            key={error.id}
            className={`p-4 rounded-lg border backdrop-blur-sm shadow-lg animate-in slide-in-from-right-2 duration-300 ${getErrorColor(error.severity)}`}
          >
            <div className="flex items-start gap-3">
              {getErrorIcon(error.type)}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-white capitalize">
                    {error.type} Error
                  </h4>
                  <button
                    onClick={() => dismissError(error.id)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                <p className="text-sm text-gray-300 mt-1">
                  {error.message}
                </p>

                {error.details && (
                  <p className="text-xs text-gray-400 mt-1">
                    {error.details}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-3">
                  {error.canRetry && (
                    <button
                      onClick={() => retryError(error)}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                    >
                      <RefreshCw size={12} />
                      Retry
                    </button>
                  )}

                  {error.type === 'connection' && (
                    <div className="text-xs text-gray-400">
                      Will auto-reconnect when possible
                    </div>
                  )}

                  {error.type === 'performance' && (
                    <div className="text-xs text-yellow-400">
                      Realtime features throttled
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// Utility functions for dispatching realtime errors
export const dispatchRealtimeError = (error: Omit<RealtimeError, 'id' | 'timestamp'>) => {
  const fullError: RealtimeError = {
    id: `${error.type}_${Date.now()}`,
    timestamp: Date.now(),
    ...error,
  };

  window.dispatchEvent(new CustomEvent('realtime:error', { detail: fullError }));
};

export const dispatchStreamingError = (message: string, canRetry = true) => {
  window.dispatchEvent(new CustomEvent('streaming:error', {
    detail: { message, canRetry }
  }));
};

export const dispatchVoiceError = (message: string) => {
  window.dispatchEvent(new CustomEvent('voice:error', {
    detail: { message }
  }));
};

export const dispatchConnectionError = (message: string, reconnecting = false) => {
  window.dispatchEvent(new CustomEvent('connection:error', {
    detail: { message, reconnecting }
  }));
};
