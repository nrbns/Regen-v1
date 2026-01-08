import { useEffect } from 'react';
import { useTaskStore } from '../state/taskStore';

/**
 * Hook that wires up task event listeners to the global task store
 * Should be called once in the main App component
 */
export function useTaskEvents() {
  const {
    addTask,
    updateTask,
    addLog,
    updateResources,
    setConnected,
  } = useTaskStore();

  useEffect(() => {
    // Check if regen API is available (from preload script)
    if (typeof window === 'undefined' || !(window as any).regen) {
      console.warn('[useTaskEvents] Regen API not available - running in web mode?');
      return;
    }

    const { regen } = window as any;

    // Set up event listeners
    const cleanup: (() => void)[] = [];

    try {
      // Task created events
      cleanup.push(
        regen.onTaskCreated((task: any) => {
          console.log('[TaskEvent] Task created:', task);
          addTask(task);
        })
      );

      // Task updated events
      cleanup.push(
        regen.onTaskUpdated((task: any) => {
          console.log('[TaskEvent] Task updated:', task);
          updateTask(task);
        })
      );

      // Task log events
      cleanup.push(
        regen.onTaskLog((payload: any) => {
          console.log('[TaskEvent] Task log:', payload);
          addLog(payload);
        })
      );

      // Resource update events
      cleanup.push(
        regen.onResource((resources: any) => {
          updateResources(resources);
        })
      );

      // Mark as connected when we start receiving events
      setConnected(true);

      console.log('[useTaskEvents] Event listeners initialized');

    } catch (error) {
      console.error('[useTaskEvents] Failed to initialize event listeners:', error);
      setConnected(false);
    }

    // Cleanup function
    return () => {
      cleanup.forEach((cleanupFn) => {
        try {
          cleanupFn();
        } catch (e) {
          console.warn('[useTaskEvents] Error cleaning up listener:', e);
        }
      });
      console.log('[useTaskEvents] Event listeners cleaned up');
    };
  }, [addTask, updateTask, addLog, updateResources, setConnected]);
}
