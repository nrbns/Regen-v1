/**
 * LAG FIX #1: Yjs Awareness Cursors
 * Display collaborative cursors for multi-user editing
 */

import { useEffect, useState } from 'react';
import { getTabSyncService } from '../../services/sync/tabSyncService';

interface AwarenessState {
  user: {
    name: string;
    color: string;
  };
  cursor?: {
    x: number;
    y: number;
  };
}

export function AwarenessCursors() {
  const [cursors, setCursors] = useState<Map<number, AwarenessState>>(new Map());

  useEffect(() => {
    const service = getTabSyncService();
    const awareness = (service as any).awareness;

    if (!awareness) return;

    const updateCursors = () => {
      const states = new Map<number, AwarenessState>();
      awareness.getStates().forEach((state: AwarenessState, clientId: number) => {
        if (state.user && clientId !== awareness.clientID) {
          states.set(clientId, state);
        }
      });
      setCursors(states);
    };

    // Initial update
    updateCursors();

    // Listen for changes
    awareness.on('change', updateCursors);

    // Track mouse movement for local cursor
    const handleMouseMove = (e: MouseEvent) => {
      awareness.setLocalStateField('cursor', {
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      awareness.off('change', updateCursors);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  if (cursors.size === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      {Array.from(cursors.entries()).map(([clientId, state]) => (
        <div
          key={clientId}
          className="pointer-events-none absolute"
          style={{
            left: state.cursor?.x ?? 0,
            top: state.cursor?.y ?? 0,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className="h-4 w-4 rounded-full border-2 border-white shadow-lg"
            style={{ backgroundColor: state.user.color }}
          />
          <div
            className="absolute left-1/2 top-5 -translate-x-1/2 whitespace-nowrap rounded px-2 py-1 text-xs text-white"
            style={{ backgroundColor: state.user.color }}
          >
            {state.user.name}
          </div>
        </div>
      ))}
    </div>
  );
}
