/**
 * Network Monitor - Tracks when data leaves device
 * 
 * ENFORCEMENT: NET status only shows "Sending" when user action triggers network call
 * This is honest monitoring - no fake network activity
 */

import { eventBus } from '../execution/eventBus';

type NetworkStatus = 'idle' | 'sending' | 'receiving';

let currentStatus: NetworkStatus = 'idle';
let statusListeners: Array<(status: NetworkStatus) => void> = [];

/**
 * Set network status (only called when actual network activity happens)
 */
export function setNetworkStatus(status: NetworkStatus): void {
  if (currentStatus === status) {
    return; // No change
  }

  currentStatus = status;
  
  // Notify listeners
  statusListeners.forEach(listener => listener(status));
  
  // Emit event
  eventBus.emit('network:status', { status });
}

/**
 * Get current network status
 */
export function getNetworkStatus(): NetworkStatus {
  return currentStatus;
}

/**
 * Subscribe to network status changes
 */
export function onNetworkStatusChange(listener: (status: NetworkStatus) => void): () => void {
  statusListeners.push(listener);
  
  // Call immediately with current status
  listener(currentStatus);
  
  // Return unsubscribe
  return () => {
    statusListeners = statusListeners.filter(l => l !== listener);
  };
}

/**
 * Track network request (call this when user action triggers network call)
 * 
 * ENFORCEMENT: Only call this when user explicitly triggers network activity
 * 
 * NOTE: This is a manual tracking function. The fetch interceptor handles
 * automatic tracking for most cases. Use this only for special cases.
 */
export function trackNetworkRequest(
  taskId: string,
  url: string,
  method: string = 'GET'
): () => void {
  // Mark as sending
  setNetworkStatus('sending');
  
  // Return cleanup function to mark as idle when done
  return () => {
    // Mark as idle after short delay (allows for response processing)
    setTimeout(() => {
      setNetworkStatus('idle');
    }, 100);
  };
}

/**
 * Monitor fetch API (intercept network calls)
 * 
 * ENFORCEMENT: Only tracks user-initiated network calls (those with active tasks)
 */
export function initializeNetworkMonitoring(): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Track active requests
  const activeRequests = new Set<string>();
  
  // Intercept fetch calls
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args: Parameters<typeof fetch>): Promise<Response> {
    const [input, init] = args;
    const url = typeof input === 'string' ? input : input.url;
    const method = init?.method || 'GET';
    const requestId = `${Date.now()}-${Math.random()}`;
    
    // Only track if this is a user-initiated request (has task context)
    // We check if there's an active task that might have triggered this
    const { getRunningTasks } = require('../execution/taskManager');
    const runningTasks = getRunningTasks();
    
    if (runningTasks.length > 0) {
      // User-initiated request (has active task)
      activeRequests.add(requestId);
      setNetworkStatus('sending');
      
      try {
        const response = await originalFetch(...args);
        
        // Mark as receiving if response is being read
        if (response.ok) {
          setNetworkStatus('receiving');
          
          // Clone response to read body without consuming it
          const clonedResponse = response.clone();
          clonedResponse.text().then(() => {
            // After reading, mark as idle if no other requests
            activeRequests.delete(requestId);
            if (activeRequests.size === 0) {
              setNetworkStatus('idle');
            }
          }).catch(() => {
            activeRequests.delete(requestId);
            if (activeRequests.size === 0) {
              setNetworkStatus('idle');
            }
          });
        } else {
          activeRequests.delete(requestId);
          if (activeRequests.size === 0) {
            setNetworkStatus('idle');
          }
        }
        
        return response;
      } catch (error) {
        activeRequests.delete(requestId);
        if (activeRequests.size === 0) {
          setNetworkStatus('idle');
        }
        throw error;
      }
    } else {
      // No active task - this is a background/system call
      // Don't track it (honest monitoring - only user actions show network activity)
      return originalFetch(...args);
    }
  };
  
  console.log('[NetworkMonitor] Network monitoring initialized (user-initiated only)');
}

// Initialize on load
if (typeof window !== 'undefined') {
  initializeNetworkMonitoring();
}
