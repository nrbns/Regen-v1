/**
 * Passive Avatar Reactions
 * Zero-cost liveliness through UI-only behavior tracking
 * PERFORMANCE: No AI calls, pure event emission
 */

import { useEffect } from 'react';
import { EventBus } from '../EventBus';
import { useRegenCore } from '../../../core/regen-core/regenCore.store';

/**
 * Track mouse movement speed and emit awareness events
 * Fast movement = user is searching/scanning
 * Slow movement = user is reading/focused
 */
export function useMouseMovementTracking() {
  const { state, setState } = useRegenCore();

  useEffect(() => {
    let lastX = 0;
    let lastY = 0;
    let lastTime = Date.now();
    let movementSpeed = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      const timeDelta = now - lastTime;
      
      if (timeDelta > 0) {
        const distance = Math.sqrt(
          Math.pow(e.clientX - lastX, 2) + Math.pow(e.clientY - lastY, 2)
        );
        movementSpeed = distance / timeDelta;
        
        // Fast movement (scanning)
        if (movementSpeed > 2 && state === 'observing') {
          setState('aware');
          EventBus.emit('MOUSE_MOVEMENT', { speed: 'fast', value: movementSpeed });
        }
        // Slow/stopped (focused)
        else if (movementSpeed < 0.5 && state === 'aware') {
          setTimeout(() => {
            if (useRegenCore.getState().state === 'aware') {
              setState('observing');
            }
          }, 2000);
        }
      }
      
      lastX = e.clientX;
      lastY = e.clientY;
      lastTime = now;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [state, setState]);
}

/**
 * Track typing pauses to detect "thinking" moments
 * Pause after typing = user is considering what they wrote
 */
export function useTypingPauseDetection() {
  const { setState } = useRegenCore();

  useEffect(() => {
    let typingTimeout: NodeJS.Timeout;
    let isTyping = false;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore navigation keys
      if (['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;

      clearTimeout(typingTimeout);
      
      if (!isTyping) {
        isTyping = true;
        EventBus.emit('TYPING_START', {});
      }

      // User paused typing for 1.5s = moment of consideration
      typingTimeout = setTimeout(() => {
        isTyping = false;
        EventBus.emit('TYPING_PAUSE', {});
        
        // Avatar reacts to pause (head tilt micro-animation)
        setState('aware');
        setTimeout(() => {
          if (useRegenCore.getState().state === 'aware') {
            setState('observing');
          }
        }, 1500);
      }, 1500);
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      clearTimeout(typingTimeout);
    };
  }, [setState]);
}

/**
 * Track scroll direction to detect reading vs. scanning behavior
 * Down scroll = reading, Up scroll = re-checking, Fast = scanning
 */
export function useScrollDirectionTracking() {
  const { setState } = useRegenCore();

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let scrollSpeed = 0;
    let lastTime = Date.now();

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const now = Date.now();
      const timeDelta = now - lastTime;
      
      if (timeDelta > 0) {
        const distance = Math.abs(currentScrollY - lastScrollY);
        scrollSpeed = distance / timeDelta;
        
        const direction = currentScrollY > lastScrollY ? 'down' : 'up';
        
        EventBus.emit('SCROLL_DIRECTION', { 
          direction, 
          speed: scrollSpeed > 2 ? 'fast' : 'slow',
          position: currentScrollY 
        });
        
        // Fast scrolling = scanning behavior
        if (scrollSpeed > 3) {
          setState('aware');
        }
      }
      
      lastScrollY = currentScrollY;
      lastTime = now;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [setState]);
}

/**
 * Track rapid tab switching (context switching behavior)
 * Rapid switching = user is comparing or searching for something
 */
export function useTabSwitchTracking() {
  const { setState } = useRegenCore();

  useEffect(() => {
    let switchCount = 0;
    let switchTimeout: NodeJS.Timeout;

    const handleTabSwitch = () => {
      switchCount++;
      clearTimeout(switchTimeout);
      
      // 3+ switches in 5 seconds = rapid context switching
      if (switchCount >= 3) {
        EventBus.emit('RAPID_TAB_SWITCHING', { count: switchCount });
        setState('aware');
        switchCount = 0;
      }
      
      // Reset counter after 5s
      switchTimeout = setTimeout(() => {
        switchCount = 0;
      }, 5000);
    };

    EventBus.on('TAB_SWITCH', handleTabSwitch);
    return () => {
      EventBus.off('TAB_SWITCH', handleTabSwitch);
      clearTimeout(switchTimeout);
    };
  }, [setState]);
}

/**
 * Detect extended idle periods
 * User hasn't interacted for 20s = avatar relaxes
 */
export function useExtendedIdleTracking() {
  const { setState } = useRegenCore();

  useEffect(() => {
    let idleTimeout: NodeJS.Timeout;

    const resetIdle = () => {
      clearTimeout(idleTimeout);
      
      idleTimeout = setTimeout(() => {
        EventBus.emit('EXTENDED_IDLE', { duration: 20000 });
        setState('observing'); // Avatar relaxes
      }, 20000);
    };

    // Reset on any user activity
    const events = ['mousemove', 'keypress', 'scroll', 'click'];
    events.forEach(event => window.addEventListener(event, resetIdle));
    
    resetIdle(); // Start timer

    return () => {
      events.forEach(event => window.removeEventListener(event, resetIdle));
      clearTimeout(idleTimeout);
    };
  }, [setState]);
}
