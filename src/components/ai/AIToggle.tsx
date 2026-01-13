/**
 * AI Toggle Component
 * Quick toggle for Sentinel AI (silent mode)
 * Located in navigation bar for easy access
 */

import React from 'react';
import { Brain, BrainCircuit } from 'lucide-react';
import { useSettings } from '../../state/settingsStore';
import { eventBus, EVENTS } from '../../core/state/eventBus';

export function AIToggle() {
  const { aiSilenced, toggleAISilence, isAISilenced } = useSettings();
  const silenced = isAISilenced();

  const handleToggle = () => {
    const newState = !silenced;
    toggleAISilence(
      newState ? undefined : undefined, // No duration = permanent until toggled
      newState ? 'user_toggle' : undefined
    );
    
    // Emit event for other components
    eventBus.emit(EVENTS.AI_SUGGESTION_GENERATED, {
      type: 'silence_toggled',
      silenced: newState,
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={silenced ? 'Enable AI' : 'Disable AI (silent mode)'}
      title={silenced ? 'AI is silenced - Click to enable' : 'AI is active - Click to silence'}
      className={`rounded-lg p-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] focus-visible:ring-offset-2 ${
        silenced
          ? 'bg-[var(--surface-hover)] text-[var(--text-muted)] hover:bg-[var(--surface-active)] hover:text-[var(--text-secondary)]'
          : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 hover:scale-105'
      }`}
    >
      {silenced ? (
        <BrainCircuit className="h-5 w-5 transition-transform" aria-hidden />
      ) : (
        <Brain className="h-5 w-5 transition-transform hover:scale-110" aria-hidden />
      )}
    </button>
  );
}
