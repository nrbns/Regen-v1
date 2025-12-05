/**
 * Agent Orchestration Layer - Tier 2
 * Central coordination for multi-agent tasks, job queue, and context management
 */
import { nanoid } from '../utils/nanoid';
import { agentRuntime } from './runtime';
import { log } from '../../utils/logger';
import { eventBus } from '../state/eventBus';
class AgentOrchestrator {
    jobQueue = [];
    runningJobs = new Map();
    contextStore = new Map();
    rateLimits = new Map();
    maxConcurrentJobs = 3;
    /**
     * Enqueue a job
     */
    enqueue(input) {
        const job = {
            id: nanoid(),
            agentId: input.agentId,
            input: {
                prompt: input.prompt,
                context: input.context,
            },
            priority: input.priority ?? 0,
            status: 'pending',
            createdAt: Date.now(),
            retryCount: 0,
            maxRetries: input.maxRetries ?? 2,
        };
        // Insert by priority (higher first)
        const insertIndex = this.jobQueue.findIndex(j => j.priority < job.priority);
        if (insertIndex === -1) {
            this.jobQueue.push(job);
        }
        else {
            this.jobQueue.splice(insertIndex, 0, job);
        }
        log.info('Job enqueued', { jobId: job.id, agentId: job.agentId, priority: job.priority });
        eventBus.emit('agent:job:enqueued', job);
        // Try to process queue
        this.processQueue();
        return job.id;
    }
    /**
     * Process job queue
     */
    async processQueue() {
        // Check if we can run more jobs
        if (this.runningJobs.size >= this.maxConcurrentJobs) {
            return;
        }
        // Get next job
        const job = this.jobQueue.shift();
        if (!job) {
            return;
        }
        // Check rate limits
        if (job.agentId && !this.checkRateLimit(job.agentId)) {
            // Re-queue with lower priority
            job.priority--;
            this.jobQueue.push(job);
            log.warn('Job rate limited, re-queued', { jobId: job.id, agentId: job.agentId });
            return;
        }
        // Start job
        this.runningJobs.set(job.id, job);
        job.status = 'running';
        job.startedAt = Date.now();
        log.info('Job started', { jobId: job.id, agentId: job.agentId });
        eventBus.emit('agent:job:started', job);
        // Create context
        const context = {
            jobId: job.id,
            runId: nanoid(),
            memory: {},
            sharedState: {},
        };
        this.contextStore.set(job.id, context);
        // Execute job
        this.executeJob(job, context).catch(error => {
            log.error('Job execution failed', { jobId: job.id, error });
            job.status = 'failed';
            job.error = error instanceof Error ? error.message : String(error);
            job.completedAt = Date.now();
            this.runningJobs.delete(job.id);
            this.contextStore.delete(job.id);
            eventBus.emit('agent:job:failed', job);
        });
    }
    /**
     * Execute a job
     */
    async executeJob(job, _context) {
        try {
            const result = await agentRuntime.execute({
                ...job.input,
                agentId: job.agentId,
            });
            job.status = result.success ? 'completed' : 'failed';
            job.result = result;
            job.completedAt = Date.now();
            if (!result.success && job.retryCount < job.maxRetries) {
                // Retry
                job.retryCount++;
                job.status = 'pending';
                job.startedAt = undefined;
                job.completedAt = undefined;
                job.error = undefined;
                this.jobQueue.push(job);
                log.info('Job retrying', { jobId: job.id, retryCount: job.retryCount });
            }
            else {
                this.runningJobs.delete(job.id);
                this.contextStore.delete(job.id);
                log.info('Job completed', { jobId: job.id, success: result.success });
                eventBus.emit('agent:job:completed', job);
            }
        }
        catch (error) {
            if (job.retryCount < job.maxRetries) {
                // Retry
                job.retryCount++;
                job.status = 'pending';
                job.startedAt = undefined;
                this.jobQueue.push(job);
                log.info('Job retrying after error', { jobId: job.id, retryCount: job.retryCount, error });
            }
            else {
                job.status = 'failed';
                job.error = error instanceof Error ? error.message : String(error);
                job.completedAt = Date.now();
                this.runningJobs.delete(job.id);
                this.contextStore.delete(job.id);
                log.error('Job failed', { jobId: job.id, error });
                eventBus.emit('agent:job:failed', job);
            }
        }
        // Process next job
        this.processQueue();
    }
    /**
     * Check rate limit for agent
     */
    checkRateLimit(agentId) {
        const limit = this.rateLimits.get(agentId);
        const now = Date.now();
        if (!limit || now > limit.resetAt) {
            // Reset limit
            this.rateLimits.set(agentId, {
                count: 1,
                resetAt: now + 60000, // 1 minute window
            });
            return true;
        }
        // Check if under limit (10 requests per minute)
        if (limit.count >= 10) {
            return false;
        }
        limit.count++;
        return true;
    }
    /**
     * Cancel a job
     */
    cancel(jobId) {
        const job = this.jobQueue.find(j => j.id === jobId) || this.runningJobs.get(jobId);
        if (!job) {
            return false;
        }
        job.status = 'cancelled';
        job.completedAt = Date.now();
        if (this.runningJobs.has(jobId)) {
            this.runningJobs.delete(jobId);
            this.contextStore.delete(jobId);
        }
        else {
            const index = this.jobQueue.findIndex(j => j.id === jobId);
            if (index !== -1) {
                this.jobQueue.splice(index, 1);
            }
        }
        log.info('Job cancelled', { jobId });
        eventBus.emit('agent:job:cancelled', job);
        return true;
    }
    /**
     * Get job status
     */
    getJob(jobId) {
        return this.jobQueue.find(j => j.id === jobId) || this.runningJobs.get(jobId);
    }
    /**
     * Get all jobs
     */
    getJobs() {
        return [...this.jobQueue, ...Array.from(this.runningJobs.values())];
    }
    /**
     * Get context for job
     */
    getContext(jobId) {
        return this.contextStore.get(jobId);
    }
    /**
     * Update context
     */
    updateContext(jobId, updates) {
        const context = this.contextStore.get(jobId);
        if (context) {
            Object.assign(context, updates);
        }
    }
}
// Singleton instance
export const agentOrchestrator = new AgentOrchestrator();
