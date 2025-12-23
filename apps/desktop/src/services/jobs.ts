// Lightweight job API client for desktop app
// Uses relative /api/jobs endpoints

export interface JobResumeResponse {
  id: string;
  state: string;
  step?: string;
  progress?: number;
  checkpoint?: string;
  checkpointAvailable?: boolean;
  checkpointSequence?: number;
  checkpointStep?: string;
  checkpointProgress?: number;
  message?: string;
}

export interface JobDetailsResponse {
  id: string;
  state: string;
  progress: number;
  step: string;
  error?: string;
  result?: any;
  checkpointAvailable?: boolean;
  checkpointSequence?: number;
  checkpointStep?: string;
  checkpointProgress?: number;
}

export interface JobLogEntry {
  timestamp?: number;
  type?: string;
  message: string;
}

export interface JobLogsResponse {
  logs: JobLogEntry[];
  message?: string;
}

export interface JobSummary {
  id: string;
  state: string;
  progress?: number;
  step?: string;
  error?: string;
  updatedAt?: number;
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function resumeJob(jobId: string): Promise<JobResumeResponse> {
  return request<JobResumeResponse>(`/api/jobs/${jobId}/resume`, {
    method: 'POST',
  });
}

export async function cancelJob(jobId: string): Promise<void> {
  await request(`/api/jobs/${jobId}/cancel`, { method: 'PATCH' });
}

export async function fetchJob(jobId: string): Promise<JobDetailsResponse> {
  return request<JobDetailsResponse>(`/api/jobs/${jobId}`, { method: 'GET' });
}

export async function fetchJobLogs(jobId: string): Promise<JobLogsResponse> {
  return request<JobLogsResponse>(`/api/jobs/${jobId}/logs`, { method: 'GET' });
}

// Optional endpoints: recent and resumable jobs. Gracefully fallback to [] if unavailable.
export async function fetchRecentJobs(limit = 25): Promise<JobSummary[]> {
  try {
    return await request<JobSummary[]>(`/api/jobs/recent?limit=${limit}`, { method: 'GET' });
  } catch {
    console.warn('[jobs:fetchRecentJobs] Endpoint unavailable, returning empty list');
    return [];
  }
}

export async function fetchResumableJobs(limit = 25): Promise<JobSummary[]> {
  try {
    return await request<JobSummary[]>(`/api/jobs/resumable?limit=${limit}`, { method: 'GET' });
  } catch {
    console.warn('[jobs:fetchResumableJobs] Endpoint unavailable, returning empty list');
    return [];
  }
}

// Placeholder for reporting issues; hook up to real backend when available
export async function reportJobIssue(jobId: string, payload: { error?: string; notes?: string }) {
  // In absence of a reporting endpoint, log to console and resolve
  console.warn('[jobs:reportJobIssue] No backend endpoint configured', { jobId, payload });
  return { ok: true };
}
