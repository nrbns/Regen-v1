import { useEffect, useState } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export interface BreakpointConfig {
  mobile: number;
  tablet: number;
  desktop: number;
}

export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(false);
  const [_isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const check = () => {
      try {
        const ua = navigator.userAgent || '';
        const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const smallViewport = window.innerWidth <= 768;
        const tabletViewport = window.innerWidth > 768 && window.innerWidth <= 1080;
        const mobileDetected = mobileUA.test(ua) || smallViewport;
        setIsMobile(mobileDetected);
        setIsTablet(!mobileDetected && tabletViewport);
      } catch {
        setIsMobile(false);
        setIsTablet(false);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return { isMobile };
}
