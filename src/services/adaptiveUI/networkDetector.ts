/**
 * SPRINT 2: Network Detection Service
 * Detects network speed and connection quality for adaptive UI
 */

export type NetworkQuality = 'offline' | 'slow-2g' | '2g' | '3g' | '4g' | 'wifi';

interface NetworkInfo {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number; // Mbps
  saveData?: boolean;
  rtt?: number; // ms
}

/**
 * Get current network quality
 */
export function getNetworkQuality(): NetworkQuality {
  if (!navigator.onLine) {
    return 'offline';
  }

  // Check for save-data preference
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (connection) {
    const info: NetworkInfo = {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      saveData: connection.saveData,
      rtt: connection.rtt,
    };

    if (info.saveData) {
      return '2g'; // Treat save-data mode as slow connection
    }

    if (info.effectiveType) {
      switch (info.effectiveType) {
        case 'slow-2g':
          return 'slow-2g';
        case '2g':
          return '2g';
        case '3g':
          return '3g';
        case '4g':
          return '4g';
        default:
          return '3g'; // Default fallback
      }
    }

    // Use downlink speed if available
    if (info.downlink !== undefined) {
      if (info.downlink < 0.5) {
        return 'slow-2g';
      } else if (info.downlink < 1.5) {
        return '2g';
      } else if (info.downlink < 3) {
        return '3g';
      } else {
        return '4g';
      }
    }
  }

  // Fallback: assume good connection if online and no connection API
  return 'wifi';
}

/**
 * Check if network is low bandwidth
 */
export function isLowBandwidth(): boolean {
  const quality = getNetworkQuality();
  return quality === 'offline' || quality === 'slow-2g' || quality === '2g';
}

/**
 * Check if network supports full UI
 */
export function supportsFullUI(): boolean {
  const quality = getNetworkQuality();
  return quality === '4g' || quality === 'wifi';
}

/**
 * Listen for network changes
 */
export function onNetworkChange(callback: (quality: NetworkQuality) => void): () => void {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  const handleChange = () => {
    callback(getNetworkQuality());
  };

  if (connection) {
    connection.addEventListener('change', handleChange);
    return () => connection.removeEventListener('change', handleChange);
  }

  // Fallback: listen to online/offline events
  window.addEventListener('online', handleChange);
  window.addEventListener('offline', handleChange);
  
  return () => {
    window.removeEventListener('online', handleChange);
    window.removeEventListener('offline', handleChange);
  };
}

