/**
 * Session Restore Hook
 * Persists and recovers job state across page reloads/crashes
 *
 * Features:
 * - Save active jobId + lastSequence to localStorage
 * - On app load: check for ongoing jobs
 * - Auto-subscribe and show "Resuming from X%" banner
 * - Resume streaming from lastSequence checkpoint
 * - Clear saved session on completion
 */

import { useEffect, useState } from 'react';
import { getSocketClient } from '../services/realtime/socketClient';

interface SessionState {
  jobId: string;
  lastSequence: number;
  progress: number;
  startTime: number;
  savedAt: number;
}

const SESSION_STORAGE_KEY = 'regen:session-restore';
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

/**
 * Save current job session
 */
export function saveJobSession(
  jobId: string,
  lastSequence: number,
  progress: number,
  startTime: number
): void {
  try {
    const session: SessionState = {
      jobId,
      lastSequence,
      progress,
      startTime,
      savedAt: Date.now(),
    };
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    console.log(`[SessionRestore] Saved session: job ${jobId} at sequence ${lastSequence}`);
  } catch (err) {
    console.warn('[SessionRestore] Failed to save session:', err);
  }
}

/**
 * Load saved session
 */
export function loadJobSession(): SessionState | null {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;

    const session: SessionState = JSON.parse(stored);

    // Check if session is stale (older than 1 hour)
    const ageMs = Date.now() - session.savedAt;
    if (ageMs > SESSION_TIMEOUT_MS) {
      console.log('[SessionRestore] Session expired');
      clearJobSession();
      return null;
    }

    console.log(
      `[SessionRestore] Loaded session: job ${session.jobId} (age: ${Math.round(ageMs / 1000)}s)`
    );
    return session;
  } catch (err) {
    console.warn('[SessionRestore] Failed to load session:', err);
    return null;
  }
}

/**
 * Clear saved session
 */
export function clearJobSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    console.log('[SessionRestore] Cleared saved session');
  } catch (err) {
    console.warn('[SessionRestore] Failed to clear session:', err);
  }
}

interface UseSessionRestoreOptions {
  /**
   * Called when a saved session is recovered
   */
  onRestore?: (session: SessionState) => void;

  /**
   * Auto-subscribe to restored job
   */
  autoSubscribe?: boolean;
}

interface SessionRestoreState {
  /**
   * Is there a saved session to restore?
   */
  hasSession: boolean;

  /**
   * The session data if restored
   */
  session: SessionState | null;

  /**
   * Is the restore currently in progress?
   */
  isRestoring: boolean;

  /**
   * Resume banner message
   */
  resumeBannerText: string;

  /**
   * Dismiss the resume banner
   */
  dismissBanner: () => void;
}

/**
 * React hook for session restore
 *
 * Usage:
 * ```tsx
 * const restore = useSessionRestore({
 *   onRestore: (session) => console.log('Recovered job:', session.jobId),
 *   autoSubscribe: true,
 * });
 *
 * if (restore.hasSession) {
 *   return <ResumeBanner message={restore.resumeBannerText} onDismiss={restore.dismissBanner} />;
 * }
 * ```
 */
export function useSessionRestore(options: UseSessionRestoreOptions = {}): SessionRestoreState {
  const [session, setSession] = useState<SessionState | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [_showBanner, setShowBanner] = useState(false);

  // On mount: check for saved session
  useEffect(() => {
    const savedSession = loadJobSession();
    if (!savedSession) return;

    console.log('[SessionRestore] Found saved session on mount');
    setSession(savedSession);
    setShowBanner(true);
    setIsRestoring(true);

    // Call callback if provided
    options.onRestore?.(savedSession);

    // Auto-subscribe if enabled
    if (options.autoSubscribe) {
      const restoreSubscription = async () => {
        try {
          const client = getSocketClient();
          if (!client) {
            console.warn('[SessionRestore] Socket client not available');
            return;
          }

          console.log(
            `[SessionRestore] Subscribing to job ${savedSession.jobId} from sequence ${savedSession.lastSequence}`
          );

          // Subscribe to job (socket client will handle resume from lastSequence)
          client.subscribeToJob(
            savedSession.jobId,
            progressData => {
              console.log('[SessionRestore] Received progress during restore:', progressData);
            },
            _completionData => {
              console.log('[SessionRestore] Job completed after restore');
              clearJobSession();
              setSession(null);
              setIsRestoring(false);
            },
            error => {
              console.error('[SessionRestore] Job failed after restore:', error);
              setIsRestoring(false);
            }
          );

          setIsRestoring(false);
        } catch (err) {
          console.error('[SessionRestore] Failed to restore:', err);
          setIsRestoring(false);
        }
      };

      restoreSubscription();
    }
  }, [options]);

  // Build resume banner text
  const progressPercent = session ? Math.round(session.progress) : 0;
  const resumeBannerText = isRestoring
    ? `Reconnecting to job (${progressPercent}%)...`
    : session
      ? `Session restored: ${session.jobId} at ${progressPercent}% complete`
      : '';

  return {
    hasSession: !!session,
    session,
    isRestoring,
    resumeBannerText,
    dismissBanner: () => {
      setShowBanner(false);
      if (!isRestoring) {
        clearJobSession();
        setSession(null);
      }
    },
  };
}

/**
 * Hook to save job state as it progresses
 * Call this in components that are rendering an active job
 */
export function useSaveJobSession(
  jobId: string | null,
  lastSequence: number,
  progress: number,
  startTime: number
): void {
  useEffect(() => {
    if (!jobId) return;

    // Save on a debounced interval to avoid excessive writes
    const interval = setInterval(() => {
      saveJobSession(jobId, lastSequence, progress, startTime);
    }, 5000); // Save every 5 seconds

    return () => clearInterval(interval);
  }, [jobId, lastSequence, progress, startTime]);
}

/**
 * Component to display resume banner
 */
export function SessionRestoreBanner({
  message,
  onDismiss,
  isRestoring,
}: {
  message: string;
  onDismiss: () => void;
  isRestoring: boolean;
}) {
  if (!message) return null;

  return (
    <div className="fixed right-4 top-20 z-50 flex max-w-xs items-center gap-3 rounded-lg border border-blue-500/50 bg-blue-500/20 px-4 py-3 text-sm text-blue-300">
      <div className="flex-1">{message}</div>
      <button
        onClick={onDismiss}
        disabled={isRestoring}
        className="text-blue-400 hover:text-blue-200 disabled:opacity-50"
      >
        ✕
      </button>
    </div>
  );
}
