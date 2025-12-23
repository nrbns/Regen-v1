import React, { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { fetchRecentJobs, fetchResumableJobs, resumeJob, type JobSummary } from '../services/jobs';

interface TaskTimelineProps {
  onSelect?: (jobId: string) => void;
  initialFilter?: 'recent' | 'resumable' | 'running' | 'failed' | 'completed';
  limit?: number;
}

type Filter = 'recent' | 'resumable' | 'running' | 'failed' | 'completed';

const stateColor: Record<string, string> = {
  running: 'text-blue-600',
  paused: 'text-yellow-600',
  failed: 'text-red-600',
  completed: 'text-green-600',
};

export const TaskTimeline: React.FC<TaskTimelineProps> = ({
  onSelect,
  initialFilter = 'recent',
  limit = 25,
}) => {
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      let items: JobSummary[] = [];
      if (filter === 'resumable') {
        items = await fetchResumableJobs(limit);
      } else {
        items = await fetchRecentJobs(limit);
      }
      // Client-side filter if backend doesn't support these endpoints yet
      const filtered = items.filter(j => {
        if (filter === 'recent' || filter === 'resumable') return true;
        return j.state === filter;
      });
      setJobs(filtered);
    } catch (err: any) {
      setError(err?.message || 'Unable to load jobs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter, limit, load]);

  async function handleResume(jobId: string) {
    try {
      await resumeJob(jobId);
      await load();
    } catch (err) {
      console.warn('[TaskTimeline] resume failed', err);
    }
  }

  function renderItem(j: JobSummary) {
    const color = stateColor[j.state] || 'text-gray-700';
    return (
      <div
        key={j.id}
        className="flex items-center justify-between border-b border-gray-200 px-3 py-2"
      >
        <div className="flex-1">
          <div className="text-sm font-medium">{j.step || 'Untitled Task'}</div>
          <div className={clsx('text-xs', color)}>
            {j.state.toUpperCase()} {typeof j.progress === 'number' ? `• ${j.progress}%` : ''}
          </div>
          <div className="text-xs text-gray-500">{j.id}</div>
        </div>
        <div className="flex items-center gap-2">
          {j.state === 'failed' && (
            <button
              className="rounded bg-yellow-100 px-2 py-1 text-xs hover:bg-yellow-200"
              onClick={() => handleResume(j.id)}
            >
              Resume
            </button>
          )}
          <button
            className="rounded bg-gray-100 px-2 py-1 text-xs hover:bg-gray-200"
            onClick={() => onSelect?.(j.id)}
          >
            Open
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-2 border-b border-gray-200 p-2">
        {(['recent', 'resumable', 'running', 'failed', 'completed'] as Filter[]).map(f => (
          <button
            key={f}
            className={clsx(
              'rounded px-3 py-1 text-xs',
              filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
            )}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <button
          className="ml-auto rounded bg-gray-100 px-3 py-1 text-xs hover:bg-gray-200"
          onClick={load}
        >
          Refresh
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        {loading && <div className="p-3 text-sm">Loading…</div>}
        {error && <div className="p-3 text-sm text-red-600">{error}</div>}
        {!loading && jobs.length === 0 && (
          <div className="p-3 text-sm text-gray-600">No tasks to show.</div>
        )}
        {!loading && jobs.length > 0 && (
          <div className="divide-y divide-gray-200">{jobs.map(renderItem)}</div>
        )}
      </div>
    </div>
  );
};

export default TaskTimeline;
