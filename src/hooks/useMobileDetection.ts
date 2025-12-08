/**
 * Mobile Detection Hook
 * Detects mobile/tablet/desktop breakpoints and provides responsive utilities
 */

import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'large';

export interface BreakpointConfig {
  mobile: number; // < 768px
  tablet: number; // 768-1024px
  desktop: number; // 1024-1440px
  large: number; // > 1440px
}

const DEFAULT_BREAKPOINTS: BreakpointConfig = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
  large: 1920,
};

/**
 * Detect current device type based on viewport width
 */
export function detectDeviceType(
  width: number,
  breakpoints: BreakpointConfig = DEFAULT_BREAKPOINTS
): DeviceType {
  if (width < breakpoints.mobile) {
    return 'mobile';
  } else if (width < breakpoints.tablet) {
    return 'tablet';
  } else if (width < breakpoints.desktop) {
    return 'desktop';
  } else {
    return 'large';
  }
}

/**
 * Hook to detect device type and viewport width
 */
export function useMobileDetection(breakpoints?: BreakpointConfig) {
  const [deviceType, setDeviceType] = useState<DeviceType>(() => {
    if (typeof window === 'undefined') return 'desktop';
    return detectDeviceType(window.innerWidth, breakpoints);
  });

  const [viewportWidth, setViewportWidth] = useState(() => {
    if (typeof window === 'undefined') return 1920;
    return window.innerWidth;
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setViewportWidth(width);
      setDeviceType(detectDeviceType(width, breakpoints));
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoints]);

  return {
    deviceType,
    viewportWidth,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop' || deviceType === 'large',
    isLarge: deviceType === 'large',
  };
}


