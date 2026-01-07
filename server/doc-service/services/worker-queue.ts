/**
 * Worker Queue Service
 * Handles async processing of large documents with progress notifications
 */

import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

// Create Redis connection for BullMQ
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
import type { EditTask, EditOptions, EditResult } from '../types';
import { docxService } from './docx';
import { pdfService } from './pdf';
import { excelService } from './excel';

export interface JobData {
  filePath: string;
  fileType: string;
  task: EditTask;
  options: EditOptions;
  userId?: string;
}

export interface JobProgress {
  stage: 'uploading' | 'extracting' | 'editing' | 'generating' | 'complete';
  progress: number; // 0-100
  message?: string;
}

// Create queue
export const docEditQueue = new Queue<JobData>('doc-edit', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 100,
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
  },
});

// Create worker
export const docEditWorker = new Worker<JobData>(
  'doc-edit',
  async job => {
    const { filePath, fileType, task, options } = job.data;

    // Update progress
    await job.updateProgress({ stage: 'extracting', progress: 10, message: 'Extracting text...' });

    let result: EditResult;

    try {
      // Process based on file type
      switch (fileType) {
        case 'docx':
          await job.updateProgress({
            stage: 'editing',
            progress: 30,
            message: 'Editing document...',
          });
          result = await docxService.edit(filePath, task, options);
          break;
        case 'pdf':
          await job.updateProgress({ stage: 'editing', progress: 30, message: 'Editing PDF...' });
          result = await pdfService.edit(filePath, task, options);
          break;
        case 'xlsx':
        case 'xls':
          await job.updateProgress({
            stage: 'editing',
            progress: 30,
            message: 'Normalizing spreadsheet...',
          });
          result = await excelService.edit(filePath, task, options);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }

      await job.updateProgress({
        stage: 'generating',
        progress: 80,
        message: 'Generating output...',
      });
      await job.updateProgress({ stage: 'complete', progress: 100, message: 'Complete!' });

      return result;
    } catch (error) {
      console.error('[WorkerQueue] Job failed:', error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 2, // Process 2 jobs concurrently
  }
);

// Queue events for progress tracking
export const queueEvents = new QueueEvents('doc-edit', {
  connection,
});

// Helper function to add job to queue
export async function queueDocumentEdit(
  filePath: string,
  fileType: string,
  task: EditTask,
  options: EditOptions,
  userId?: string
): Promise<string> {
  const job = await docEditQueue.add('edit', {
    filePath,
    fileType,
    task,
    options,
    userId,
  });

  return job.id!;
}

// Helper function to get job status
export async function getJobStatus(jobId: string) {
  const job = await docEditQueue.getJob(jobId);
  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = (job.progress as JobProgress) || { stage: 'uploading', progress: 0 };

  return {
    id: jobId,
    state,
    progress,
    result: await job.getReturnValue().catch(() => null),
    error: job.failedReason || null,
  };
}
