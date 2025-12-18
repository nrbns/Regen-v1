import { describe, it, expect } from 'vitest';
import { JobStateMachine, type JobRecord } from '../server/jobs/stateMachine';

function baseJob(): JobRecord {
  return {
    id: 'job-1',
    userId: 'user-1',
    type: 'test',
    state: 'created',
    progress: 0,
    step: 'start',
    createdAt: Date.now(),
    lastActivity: Date.now(),
  };
}

describe('JobStateMachine', () => {
  it('allows created → running and stamps startedAt', () => {
    const job = baseJob();
    const result = JobStateMachine.transition(job, 'running');
    expect(result.success).toBe(true);
    expect(result.job?.state).toBe('running');
    expect(result.job?.startedAt).toBeDefined();
  });

  it('blocks invalid transitions', () => {
    const job = baseJob();
    const result = JobStateMachine.transition(job, 'completed');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Cannot transition');
  });

  it('progresses running → paused → running → completed', () => {
    let job = JobStateMachine.transition(baseJob(), 'running').job!;
    job = JobStateMachine.transition(job, 'paused').job!;
    expect(job.state).toBe('paused');

    job = JobStateMachine.transition(job, 'running').job!;
    expect(job.state).toBe('running');

    job = JobStateMachine.transition(job, 'completed').job!;
    expect(job.state).toBe('completed');
    expect(job.completedAt).toBeDefined();
  });

  it('marks terminal states', () => {
    expect(JobStateMachine.isTerminal('completed')).toBe(true);
    expect(JobStateMachine.isTerminal('failed')).toBe(true);
    expect(JobStateMachine.isTerminal('cancelled')).toBe(true);
    expect(JobStateMachine.isTerminal('running')).toBe(false);
  });
});
