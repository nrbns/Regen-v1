let backendAvailable = true;
let offlineSince = null;
const listeners = new Set();
const RETRY_INTERVAL_MS = 8000;
export function isBackendAvailable() {
    return backendAvailable;
}
export function canAttemptBackendRequest() {
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
            }
            catch (error) {
                console.warn('[BackendStatus] Listener failed while marking online:', error);
            }
        });
    }
}
export function markBackendUnavailable(reason) {
    if (backendAvailable) {
        backendAvailable = false;
    }
    offlineSince = Date.now();
    // Only warn if backend is expected (Electron/Tauri mode)
    // In web mode, backend offline is expected and shouldn't spam console
    if (reason && process.env.NODE_ENV !== 'production') {
        const isWebMode = typeof window !== 'undefined' && !window.__ELECTRON__ && !window.__TAURI__;
        if (!isWebMode) {
            console.warn('[BackendStatus] Backend marked offline:', reason);
        }
    }
    listeners.forEach(listener => {
        try {
            listener(false);
        }
        catch (error) {
            console.warn('[BackendStatus] Listener failed while marking offline:', error);
        }
    });
}
export function onBackendStatusChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
