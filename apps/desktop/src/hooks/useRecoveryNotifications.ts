/**
 * useRecoveryNotifications Hook
 * Listens to realtime events for job recovery and failures
 */

import { useEffect, useState } from 'react';
import { getSocketClient } from '../services/socket';

export interface RecoveryNotification {
  type: 'paused' | 'failed';
  jobId: string;
  userId?: string;
  progress?: number;
  step?: string;
  reason?: string;
  timestamp: number;
}

export function useRecoveryNotifications(jobId?: string | null) {
  const [notifications, setNotifications] = useState<RecoveryNotification[]>([]);

  useEffect(() => {
    let unsubRecovery: (() => void) | null = null;
    let unsubFailed: (() => void) | null = null;
    try {
      const socket = getSocketClient();

      // Listen for supervisor recovery events
      unsubRecovery = socket.on('job:recovery', (data: any) => {
        if (jobId && data.jobId !== jobId) return;
        const notif: RecoveryNotification = {
          type: data.status === 'failed' ? 'failed' : 'paused',
          jobId: data.jobId,
          progress: data.progress,
          step: data.step,
          reason: data.reason,
          timestamp: data.timestamp || Date.now(),
        };
        setNotifications(prev => [...prev, notif].slice(-5));
      });

      // Also listen for explicit job failed events
      unsubFailed = socket.on('job:failed', (data: any) => {
        if (jobId && data.jobId !== jobId) return;
        const notif: RecoveryNotification = {
          type: 'failed',
          jobId: data.jobId,
          reason: data.error || 'Job failed',
          timestamp: data.timestamp || Date.now(),
        };
        setNotifications(prev => [...prev, notif].slice(-5));
      });
    } catch {
      // Socket might not be initialized yet
    }

    return () => {
      unsubRecovery?.();
      unsubFailed?.();
    };
  }, [jobId]);

  const clear = () => setNotifications([]);

  return { notifications, clear };
}
