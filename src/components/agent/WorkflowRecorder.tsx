/**
 * Workflow Recorder
 * Save successful batch job executions as reusable workflow templates
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Tag, AlertCircle, CheckCircle } from 'lucide-react';
import { useWorkflowStore } from '../../core/agent/workflows';
import { type BatchJob } from '../../core/agent/batch';
import { toast } from '../../utils/toast';

interface WorkflowRecorderProps {
  job: BatchJob;
  onClose: () => void;
  onSave?: () => void;
}

export function WorkflowRecorder({ job, onClose, onSave }: WorkflowRecorderProps) {
  const [name, setName] = useState(job.name || 'My Workflow');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [extractedSteps, setExtractedSteps] = useState<WorkflowStep[]>([]);
  const [saveStatus, setSaveStatus] = useState<'ready' | 'saving' | 'success' | 'error'>('ready');
  const [errorMessage, setErrorMessage] = useState('');

  const { createTemplate } = useWorkflowStore();

  // Extract workflow steps from completed batch tasks
  const handleExtractSteps = () => {
    try {
      const steps = job.tasks
        .filter(task => task.status === 'completed')
        .map((task, index) => ({
          id: `step-${Date.now()}-${index}`,
          order: index + 1,
          type: 'research' as const,
          content: task.goal,
          description: task.result ? `Result: ${String(task.result).substring(0, 50)}...` : undefined,
          timeout: 300,
        }));

      if (steps.length === 0) {
        setErrorMessage('No completed tasks found in this batch job');
        toast.error('No completed tasks to extract');
        return;
      }

      setExtractedSteps(steps);
      toast.success(`Extracted ${steps.length} steps from batch job`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to extract steps');
      toast.error('Failed to extract steps');
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSaveWorkflow = async () => {
    if (!name.trim()) {
      setErrorMessage('Workflow name is required');
      toast.error('Please enter a workflow name');
      return;
    }

    if (extractedSteps.length === 0) {
      setErrorMessage('Please extract steps first');
      toast.error('No steps to save');
      return;
    }

    setSaveStatus('saving');
    try {
      // Create the template with basic info
      const templateId = createTemplate(
        name.trim(),
        description.trim() || 'Saved from batch job execution',
        tags.length > 0 ? tags : ['auto-saved', 'batch']
      );

      // Add extracted steps to the template
      extractedSteps.forEach((step) => {
        useWorkflowStore.getState().addStepToTemplate(templateId, {
          type: step.type,
          content: step.content,
          description: step.description,
          order: step.order,
        });
      });

      setSaveStatus('success');
      toast.success(`Workflow "${name}" saved successfully!`);
      
      setTimeout(() => {
        onSave?.();
        onClose();
      }, 1500);
    } catch (error) {
      setSaveStatus('error');
      const msg = error instanceof Error ? error.message : 'Failed to save workflow';
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-[1150] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-[min(600px,95vw)] rounded-2xl border border-slate-700/70 bg-slate-950/95 text-gray-100"
      >
        <header className="flex items-center justify-between border-b border-slate-800/60 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-blue-300">
              <Save size={14} />
              <span>Save as Workflow</span>
            </div>
            <h2 className="mt-1 font-semibold text-white">Record Batch Job as Template</h2>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-slate-700/60 bg-slate-900/70 p-2 text-slate-200 hover:bg-slate-900/90"
          >
            <X size={16} />
          </button>
        </header>

        <div className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Job Summary */}
          <div className="rounded-lg border border-slate-700/30 bg-slate-800/20 p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Batch Job Summary</h3>
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Job ID:</span>
                <span className="font-mono text-slate-300">{job.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Tasks:</span>
                <span>{job.tasks.length} total</span>
              </div>
              <div className="flex justify-between">
                <span>Completed:</span>
                <span className="text-emerald-400">
                  {job.tasks.filter(t => t.status === 'completed').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span>{job.totalDuration ? `${Math.round(job.totalDuration / 1000)}s` : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Workflow Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Workflow Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-gray-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="e.g., Competitor Analysis Pro"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-gray-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              placeholder="What does this workflow accomplish?"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Tags</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-gray-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="Add tags (press Enter)"
              />
              <button
                onClick={handleAddTag}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800/70"
              >
                <Tag size={14} />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <div
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-blue-600/20 px-2.5 py-1 text-xs text-blue-200"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-blue-300 hover:text-blue-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Extract Steps Section */}
          <div className="rounded-lg border border-slate-700/30 bg-slate-800/20 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300">Workflow Steps</h3>
              {extractedSteps.length > 0 && (
                <span className="text-xs text-emerald-300 flex items-center gap-1">
                  <CheckCircle size={12} />
                  {extractedSteps.length} steps extracted
                </span>
              )}
            </div>

            {extractedSteps.length === 0 ? (
              <button
                onClick={handleExtractSteps}
                className="w-full rounded-lg border border-blue-700/50 bg-blue-900/20 px-3 py-2 text-sm text-blue-200 hover:bg-blue-900/30 transition-colors"
              >
                Extract Steps from Batch Job
              </button>
            ) : (
              <div className="space-y-2">
                {extractedSteps.map((step, idx) => (
                  <div key={step.id} className="rounded-lg border border-slate-700/20 bg-slate-800/50 p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 rounded-full bg-blue-500/20 h-6 w-6 flex items-center justify-center text-xs font-semibold text-blue-300">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-400 mb-1">{step.type}</div>
                        <div className="text-sm text-slate-200 break-words">{step.content}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="rounded-lg border border-red-700/30 bg-red-900/20 p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-200">{errorMessage}</div>
            </div>
          )}

          {/* Status Message */}
          {saveStatus === 'success' && (
            <div className="rounded-lg border border-emerald-700/30 bg-emerald-900/20 p-3 flex items-start gap-2">
              <CheckCircle size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-200">Workflow saved successfully!</div>
            </div>
          )}
        </div>

        <footer className="border-t border-slate-800/60 bg-slate-900/30 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveWorkflow}
            disabled={saveStatus === 'saving' || extractedSteps.length === 0}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveStatus === 'saving' ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save size={14} />
                Save Workflow
              </>
            )}
          </button>
        </footer>
      </motion.div>
    </div>
  );
}
