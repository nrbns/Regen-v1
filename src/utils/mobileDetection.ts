// Simple replacement for removed mobile detection hook
// Since this is a desktop browser, always return false for mobile

export function useMobileDetection() {
  return {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  };
}
