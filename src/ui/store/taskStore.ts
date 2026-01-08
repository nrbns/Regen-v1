// Single Source of Truth for Tasks
// UI NEVER fetches, polls, or sets state directly
// UI ONLY reacts to IPC events from backend

import type { Task } from '../../core/execution/task';

type TaskMap = Record<string, Task>;
type TaskStoreState = {
  tasks: TaskMap;
  activeTaskId: string | null;
};

let state: TaskStoreState = {
  tasks: {},
  activeTaskId: null,
};

const listeners = new Set<() => void>();

// Initialize IPC listeners (only once)
let initialized = false;

function initializeIPCEvents() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // Task created event
  window.regen.onTaskCreated((task: Task) => {
    state.tasks = { ...state.tasks, [task.id]: task };
    notifyListeners();
  });

  // Task updated event
  window.regen.onTaskUpdated((task: Task) => {
    state.tasks = { ...state.tasks, [task.id]: task };
    notifyListeners();
  });

  // Task log event
  window.regen.onTaskLog((logData: { taskId: string; message: string }) => {
    const task = state.tasks[logData.taskId];
    if (task) {
      const updatedTask = {
        ...task,
        logs: [...task.logs, logData.message]
      };
      state.tasks = { ...state.tasks, [logData.taskId]: updatedTask };
      notifyListeners();
    }
  });

  // Thought step event (for thought streams)
  window.regen.onThoughtStep((stepData: { taskId: string; step: any }) => {
    const task = state.tasks[stepData.taskId];
    if (task) {
      const updatedTask = {
        ...task,
        thoughtSteps: [...(task.thoughtSteps || []), stepData.step]
      };
      state.tasks = { ...state.tasks, [stepData.taskId]: updatedTask };
      notifyListeners();
    }
  });
}

function notifyListeners() {
  listeners.forEach(l => l());
}

// Public API - READ ONLY (UI never writes to store)
export function getTasks(): TaskMap {
  initializeIPCEvents();
  return state.tasks;
}

export function getActiveTaskId(): string | null {
  initializeIPCEvents();
  return state.activeTaskId;
}

export function getTask(taskId: string): Task | null {
  initializeIPCEvents();
  return state.tasks[taskId] || null;
}

export function getActiveTask(): Task | null {
  initializeIPCEvents();
  return state.activeTaskId ? state.tasks[state.activeTaskId] || null : null;
}

export function subscribe(cb: () => void) {
  initializeIPCEvents();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Legacy compatibility (these should not be used - UI should never write)
export function addTask(task: Task) {
  console.warn('DEPRECATED: UI should never call addTask. Tasks are created by backend only.');
  state.tasks = { ...state.tasks, [task.id]: task };
  notifyListeners();
}

export function updateTask(task: Task) {
  console.warn('DEPRECATED: UI should never call updateTask. Tasks are updated by backend only.');
  state.tasks = { ...state.tasks, [task.id]: task };
  notifyListeners();
}

export default {
  getTasks,
  getActiveTaskId,
  getTask,
  getActiveTask,
  subscribe,
  // Deprecated methods (for backward compatibility only)
  addTask,
  updateTask,
};
