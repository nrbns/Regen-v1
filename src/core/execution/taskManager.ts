import { eventBus } from './eventBus';
import type { Task, TaskStatus } from './task';

const tasks = new Map<string, Task>();

export function getTask(id: string): Task | undefined {
  return tasks.get(id);
}

export function listTasks(): Task[] {
  return Array.from(tasks.values());
}

export function createTask(type: string, meta?: Record<string, any>): Task {
  const id = (globalThis as any).crypto?.randomUUID?.() ?? String(Date.now()) + Math.random();
  const task: Task = {
    id,
    type,
    status: 'CREATED',
    output: [],
    logs: [],
    createdAt: Date.now(),
    meta: meta ?? {},
  };

  tasks.set(id, task);
  eventBus.emit('task:created', task);
  return task;
}

export function updateTask(task: Task) {
  tasks.set(task.id, task);
  eventBus.emit('task:updated', task);
}

export function setTaskStatus(id: string, status: TaskStatus) {
  const t = tasks.get(id);
  if (!t) return;
  t.status = status;
  updateTask(t);
}

export function logTask(id: string, message: string) {
  const t = tasks.get(id);
  if (!t) return;
  const ts = `[${new Date().toISOString()}] ${message}`;
  t.logs.push(ts);
  eventBus.emit('task:log', { id, message: ts });
}

export function streamOutput(id: string, data: string) {
  const t = tasks.get(id);
  if (!t) return;
  t.output.push(data);
  eventBus.emit('task:output', { id, data });
}

export function completeTask(id: string) {
  setTaskStatus(id, 'DONE');
  const t = tasks.get(id);
  if (t) eventBus.emit('task:completed', t);
}

export function failTask(id: string, reason?: string) {
  setTaskStatus(id, 'FAILED');
  if (reason) logTask(id, `Failed: ${reason}`);
  const t = tasks.get(id);
  if (t) eventBus.emit('task:completed', t);
}

export { tasks };
