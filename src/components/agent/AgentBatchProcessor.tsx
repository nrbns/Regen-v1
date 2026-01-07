/**
 * Agent Batch Processor
 * UI for managing batch research jobs with progress tracking
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Download,
  Save,
} from 'lucide-react';
import { useBatchStore, executeBatchJob, type BatchTask } from '../../core/agent/batch';
import { WorkflowRecorder } from './WorkflowRecorder';

interface BatchProcessorProps {
  onExecute: (goal: string) => Promise<any>;
  onClose: () => void;
}

export function AgentBatchProcessor({ onExecute, onClose }: BatchProcessorProps) {
  const [jobInput, setJobInput] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [goalInput, setGoalInput] = useState('');
  const [recorderJobId, setRecorderJobId] = useState<string | null>(null);
  const { jobs, createJob, addTaskToJob, deleteJob } = useBatchStore();

  const selectedJob = selectedJobId
    ? jobs.find(j => j.id === selectedJobId)
    : jobs[jobs.length - 1];
  const recorderJob = recorderJobId ? jobs.find(j => j.id === recorderJobId) : null;

  const handleCreateJob = () => {
    if (!jobInput.trim()) return;
    const newJobId = createJob(jobInput);
    setSelectedJobId(newJobId);
    setJobInput('');
  };

  const handleAddTask = () => {
    if (!goalInput.trim() || !selectedJob) return;
    addTaskToJob(selectedJob.id, goalInput);
    setGoalInput('');
  };

  const handleStartJob = async () => {
    if (!selectedJob) return;
    await executeBatchJob(selectedJob.id, onExecute);
  };

  const handleExportResults = () => {
    if (!selectedJob) return;
    const results = {
      jobName: selectedJob.name,
      createdAt: new Date(selectedJob.createdAt).toISOString(),
      totalDuration: selectedJob.totalDuration,
      tasks: selectedJob.tasks.map(t => ({
        goal: t.goal,
        status: t.status,
        result: t.result,
        error: t.error,
        duration: t.duration,
      })),
    };
    const dataStr = JSON.stringify(results, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportLink = document.createElement('a');
    exportLink.setAttribute('href', dataUri);
    exportLink.setAttribute('download', `batch-${selectedJob.id}.json`);
    exportLink.click();
  };

  return (
    <div className="fixed inset-0 z-[1140] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      {recorderJob && (
        <WorkflowRecorder
          job={recorderJob}
          onClose={() => setRecorderJobId(null)}
          onSave={() => {
            // Workflow saved successfully
          }}
        />
      )}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative flex h-[90vh] w-[min(1000px,95vw)] flex-col rounded-2xl border border-slate-700/70 bg-slate-950/95 text-gray-100"
      >
        <header className="flex items-center justify-between border-b border-slate-800/60 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-300">
              <Zap size={14} />
              <span>Batch Processor</span>
            </div>
            <h2 className="mt-1 font-semibold text-white">
              {selectedJob ? selectedJob.name : 'Create a Batch Job'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-slate-700/60 bg-slate-900/70 p-2 text-slate-200 hover:bg-slate-900/90"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Job list sidebar */}
          <div className="flex w-64 flex-col border-r border-slate-800/60 bg-slate-900/30">
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {jobs.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-slate-500">
                  No batch jobs yet
                </div>
              ) : (
                jobs.map(job => (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${
                      selectedJob?.id === job.id
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100'
                        : 'border-slate-700/50 bg-slate-800/30 text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="truncate text-xs font-semibold">{job.name}</div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{job.tasks.length} tasks</span>
                      <span className="font-mono">{job.progress}%</span>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-700/30">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${job.progress}%` }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {!selectedJob ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-300">
                      Job Name
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={jobInput}
                        onChange={e => setJobInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreateJob()}
                        placeholder="e.g., Q1 Market Analysis"
                        className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-gray-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                      <button
                        onClick={handleCreateJob}
                        disabled={!jobInput.trim()}
                        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Plus size={14} />
                        Create
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Job tasks */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-300">
                        Tasks ({selectedJob.tasks.length})
                      </h3>
                      <div className="flex gap-2">
                        {selectedJob.status === 'running' ? (
                          <button
                            onClick={() => useBatchStore.getState().pauseJob(selectedJob.id)}
                            className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800/70"
                          >
                            <Pause size={12} />
                            Pause
                          </button>
                        ) : (
                          <button
                            onClick={handleStartJob}
                            disabled={selectedJob.tasks.length === 0}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <Play size={12} />
                            Start
                          </button>
                        )}
                        {selectedJob.status === 'completed' && (
                          <button
                            onClick={() => setRecorderJobId(selectedJob.id)}
                            className="flex items-center gap-1 rounded-lg border border-blue-700/50 bg-blue-900/20 px-2 py-1 text-xs text-blue-200 hover:bg-blue-900/30"
                            title="Save this batch job as a reusable workflow template"
                          >
                            <Save size={12} />
                            Save as Workflow
                          </button>
                        )}
                        <button
                          onClick={handleExportResults}
                          className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800/70"
                        >
                          <Download size={12} />
                          Export
                        </button>
                        <button
                          onClick={() => {
                            deleteJob(selectedJob.id);
                            setSelectedJobId(null);
                          }}
                          className="flex items-center gap-1 rounded-lg border border-red-700/50 bg-red-900/20 px-2 py-1 text-xs text-red-200 hover:bg-red-900/30"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3 rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="text-slate-300">Progress</span>
                        <span className="font-mono font-semibold">{selectedJob.progress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700/30">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedJob.progress}%` }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                        />
                      </div>
                      {selectedJob.totalDuration && (
                        <div className="mt-2 text-[10px] text-slate-500">
                          Total time: {(selectedJob.totalDuration / 1000).toFixed(1)}s
                        </div>
                      )}
                    </div>

                    {/* Task list */}
                    <div className="max-h-96 space-y-2 overflow-y-auto">
                      <AnimatePresence>
                        {selectedJob.tasks.map((task, idx) => (
                          <TaskRow key={task.id} task={task} index={idx} />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Add task form */}
                  {selectedJob.status !== 'running' && (
                    <div className="border-t border-slate-800/60 pt-4">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-300">
                        Add Task
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={goalInput}
                          onChange={e => setGoalInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                          placeholder="Research goal or template..."
                          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-gray-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                        <button
                          onClick={handleAddTask}
                          disabled={!goalInput.trim()}
                          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Plus size={14} />
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function TaskRow({ task, index }: { task: BatchTask; index: number }) {
  const statusColors = {
    pending: 'border-slate-700/30 bg-slate-800/20 text-slate-300',
    running: 'border-blue-500/30 bg-blue-500/10 text-blue-200 animate-pulse',
    completed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    failed: 'border-red-500/30 bg-red-500/10 text-red-200',
  };

  const statusIcons = {
    pending: <Clock size={12} />,
    running: (
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
        <Zap size={12} />
      </motion.div>
    ),
    completed: <CheckCircle2 size={12} />,
    failed: <AlertCircle size={12} />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className={`rounded-lg border px-3 py-2 text-xs ${statusColors[task.status]}`}
    >
      <div className="flex items-start gap-2">
        <div className="mt-1 flex-shrink-0">{statusIcons[task.status]}</div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 font-mono text-[10px] text-slate-500">Task {index + 1}</div>
          <div className="truncate font-medium">{task.goal}</div>
          {task.error && <div className="mt-1 text-[10px] opacity-75">{task.error}</div>}
          {task.duration && (
            <div className="mt-1 text-[10px] opacity-60">{(task.duration / 1000).toFixed(1)}s</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
