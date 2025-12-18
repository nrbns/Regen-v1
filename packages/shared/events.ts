/**
 * Shared Event Types - Real-Time Layer
 * Versioned event contracts for client ↔ server communication
 *
 * Usage:
 *   import { EVENTS } from 'packages/shared/events';
 *   socket.emit(EVENTS.START_SEARCH, { query: '...' });
 */

export const EVENTS = {
  // Model events
  MODEL_CHUNK: 'model:chunk:v1',
  MODEL_COMPLETE: 'model:complete:v1',
  MODEL_ERROR: 'model:error:v1',
  MODEL_START: 'model:start:v1',

  // Search events
  SEARCH_RESULT: 'search:result:v1',
  SEARCH_COMPLETE: 'search:complete:v1',
  START_SEARCH: 'search:start:v1',
  SEARCH_ERROR: 'search:error:v1',

  // Research events
  RESEARCH_CHUNK: 'research:chunk:v1',
  RESEARCH_COMPLETE: 'research:complete:v1',
  RESEARCH_SOURCE: 'research:source:v1',
  START_RESEARCH: 'research:start:v1',

  // Task management
  CANCEL_TASK: 'task:cancel:v1',
  TASK_PROGRESS: 'task:progress:v1',
  TASK_COMPLETE: 'task:complete:v1',
  TASK_ERROR: 'task:error:v1',

  // Job lifecycle (Realtime infrastructure)
  JOB_CREATED: 'job:created:v1',
  JOB_RUNNING: 'job:running:v1',
  JOB_PROGRESS: 'job:progress:v1',
  JOB_CHECKPOINTED: 'job:checkpointed:v1',
  JOB_PAUSED: 'job:paused:v1',
  JOB_RESUMED: 'job:resumed:v1',
  JOB_CANCELLED: 'job:cancelled:v1',
  JOB_COMPLETED: 'job:completed:v1',
  JOB_FAILED: 'job:failed:v1',

  // Download events
  DOWNLOAD_PROGRESS: 'download:progress:v1',
  DOWNLOAD_COMPLETE: 'download:complete:v1',
  DOWNLOAD_ERROR: 'download:error:v1',

  // Tab & UI events
  TAB_UPDATE: 'tab:update:v1',
  TAB_CREATE: 'tab:create:v1',
  TAB_CLOSE: 'tab:close:v1',

  // User presence
  USER_PRESENCE: 'user:presence:v1',
  USER_JOIN: 'user:join:v1',
  USER_LEAVE: 'user:leave:v1',

  // Analytics
  ANALYTICS_EVENT: 'analytics:event:v1',

  // Connection events
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
} as const;

export type EventType = (typeof EVENTS)[keyof typeof EVENTS];

/**
 * Event payload types
 */
export interface ModelChunkEvent {
  jobId: string;
  chunk: string;
  index: number;
  total?: number;
}

export interface ModelCompleteEvent {
  jobId: string;
  text: string;
  tokens: number;
  duration: number;
}

export interface SearchResultEvent {
  jobId: string;
  result: {
    title: string;
    url: string;
    snippet: string;
    rank: number;
  };
}

export interface TaskProgressEvent {
  jobId: string;
  progress: number; // 0-100
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
}

export interface DownloadProgressEvent {
  downloadId: string;
  progress: number; // 0-100
  bytesDownloaded: number;
  bytesTotal: number;
  speed?: number; // bytes/sec
}
/**
 * Job Lifecycle Events (Realtime Infrastructure)
 */
export type JobState = 'created' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface JobProgressEvent {
  jobId: string;
  userId: string;
  state: JobState;
  step: string;
  progress: number; // 0-100
  partial?: string; // Streaming text chunk
  timestamp: number;
}

export interface JobCheckpointEvent {
  jobId: string;
  userId: string;
  checkpoint: Record<string, any>;
  progress: number;
  timestamp: number;
}

export interface JobCompleteEvent {
  jobId: string;
  userId: string;
  result: any;
  duration: number; // ms
  timestamp: number;
}

export interface JobErrorEvent {
  jobId: string;
  userId: string;
  error: string;
  code?: string;
  recoverable: boolean;
  timestamp: number;
}

export interface JobCancelledEvent {
  jobId: string;
  userId: string;
  reason?: string;
  timestamp: number;
}
