/**
 * Passive Avatar Reactions
 * Zero-cost liveliness through UI-only behavior tracking
 * PERFORMANCE: No AI calls, pure event emission
 */

import { useEffect } from 'react';
import { eventBus } from './EventBus';
import { useRegenCore } from '../../core/regen-core/regenCore.store';

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
          eventBus.emit('KEYPRESS', { speed: 'fast', value: movementSpeed });
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
        eventBus.emit('KEYPRESS', { type: 'typing_start' });
      }

      // User paused typing for 1.5s = moment of consideration
      typingTimeout = setTimeout(() => {
        isTyping = false;
        eventBus.emit('KEYPRESS', { type: 'typing_pause' });
        
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
 * Stops scrolling → Avatar looks attentive (REQUIREMENT: Layer 1)
 */
export function useScrollDirectionTracking() {
  const { state, setState } = useRegenCore();

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let scrollSpeed = 0;
    let lastTime = Date.now();
    let scrollStopTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const now = Date.now();
      const timeDelta = now - lastTime;
      
      // Clear scroll stop timeout (user is scrolling)
      clearTimeout(scrollStopTimeout);
      
      if (timeDelta > 0) {
        const distance = Math.abs(currentScrollY - lastScrollY);
        scrollSpeed = distance / timeDelta;
        
        const direction = currentScrollY > lastScrollY ? 'down' : 'up';
        
        eventBus.emit('SCROLL', { 
          direction, 
          speed: scrollSpeed > 2 ? 'fast' : 'slow',
          position: currentScrollY 
        });
        
        // Fast scrolling = scanning behavior
        if (scrollSpeed > 3 && state === 'observing') {
          setState('aware');
        }
      }
      
      lastScrollY = currentScrollY;
      lastTime = now;

      // REQUIREMENT: Stops scrolling → Avatar looks attentive
      // After 800ms of no scrolling, avatar becomes attentive
      scrollStopTimeout = setTimeout(() => {
        if (state === 'observing' || state === 'aware') {
          setState('aware'); // Avatar looks attentive
          eventBus.emit('SCROLL', { depth: currentScrollY / document.documentElement.scrollHeight, url: window.location.href });
          
          // Return to observing after 2s
          setTimeout(() => {
            if (useRegenCore.getState().state === 'aware') {
              setState('observing');
            }
          }, 2000);
        }
      }, 800);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollStopTimeout);
    };
  }, [state, setState]);
}

/**
 * Track rapid tab switching (context switching behavior)
 * Rapid switching = user is comparing or searching for something
 * REQUIREMENT: Rapid tab switching → Avatar posture tightens
 */
export function useTabSwitchTracking() {
  const { state, setState } = useRegenCore();

  useEffect(() => {
    let switchTimes: number[] = [];
    let switchTimeout: NodeJS.Timeout;
    let lastActiveId: string | null = null;

    const handleTabSwitch = (newActiveId: string | null) => {
      // Skip if same tab
      if (newActiveId === lastActiveId) return;
      
      const now = Date.now();
      switchTimes.push(now);
      lastActiveId = newActiveId;
      
      // Keep only switches from last 5 seconds
      switchTimes = switchTimes.filter(time => now - time < 5000);
      const switchCount = switchTimes.length;
      
      clearTimeout(switchTimeout);
      
      // REQUIREMENT: 3+ switches in 5 seconds = rapid tab switching → Avatar posture tightens
      if (switchCount >= 3) {
        eventBus.emit('TAB_SWITCH', { count: switchCount });
        if (state === 'observing' || state === 'aware') {
          setState('aware'); // Avatar posture tightens (aware state)
          // Keep in aware state while rapid switching
        }
      } else {
        // Not rapid - return to observing after brief delay
        switchTimeout = setTimeout(() => {
          if (useRegenCore.getState().state === 'aware') {
            setState('observing');
          }
          switchTimes = [];
        }, 2000);
      }
    };

    // Listen for tab switch events from EventBus
    const handleEventBusSwitch = () => {
      // Get current active tab from store if available
      try {
        const { useTabsStore } = require('../../state/tabsStore');
        const currentActiveId = useTabsStore.getState().activeId;
        handleTabSwitch(currentActiveId);
      } catch {
        // Store not available, just trigger with null
        handleTabSwitch(null);
      }
    };
    
    const unsubscribeEventBus = eventBus.on('TAB_SWITCH', handleEventBusSwitch);
    
    // Subscribe to tab store changes for active tab
    let unsubscribe: (() => void) | null = null;
    try {
      const { useTabsStore } = require('../../state/tabsStore');
      unsubscribe = useTabsStore.subscribe((storeState, prevState) => {
        if (storeState.activeId && storeState.activeId !== prevState?.activeId) {
          handleTabSwitch(storeState.activeId);
        }
      });
      // Initialize with current active tab
      const currentState = useTabsStore.getState();
      if (currentState.activeId) {
        lastActiveId = currentState.activeId;
      }
    } catch (error) {
      // Tab store not available, use EventBus only
      console.debug('[TabSwitchTracking] Tab store not available, using EventBus only');
    }
    
    return () => {
      unsubscribeEventBus();
      if (unsubscribe) unsubscribe();
      clearTimeout(switchTimeout);
    };
  }, [state, setState]);
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
        eventBus.emit('IDLE_TIMEOUT', { duration: 20000 });
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
