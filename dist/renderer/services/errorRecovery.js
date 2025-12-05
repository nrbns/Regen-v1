/**
 * Error Recovery - Auto-restart and graceful degradation
 */
import { toast } from '../utils/toast';
let crashCount = 0;
const MAX_CRASHES = 3;
const CRASH_WINDOW_MS = 60000; // 1 minute
const crashHistory = [];
/**
 * Record a crash and attempt recovery
 */
export function recordCrash(error, context) {
    const now = Date.now();
    crashHistory.push(now);
    // Remove crashes older than window
    while (crashHistory.length > 0 && now - crashHistory[0] > CRASH_WINDOW_MS) {
        crashHistory.shift();
    }
    crashCount = crashHistory.length;
    console.error('[ErrorRecovery] Crash recorded:', error, context);
    // If too many crashes, show warning
    if (crashCount >= MAX_CRASHES) {
        toast.error(`Multiple crashes detected. The app may be unstable. Consider restarting.`, { duration: 10000 });
    }
    // Attempt auto-recovery
    attemptRecovery(error, context);
}
/**
 * Attempt to recover from crash
 */
function attemptRecovery(error, _context) {
    // Clear caches
    try {
        if (typeof window !== 'undefined' && window.caches) {
            caches.keys().then(keys => {
                keys.forEach(key => caches.delete(key));
            });
        }
    }
    catch {
        // Cache cleanup failed
    }
    // Clear localStorage if corrupted
    if (error.message.includes('QuotaExceeded') || error.message.includes('storage')) {
        try {
            localStorage.clear();
            console.log('[ErrorRecovery] Cleared localStorage due to storage error');
        }
        catch {
            // Clear failed
        }
    }
    // Reload if critical error
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
        setTimeout(() => {
            if (confirm('A critical error occurred. Reload the app?')) {
                window.location.reload();
            }
        }, 1000);
    }
}
/**
 * Get crash count
 */
export function getCrashCount() {
    return crashCount;
}
/**
 * Reset crash count
 */
export function resetCrashCount() {
    crashCount = 0;
    crashHistory.length = 0;
}
