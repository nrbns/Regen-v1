/**
 * DeviceDetector - Capability Detection for Universal Compatibility
 * 
 * Detects device capabilities to enable adaptive features:
 * - WASM support (for offline AI)
 * - WebGL support (for graphics)
 * - RAM estimation (for memory management)
 * - CPU cores (for performance optimization)
 * - Low-end device detection (for reduced features)
 * 
 * Usage:
 *   const detector = new DeviceDetector();
 *   const caps = detector.detectCapabilities();
 *   if (caps.isLowEnd) {
 *     // Use reduced feature set
 *   }
 */

export interface DeviceCapabilities {
  hasWASM: boolean;
  hasWebGL: boolean;
  hasWebGL2: boolean;
  hasServiceWorker: boolean;
  hasIndexedDB: boolean;
  hasLocalStorage: boolean;
  ramEstimate: number; // GB
  cpuCores: number;
  isLowEnd: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  userAgent: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  connectionType?: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'ethernet' | 'unknown';
  batteryLevel?: number; // 0-1
  isCharging?: boolean;
}

export class DeviceDetector {
  private cachedCapabilities: DeviceCapabilities | null = null;

  /**
   * Detect all device capabilities
   */
  detectCapabilities(): DeviceCapabilities {
    if (this.cachedCapabilities) {
      return this.cachedCapabilities;
    }

    const capabilities: DeviceCapabilities = {
      hasWASM: this.detectWASM(),
      hasWebGL: this.detectWebGL(),
      hasWebGL2: this.detectWebGL2(),
      hasServiceWorker: this.detectServiceWorker(),
      hasIndexedDB: this.detectIndexedDB(),
      hasLocalStorage: this.detectLocalStorage(),
      ramEstimate: this.estimateRAM(),
      cpuCores: this.detectCPUCores(),
      isLowEnd: false, // Will be calculated below
      isMobile: this.detectMobile(),
      isTablet: this.detectTablet(),
      isDesktop: this.detectDesktop(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      pixelRatio: window.devicePixelRatio || 1,
      connectionType: this.detectConnectionType(),
    };

    // Detect battery status (if available)
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        capabilities.batteryLevel = battery.level;
        capabilities.isCharging = battery.charging;
      }).catch(() => {
        // Battery API not available or failed
      });
    }

    // Calculate if device is low-end
    capabilities.isLowEnd = this.isLowEndDevice(capabilities);

    this.cachedCapabilities = capabilities;
    return capabilities;
  }

  /**
   * Detect WebAssembly support
   */
  private detectWASM(): boolean {
    try {
      return typeof WebAssembly !== 'undefined' && 
             typeof WebAssembly.instantiate === 'function';
    } catch {
      return false;
    }
  }

  /**
   * Detect WebGL support
   */
  private detectWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch {
      return false;
    }
  }

  /**
   * Detect WebGL2 support
   */
  private detectWebGL2(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      return !!gl;
    } catch {
      return false;
    }
  }

  /**
   * Detect Service Worker support
   */
  private detectServiceWorker(): boolean {
    return 'serviceWorker' in navigator;
  }

  /**
   * Detect IndexedDB support
   */
  private detectIndexedDB(): boolean {
    try {
      return 'indexedDB' in window && !!window.indexedDB;
    } catch {
      return false;
    }
  }

  /**
   * Detect LocalStorage support
   */
  private detectLocalStorage(): boolean {
    try {
      const test = '__redix_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Estimate RAM (in GB)
   */
  private estimateRAM(): number {
    // Use deviceMemory API if available (Chrome/Edge)
    if ('deviceMemory' in navigator) {
      return (navigator as any).deviceMemory || 4;
    }
    
    // Fallback: Estimate based on user agent and platform
    const ua = navigator.userAgent.toLowerCase();
    // const platform = navigator.platform.toLowerCase(); // Unused for now
    
    // Mobile devices typically have 2-8GB
    if (this.detectMobile() || this.detectTablet()) {
      // High-end mobile: 6-8GB
      if (ua.includes('iphone 1') || ua.includes('iphone 12') || ua.includes('iphone 13') || 
          ua.includes('iphone 14') || ua.includes('iphone 15')) {
        return 6;
      }
      // Mid-range mobile: 4GB
      if (ua.includes('iphone') || ua.includes('android')) {
        return 4;
      }
      // Low-end mobile: 2GB
      return 2;
    }
    
    // Desktop: Assume 8GB minimum
    return 8;
  }

  /**
   * Detect CPU cores
   */
  private detectCPUCores(): number {
    return navigator.hardwareConcurrency || 2;
  }

  /**
   * Detect if device is low-end
   */
  private isLowEndDevice(caps: Partial<DeviceCapabilities>): boolean {
    const ram = caps.ramEstimate || 4;
    const cores = caps.cpuCores || 2;
    const hasWASM = caps.hasWASM !== false;
    
    // Low-end criteria:
    // - Less than 2GB RAM
    // - Less than 2 CPU cores
    // - No WASM support
    // - Mobile device with low RAM
    if (ram < 2) return true;
    if (cores < 2) return true;
    if (!hasWASM && (caps.isMobile || caps.isTablet)) return true;
    if (ram < 4 && cores < 4 && (caps.isMobile || caps.isTablet)) return true;
    
    return false;
  }

  /**
   * Detect mobile device
   */
  private detectMobile(): boolean {
    const ua = navigator.userAgent.toLowerCase();
    return /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua) &&
           !this.detectTablet();
  }

  /**
   * Detect tablet device
   */
  private detectTablet(): boolean {
    const ua = navigator.userAgent.toLowerCase();
    const hasTouch = (navigator.maxTouchPoints ?? 0) > 2;
    return Boolean(
      /ipad|android(?!.*mobile)|tablet|playbook|silk/i.test(ua) ||
      (hasTouch && /MacIntel/.test(navigator.platform))
    );
  }

  /**
   * Detect desktop device
   */
  private detectDesktop(): boolean {
    return !this.detectMobile() && !this.detectTablet();
  }

  /**
   * Detect connection type
   */
  private detectConnectionType(): DeviceCapabilities['connectionType'] {
    if ('connection' in navigator) {
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (conn) {
        const effectiveType = conn.effectiveType;
        if (effectiveType === 'slow-2g' || effectiveType === '2g') return '2g';
        if (effectiveType === '3g') return '3g';
        if (effectiveType === '4g') return '4g';
      }
    }
    
    // Fallback: Assume unknown
    return 'unknown';
  }

  /**
   * Get recommended feature set based on capabilities
   */
  getRecommendedFeatures(caps?: DeviceCapabilities): {
    useWASMAI: boolean;
    useCloudAI: boolean;
    useDOMPooling: boolean;
    useServiceWorker: boolean;
    maxTabs: number;
    enableAnimations: boolean;
    enableWebGL: boolean;
  } {
    const capabilities = caps || this.detectCapabilities();
    
    return {
      useWASMAI: capabilities.hasWASM && !capabilities.isLowEnd,
      useCloudAI: !capabilities.isLowEnd && capabilities.ramEstimate >= 4,
      useDOMPooling: true, // Always use pooling for memory efficiency
      useServiceWorker: capabilities.hasServiceWorker && !capabilities.isLowEnd,
      maxTabs: capabilities.isLowEnd ? 3 : capabilities.ramEstimate < 4 ? 5 : 10,
      enableAnimations: !capabilities.isLowEnd && capabilities.ramEstimate >= 4,
      enableWebGL: capabilities.hasWebGL && !capabilities.isLowEnd,
    };
  }

  /**
   * Clear cached capabilities (useful for testing or when device state changes)
   */
  clearCache(): void {
    this.cachedCapabilities = null;
  }
}

// Singleton instance
let deviceDetectorInstance: DeviceDetector | null = null;

/**
 * Get the global DeviceDetector instance
 */
export function getDeviceDetector(): DeviceDetector {
  if (!deviceDetectorInstance) {
    deviceDetectorInstance = new DeviceDetector();
  }
  return deviceDetectorInstance;
}

/**
 * Quick capability check (convenience function)
 */
export function detectDeviceCapabilities(): DeviceCapabilities {
  return getDeviceDetector().detectCapabilities();
}

/**
 * Check if device is low-end
 */
export function isLowEndDevice(): boolean {
  return getDeviceDetector().detectCapabilities().isLowEnd;
}

