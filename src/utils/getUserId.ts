/**
 * Get User ID - Helper for determinism system
 *
 * Returns a consistent user ID for the current session.
 * Falls back to anonymous if no user is logged in.
 */

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';

  let deviceId = localStorage.getItem('regen:deviceId');
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('regen:deviceId', deviceId);
  }
  return deviceId;
}

export function getUserId(): string {
  // Try to get from localStorage (if user is logged in)
  if (typeof window !== 'undefined') {
    const userId = localStorage.getItem('regen:userId');
    if (userId) return userId;

    // Check sessionStore or other stores for user ID
    try {
      const { useSessionStore } = require('../state/sessionStore');
      const _session = useSessionStore.getState();
      // If sessionStore has userId, use it
      // For now, fall back to device ID
    } catch {
      // Silently fail
    }
  }

  // Fall back to device ID (anonymous but consistent)
  return getDeviceId();
}
