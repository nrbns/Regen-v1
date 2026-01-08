export type TaskStatus =
  | 'CREATED'
  | 'RUNNING'
  | 'PARTIAL'
  | 'DONE'
  | 'FAILED';

export interface Task {
  id: string;
  type: string;
  status: TaskStatus;
  output: string[];
  logs: string[];
  createdAt: number;
  meta?: Record<string, any>;
}

export type TaskPayload = Partial<Task> & { id: string };
