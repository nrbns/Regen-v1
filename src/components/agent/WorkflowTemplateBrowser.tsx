/**
 * Workflow Template Browser
 * Browse, create, and execute research workflows
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  Download,
  Trash2,
  Tag,
  Clock,
  Zap,
} from 'lucide-react';
import { useWorkflowStore, type WorkflowTemplate, type WorkflowStep } from '../../core/agent/workflows';

interface WorkflowBrowserProps {
  onExecute: (steps: WorkflowStep[], templateId: string) => void;
  onClose: () => void;
}

export function WorkflowTemplateBrowser({ onExecute, onClose }: WorkflowBrowserProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const { templates, fillTemplateParameters, incrementUsageCount, deleteTemplate } =
    useWorkflowStore();

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || t.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const allTags = Array.from(new Set(templates.flatMap(t => t.tags))).sort();

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setParameterValues(
      Object.fromEntries(template.parameters.map(p => [p.key, p.defaultValue || '']))
    );
  };

  const handleExecuteWorkflow = () => {
    if (!selectedTemplate) return;
    const filledSteps = fillTemplateParameters(selectedTemplate, parameterValues);
    incrementUsageCount(selectedTemplate.id);
    onExecute(filledSteps, selectedTemplate.id);
    onClose();
  };

  const handleExport = (template: WorkflowTemplate) => {
    const json = useWorkflowStore.getState().exportTemplate(template.id);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `workflow-${template.id}.json`);
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[1145] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative flex h-[90vh] w-[min(1100px,95vw)] flex-col rounded-2xl border border-slate-700/70 bg-slate-950/95 text-gray-100"
      >
        <header className="flex items-center justify-between border-b border-slate-800/60 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-300">
              <Zap size={14} />
              <span>Workflow Templates</span>
            </div>
            <h2 className="mt-1 font-semibold text-white">
              {selectedTemplate ? selectedTemplate.name : 'Browse Research Workflows'}
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
          <AnimatePresence mode="wait">
            {!selectedTemplate ? (
              <motion.div
                key="browser"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex w-full flex-col"
              >
                {/* Search and filters */}
                <div className="border-b border-slate-800/60 bg-slate-900/30 p-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Search workflows..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-gray-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                  {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedTag(null)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                          selectedTag === null
                            ? 'bg-emerald-600 text-white'
                            : 'border border-slate-700/50 bg-slate-800/30 text-slate-300 hover:bg-slate-800/50'
                        }`}
                      >
                        All
                      </button>
                      {allTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => setSelectedTag(tag)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                            selectedTag === tag
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-700/50 bg-slate-800/30 text-slate-300 hover:bg-slate-800/50'
                          }`}
                        >
                          <Tag size={10} className="inline mr-1" />
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Templates grid */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredTemplates.map(template => (
                      <motion.button
                        key={template.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleSelectTemplate(template)}
                        className="group relative flex flex-col gap-2 rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 text-left transition-all hover:border-emerald-500/50 hover:bg-slate-800/50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm text-emerald-100">{template.name}</h3>
                            <p className="mt-1 text-xs text-slate-400">{template.description}</p>
                          </div>
                          <div className="ml-2 rounded-lg bg-slate-700/50 p-1.5 text-slate-300 group-hover:bg-emerald-500/20 group-hover:text-emerald-300 transition-colors">
                            <Play size={12} />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {template.tags.map(tag => (
                            <span
                              key={tag}
                              className="inline-block rounded bg-slate-700/40 px-1.5 py-0.5 text-[10px] text-slate-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Zap size={10} />
                            {template.steps.length} steps
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            Used {template.usageCount}x
                          </span>
                        </div>

                        {template.author && (
                          <div className="text-[10px] text-slate-600">
                            by {template.author}
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>

                  {filteredTemplates.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-slate-500">
                      <Zap size={20} className="text-slate-600" />
                      <span>No workflows found matching your criteria</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex w-full flex-col overflow-y-auto"
              >
                <div className="flex-1 px-6 py-4 space-y-4">
                  {/* Workflow description */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Description</h3>
                    <p className="text-sm text-slate-400">{selectedTemplate.description}</p>
                  </div>

                  {/* Parameters */}
                  {selectedTemplate.parameters.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-2">Parameters</h3>
                      <div className="space-y-2">
                        {selectedTemplate.parameters.map(param => (
                          <div key={param.key}>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                              {param.label}
                              {param.description && (
                                <span className="block text-[10px] text-slate-500 font-normal">
                                  {param.description}
                                </span>
                              )}
                            </label>
                            <input
                              type="text"
                              value={parameterValues[param.key] || ''}
                              onChange={e =>
                                setParameterValues(prev => ({
                                  ...prev,
                                  [param.key]: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-gray-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Workflow steps */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">
                      Workflow Steps ({selectedTemplate.steps.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedTemplate.steps
                        .sort((a, b) => a.order - b.order)
                        .map((step, idx) => (
                          <div key={step.id} className="rounded-lg border border-slate-700/30 bg-slate-800/20 p-3">
                            <div className="flex items-start gap-2">
                              <div className="flex-shrink-0 rounded-full bg-emerald-500/20 h-6 w-6 flex items-center justify-center text-xs font-semibold text-emerald-300">
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-mono text-slate-500 capitalize mb-1">
                                  {step.type}
                                </div>
                                <div className="text-sm text-slate-200 break-words font-mono">{step.content}</div>
                                {step.description && (
                                  <div className="mt-1 text-xs text-slate-400">{step.description}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="text-xs text-slate-500 space-y-1">
                    <div>Created: {new Date(selectedTemplate.createdAt).toLocaleDateString()}</div>
                    <div>Updated: {new Date(selectedTemplate.updatedAt).toLocaleDateString()}</div>
                    <div>Used: {selectedTemplate.usageCount} times</div>
                  </div>
                </div>

                <footer className="flex items-center justify-between border-t border-slate-800/60 bg-slate-900/30 px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExport(selectedTemplate)}
                      className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800/70"
                    >
                      <Download size={12} />
                      Export
                    </button>
                    {!selectedTemplate.id.startsWith('builtin-') && (
                      <button
                        onClick={() => {
                          deleteTemplate(selectedTemplate.id);
                          setSelectedTemplate(null);
                        }}
                        className="flex items-center gap-1 rounded-lg border border-red-700/50 bg-red-900/20 px-3 py-2 text-xs text-red-200 hover:bg-red-900/30"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleExecuteWorkflow}
                      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      <Play size={14} />
                      Execute Workflow
                    </button>
                  </div>
                </footer>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
