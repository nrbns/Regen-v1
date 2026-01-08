import { useEffect } from 'react';
import { useTaskStore } from '../state/taskStore';
import { eventBus } from '../../core/execution/eventBus';

/**
 * Hook that connects event bus events to the task store
 * This makes the UI reactive to real-time task updates
 */
export function useTaskRealtime() {
  const {
    addTask,
    updateTask,
    addLog,
    updateResources,
  } = useTaskStore();

  useEffect(() => {
    // Connect event bus listeners to store actions
    const handleTaskCreated = (task: any) => addTask(task);
    const handleTaskUpdated = (task: any) => updateTask(task);
    const handleTaskLog = ({ id, message }: { id: string; message: string }) =>
      addLog({ id, message });
    const handleResourceUpdate = (resources: any) => updateResources(resources);

    // Bind event bus listeners
    eventBus.on('task:created', handleTaskCreated);
    eventBus.on('task:updated', handleTaskUpdated);
    eventBus.on('task:log', handleTaskLog);
    eventBus.on('resources:updated', handleResourceUpdate);

    // Cleanup function to remove event listeners
    return () => {
      eventBus.off('task:created', handleTaskCreated);
      eventBus.off('task:updated', handleTaskUpdated);
      eventBus.off('task:log', handleTaskLog);
      eventBus.off('resources:updated', handleResourceUpdate);
    };
  }, [addTask, updateTask, addLog, updateResources]);
}
