/**
 * Real-Time Job Progress Indicator
 * Shows reconnect/resume status visually to the user
 */

import { useState, useEffect } from 'react';
import { useJobProgress } from '../../hooks/useJobProgress';

interface RealtimeStatusProps {
  jobId: string;
  className?: string;
}

export function RealtimeStatus({ jobId: _jobId, className = '' }: RealtimeStatusProps) {
  const { connection, lastSequence } = useJobProgress(_jobId);

  const isConnected = connection.socketStatus === 'connected';
  const isResuming = connection.socketStatus === 'connecting';
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    // Show status indicator during reconnect or resume
    if (!isConnected || isResuming) {
      setShowStatus(true);
    } else {
      // Fade out after stabilized
      const timer = setTimeout(() => setShowStatus(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, isResuming]);

  if (!showStatus && isConnected && !isResuming) {
    return null;
  }

  return (
    <div className={`realtime-status ${className}`}>
      {!isConnected && (
        <div className="status-indicator offline">
          <div className="spinner" />
          <span className="status-text">Offline - Retrying...</span>
        </div>
      )}

      {isConnected && isResuming && (
        <div className="status-indicator resuming">
          <div className="spinner" />
          <span className="status-text">Resuming from checkpoint (sequence: {lastSequence})</span>
        </div>
      )}

      {isConnected && !isResuming && (
        <div className="status-indicator connected">
          <div className="check-mark" />
          <span className="status-text">Connected</span>
        </div>
      )}

      <style>{`
        .realtime-status {
          padding: 12px 16px;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.05);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
        }

        .status-indicator.offline {
          color: #dc2626;
        }

        .status-indicator.resuming {
          color: #2563eb;
        }

        .status-indicator.connected {
          color: #16a34a;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid currentColor;
          border-right-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .check-mark {
          width: 16px;
          height: 16px;
          border: 2px solid currentColor;
          border-top: none;
          border-left: none;
          transform: rotate(45deg);
          margin-right: 2px;
        }

        .status-text {
          font-weight: 500;
          flex: 1;
        }
      `}</style>
    </div>
  );
}

export default RealtimeStatus;
