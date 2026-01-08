import type { Task } from '../../core/execution/task';

type TaskMap = Record<string, Task>;

let tasks: TaskMap = {};
let activeTaskId: string | null = null;
const listeners = new Set<() => void>();

export function getTasks(): TaskMap {
  return tasks;
}

export function getActiveTaskId(): string | null {
  return activeTaskId;
}

export function addTask(task: Task) {
  tasks = { ...tasks, [task.id]: task };
  listeners.forEach(l => l());
}

export function updateTask(task: Task) {
  tasks = { ...tasks, [task.id]: task };
  listeners.forEach(l => l());
}

export function addLog(id: string, message: string) {
  const t = tasks[id];
  if (!t) return;
  const updated = { ...t, logs: [...t.logs, message] };
  tasks = { ...tasks, [id]: updated };
  listeners.forEach(l => l());
}

export function addOutput(id: string, data: string) {
  const t = tasks[id];
  if (!t) return;
  const updated = { ...t, output: [...t.output, data] };
  tasks = { ...tasks, [id]: updated };
  listeners.forEach(l => l());
}

export function setActiveTask(id: string | null) {
  activeTaskId = id;
  listeners.forEach(l => l());
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export default {
  getTasks,
  getActiveTaskId,
  addTask,
  updateTask,
  addLog,
  addOutput,
  setActiveTask,
  subscribe,
};
