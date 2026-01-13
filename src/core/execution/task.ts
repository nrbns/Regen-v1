export type TaskStatus =
  | 'CREATED'
  | 'RUNNING'
  | 'PARTIAL'
  | 'DONE'
  | 'FAILED'
  | 'CANCELED';

export interface Task {
  id: string;
  type: string;
  status: TaskStatus;
  output: string[];
  logs: string[];
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  cancelToken?: AbortSignal;
  meta?: Record<string, any>;
}

export type TaskPayload = Partial<Task> & { id: string };
