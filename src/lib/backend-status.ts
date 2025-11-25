let backendAvailable = true;
let offlineSince: number | null = null;
const listeners = new Set<(online: boolean) => void>();
const RETRY_INTERVAL_MS = 8000;

export function isBackendAvailable(): boolean {
  return backendAvailable;
}

export function canAttemptBackendRequest(): boolean {
  if (backendAvailable) {
    return true;
  }
  if (offlineSince === null) {
    return true;
  }
  return Date.now() - offlineSince >= RETRY_INTERVAL_MS;
}

export function markBackendAvailable() {
  if (!backendAvailable) {
    backendAvailable = true;
    offlineSince = null;
    listeners.forEach(listener => {
      try {
        listener(true);
      } catch (error) {
        console.warn('[BackendStatus] Listener failed while marking online:', error);
      }
    });
  }
}

export function markBackendUnavailable(reason?: unknown) {
  if (backendAvailable) {
    backendAvailable = false;
  }
  offlineSince = Date.now();
  if (reason && process.env.NODE_ENV !== 'production') {
    console.warn('[BackendStatus] Backend marked offline:', reason);
  }
  listeners.forEach(listener => {
    try {
      listener(false);
    } catch (error) {
      console.warn('[BackendStatus] Listener failed while marking offline:', error);
    }
  });
}

export function onBackendStatusChange(listener: (online: boolean) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
