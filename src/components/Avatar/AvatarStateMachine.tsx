/**
 * Avatar State Machine - BATTLE 3
 * 
 * The avatar must feel ALIVE without AI.
 * 90% of "alive" feeling comes from UI + behavior, not AI calls.
 * 
 * Requirements:
 * - React instantly to scroll, idle, typing (<50ms)
 * - Change posture, focus, presence
 * - Work even when AI is OFF
 * - NO chat bubbles, talking face, emotions, "Hey I can help!"
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { eventBus } from '../../core/state/eventBus';

export type AvatarState = 
  | 'idle'           // Default state, relaxed
  | 'focused'        // User is actively browsing/reading
  | 'scrolling'      // User is scrolling
  | 'typing'         // User is typing
  | 'thinking'       // Subtle indication of processing (no AI needed)
  | 'away';          // User has been idle for a while

export type AvatarPosture = 
  | 'relaxed'        // Default, calm
  | 'attentive'      // Focused on content
  | 'active';        // Actively engaged

interface AvatarStateMachineProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIndicator?: boolean;
}

/**
 * Avatar State Machine Component
 * BATTLE 3: Feels alive through instant reactions to user activity
 */
export function AvatarStateMachine({ 
  className = '', 
  size = 'md',
  showIndicator = true 
}: AvatarStateMachineProps) {
  const [state, setState] = useState<AvatarState>('idle');
  const [posture, setPosture] = useState<AvatarPosture>('relaxed');
  const lastActivityRef = useRef<number>(Date.now());
  const stateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // BATTLE 3: React instantly to scroll (<50ms)
  const handleScroll = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    
    // Instant state change (<50ms)
    setState('scrolling');
    setPosture('active');
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Return to focused after scroll stops
    scrollTimeoutRef.current = setTimeout(() => {
      setState('focused');
      setPosture('attentive');
    }, 300);
  }, []);

  // BATTLE 3: React instantly to typing (<50ms)
  const handleTyping = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    
    // Instant state change (<50ms)
    setState('typing');
    setPosture('attentive');
    
    // Clear existing timeout
    if (stateTimeoutRef.current) {
      clearTimeout(stateTimeoutRef.current);
    }
    
    // Return to focused after typing stops
    stateTimeoutRef.current = setTimeout(() => {
      setState('focused');
      setPosture('attentive');
    }, 1000);
  }, []);

  // BATTLE 3: React to idle state
  const handleIdle = useCallback(() => {
    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;
    
    if (timeSinceActivity > 30000) { // 30s idle
      setState('away');
      setPosture('relaxed');
    } else if (timeSinceActivity > 10000) { // 10s idle
      setState('idle');
      setPosture('relaxed');
    }
  }, []);

  // BATTLE 3: React to focus (user actively browsing)
  const handleFocus = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    
    setState('focused');
    setPosture('attentive');
  }, []);

  // Subscribe to events
  useEffect(() => {
    // Listen for scroll events (debounced via EventBus)
    const unsubscribeScroll = eventBus.on('user:scroll', handleScroll);
    
    // Listen for typing events
    const unsubscribeTyping = eventBus.on('user:typing', handleTyping);
    
    // Listen for focus events
    const unsubscribeFocus = eventBus.on('user:focus', handleFocus);
    
    // Listen for idle events
    const unsubscribeIdle = eventBus.on('user:idle', handleIdle);

    // Direct DOM event listeners for instant reaction (<50ms)
    // BATTLE 3: Must react in <50ms, so we listen directly
    const handleScrollDirect = () => {
      // Emit to event bus for other systems, but also react directly
      eventBus.emitDebounced('user:scroll', 100);
      handleScroll();
    };

    const handleKeyDown = () => {
      eventBus.emit('user:typing');
      handleTyping();
    };

    const handleMouseMove = () => {
      eventBus.emit('user:focus');
      handleFocus();
    };

    // Add passive listeners for performance
    window.addEventListener('scroll', handleScrollDirect, { passive: true });
    window.addEventListener('keydown', handleKeyDown, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Check for idle periodically
    const idleInterval = setInterval(() => {
      handleIdle();
    }, 5000); // Check every 5s

    return () => {
      unsubscribeScroll();
      unsubscribeTyping();
      unsubscribeFocus();
      unsubscribeIdle();
      window.removeEventListener('scroll', handleScrollDirect);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(idleInterval);
      if (stateTimeoutRef.current) clearTimeout(stateTimeoutRef.current);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [handleScroll, handleTyping, handleFocus, handleIdle]);

  // Size classes
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  // State-based visual styles
  const getStateStyles = () => {
    switch (state) {
      case 'scrolling':
        return 'bg-blue-400/20 border-blue-400/40';
      case 'typing':
        return 'bg-purple-400/20 border-purple-400/40';
      case 'focused':
        return 'bg-emerald-400/20 border-emerald-400/40';
      case 'away':
        return 'bg-gray-400/10 border-gray-400/20';
      default:
        return 'bg-gray-400/10 border-gray-400/20';
    }
  };

  // Posture-based animation
  const getPostureAnimation = () => {
    switch (posture) {
      case 'active':
        return 'animate-pulse';
      case 'attentive':
        return '';
      default:
        return '';
    }
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Avatar circle */}
      <div
        className={`
          ${sizeClasses[size]}
          rounded-full
          border-2
          transition-all duration-75
          ${getStateStyles()}
          ${getPostureAnimation()}
        `}
        role="status"
        aria-label={`Avatar state: ${state}, posture: ${posture}`}
      >
        {/* Subtle inner indicator */}
        {showIndicator && (
          <div
            className={`
              absolute inset-0
              rounded-full
              opacity-30
              transition-opacity duration-75
              ${state === 'scrolling' || state === 'typing' ? 'opacity-60' : ''}
            `}
            style={{
              background: state === 'scrolling' 
                ? 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)'
                : state === 'typing'
                ? 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)'
                : state === 'focused'
                ? 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)'
                : 'transparent',
            }}
          />
        )}
      </div>
      
      {/* Subtle presence indicator (no chat bubbles, no talking face) */}
      {showIndicator && state !== 'idle' && state !== 'away' && (
        <div
          className={`
            absolute -bottom-0.5 -right-0.5
            h-2 w-2
            rounded-full
            border border-white
            transition-all duration-75
            ${state === 'scrolling' ? 'bg-blue-400' : ''}
            ${state === 'typing' ? 'bg-purple-400' : ''}
            ${state === 'focused' ? 'bg-emerald-400' : ''}
          `}
        />
      )}
    </div>
  );
}

/**
 * Hook to get current avatar state
 * BATTLE 3: Allows other components to react to avatar state
 */
export function useAvatarState() {
  const [state, setState] = useState<AvatarState>('idle');
  
  useEffect(() => {
    const unsubscribe = eventBus.on('avatar:state:changed', (newState: AvatarState) => {
      setState(newState);
    });
    
    return unsubscribe;
  }, []);
  
  return state;
}
