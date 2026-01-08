import { create } from 'zustand';
import { Task } from '../../core/execution/task';

interface TaskState {
  tasks: Record<string, Task>;
  resources: {
    cpu: number;
    ram: number;
  };
  isConnected: boolean;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  addLog: (payload: { id: string; message: string }) => void;
  updateResources: (resources: { cpu: number; ram: number }) => void;
  setConnected: (connected: boolean) => void;
  getTask: (id: string) => Task | undefined;
  getAllTasks: () => Task[];
  getTasksByStatus: (status: string) => Task[];
  getLatestTask: () => Task | undefined;
  clearCompletedTasks: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: {},
  resources: { cpu: 0, ram: 0 },
  isConnected: false,

  addTask: (task: Task) =>
    set((state) => ({
      tasks: { ...state.tasks, [task.id]: task },
    })),

  updateTask: (task: Task) =>
    set((state) => ({
      tasks: { ...state.tasks, [task.id]: task },
    })),

  addLog: ({ id, message }: { id: string; message: string }) =>
    set((state) => {
      const task = state.tasks[id];
      if (task) {
        const updatedTask = {
          ...task,
          logs: [...task.logs, message],
        };
        return {
          tasks: { ...state.tasks, [id]: updatedTask },
        };
      }
      return state;
    }),

  updateResources: (resources: { cpu: number; ram: number }) =>
    set(() => ({
      resources,
    })),

  setConnected: (connected: boolean) =>
    set(() => ({
      isConnected: connected,
    })),

  getTask: (id: string) => get().tasks[id],

  getAllTasks: () => Object.values(get().tasks),

  getTasksByStatus: (status: string) =>
    Object.values(get().tasks).filter((task) => task.status === status),

  getLatestTask: () =>
    Object.values(get().tasks)
      .sort((a, b) => b.createdAt - a.createdAt)[0],

  clearCompletedTasks: () =>
    set((state) => {
      const activeTasks = Object.fromEntries(
        Object.entries(state.tasks).filter(
          ([, task]) => !['DONE', 'FAILED', 'CANCELLED'].includes(task.status)
        )
      );
      return { tasks: activeTasks };
    }),
}));