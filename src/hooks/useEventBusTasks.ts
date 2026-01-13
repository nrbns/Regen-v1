import { useEffect } from 'react';
import { useTaskStore } from '../state/taskStore';
import { eventBus } from '../core/execution/eventBus';
import type { Task } from '../core/execution/task';

/**
 * Hook that connects eventBus to task store for real-time UI updates
 * This bridges the gap between taskManager (eventBus) and UI (taskStore)
 * 
 * REAL-TIME INTEGRATION: Makes task store reactive to eventBus events
 * 
 * Usage: Call this hook once in App.tsx to enable real-time task updates
 */
export function useEventBusTasks() {
  const { addTask, updateTask, addLog, setConnected } = useTaskStore();

  useEffect(() => {
    // Task created
    const handleTaskCreated = (task: Task) => {
      addTask(task);
    };
    eventBus.on('task:created', handleTaskCreated);

    // Task updated
    const handleTaskUpdated = (task: Task) => {
      updateTask(task);
    };
    eventBus.on('task:updated', handleTaskUpdated);

    // Task completed
    const handleTaskCompleted = (task: Task) => {
      updateTask(task);
    };
    eventBus.on('task:completed', handleTaskCompleted);

    // Task failed
    const handleTaskFailed = (task: Task) => {
      updateTask(task);
    };
    eventBus.on('task:failed', handleTaskFailed);

    // Task cancelled
    const handleTaskCancelled = (task: Task) => {
      updateTask(task);
    };
    eventBus.on('task:cancelled', handleTaskCancelled);

    // Task log
    const handleTaskLog = (payload: { id: string; message: string }) => {
      addLog(payload);
    };
    eventBus.on('task:log', handleTaskLog);

    // Mark as connected
    setConnected(true);
    console.log('[useEventBusTasks] Event bus listeners initialized');

    // Cleanup
    return () => {
      eventBus.off('task:created', handleTaskCreated);
      eventBus.off('task:updated', handleTaskUpdated);
      eventBus.off('task:completed', handleTaskCompleted);
      eventBus.off('task:failed', handleTaskFailed);
      eventBus.off('task:cancelled', handleTaskCancelled);
      eventBus.off('task:log', handleTaskLog);
      setConnected(false);
    };
  }, [addTask, updateTask, addLog, setConnected]);
}
