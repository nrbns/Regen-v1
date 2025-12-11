/**
 * Swipe Gesture Utilities
 * Provides swipe detection for mobile navigation
 */

export interface SwipeGestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // Minimum distance in pixels (default: 50)
  velocity?: number; // Minimum velocity in pixels/ms (default: 0.3)
}

export interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
}

/**
 * Creates a swipe gesture handler
 */
export function createSwipeHandler(config: SwipeGestureConfig) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    velocity = 0.3,
  } = config;

  let swipeState: SwipeState | null = null;

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    swipeState = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      currentX: touch.clientX,
      currentY: touch.clientY,
    };
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!swipeState) return;
    const touch = e.touches[0];
    swipeState.currentX = touch.clientX;
    swipeState.currentY = touch.clientY;
  };

  const handleTouchEnd = () => {
    if (!swipeState) return;

    const { startX, startY, currentX, currentY, startTime } = swipeState;
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;
    const deltaTime = Date.now() - startTime;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const speed = distance / deltaTime;

    // Check if swipe meets threshold and velocity requirements
    if (distance < threshold || speed < velocity) {
      swipeState = null;
      return;
    }

    // Determine swipe direction
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > absY) {
      // Horizontal swipe
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    } else {
      // Vertical swipe
      if (deltaY > 0 && onSwipeDown) {
        onSwipeDown();
      } else if (deltaY < 0 && onSwipeUp) {
        onSwipeUp();
      }
    }

    swipeState = null;
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}


