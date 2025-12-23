/**
 * Jobs Service - Stub for job management
 * This is a placeholder for the jobs service
 */

export interface Job {
  id: string;
  state: 'running' | 'paused' | 'completed' | 'failed';
  [key: string]: any;
}

export interface JobRepository {
  getActiveJobs?: () => Promise<Job[]>;
}

// Export jobRepository as null (will be implemented later)
export const jobRepository: JobRepository | null = null;

// Default export for easier imports
export default {
  jobRepository,
};
