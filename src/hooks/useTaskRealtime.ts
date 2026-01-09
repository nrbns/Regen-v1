import { useEffect } from 'react';
import { useTaskStore } from '../state/taskStore';

/**
 * Hook that connects Electron IPC events to the task store
 * This makes the UI reactive to real-time task updates
 */
export function useTaskRealtime() {
  const {
    addTask,
    updateTask,
    addTaskLog,
    updateResources,
  } = useTaskStore();

  useEffect(() => {
    // Only run on Electron renderer (not in browser)
    if (typeof window === 'undefined' || !window.regen) {
      return;
    }

    // Bind IPC event listeners to store actions
    const cleanupTaskCreated = window.regen.onTaskCreated(addTask);
    const cleanupTaskUpdated = window.regen.onTaskUpdated(updateTask);
    const cleanupTaskLog = window.regen.onTaskLog(({ id, message }) =>
      addTaskLog(id, message)
    );
    const cleanupResourceUpdate = window.regen.onResource((resources) =>
      updateResources(resources)
    );

    // Cleanup function to remove event listeners
    return () => {
      // Remove IPC event listeners when component unmounts
      cleanupTaskCreated();
      cleanupTaskUpdated();
      cleanupTaskLog();
      cleanupResourceUpdate();
    };
  }, [addTask, updateTask, addTaskLog, updateResources]);
}
