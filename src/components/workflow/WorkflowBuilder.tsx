/**
 * Workflow Builder UI
 * Visual workflow builder for creating agent automation workflows
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Play, Save, Loader2, ChevronRight, 
  Search, MousePointerClick, FileText, Globe, Settings,
  ArrowRight, GitBranch, Repeat, CheckCircle2
} from 'lucide-react';

export interface WorkflowStep {
  id: string;
  type: 'search' | 'navigate' | 'extract' | 'click' | 'fill' | 'wait' | 'condition' | 'loop';
  label: string;
  config: Record<string, any>;
  nextStepId?: string;
  condition?: {
    type: 'equals' | 'contains' | 'exists';
    field: string;
    value: any;
  };
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  createdAt: number;
  updatedAt: number;
}

const STEP_TYPES = [
  { type: 'search', label: 'Search', icon: Search, color: 'blue' },
  { type: 'navigate', label: 'Navigate', icon: Globe, color: 'green' },
  { type: 'extract', label: 'Extract Data', icon: FileText, color: 'purple' },
  { type: 'click', label: 'Click Element', icon: MousePointerClick, color: 'orange' },
  { type: 'fill', label: 'Fill Form', icon: FileText, color: 'yellow' },
  { type: 'wait', label: 'Wait', icon: Loader2, color: 'gray' },
  { type: 'condition', label: 'Condition', icon: GitBranch, color: 'pink' },
  { type: 'loop', label: 'Loop', icon: Repeat, color: 'indigo' },
] as const;

interface WorkflowBuilderProps {
  workflow?: Workflow;
  onSave?: (workflow: Workflow) => void;
  onRun?: (workflow: Workflow) => void;
  onClose?: () => void;
}

export function WorkflowBuilder({ workflow, onSave, onRun, onClose }: WorkflowBuilderProps) {
  const [name, setName] = useState(workflow?.name || 'New Workflow');
  const [description, setDescription] = useState(workflow?.description || '');
  const [steps, setSteps] = useState<WorkflowStep[]>(workflow?.steps || []);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const addStep = useCallback((type: WorkflowStep['type']) => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      label: STEP_TYPES.find(s => s.type === type)?.label || type,
      config: getDefaultConfig(type),
    };

    // Link to previous step if exists
    if (steps.length > 0) {
      const prevStep = steps[steps.length - 1];
      prevStep.nextStepId = newStep.id;
    }

    setSteps([...steps, newStep]);
    setSelectedStepId(newStep.id);
  }, [steps]);

  const removeStep = useCallback((stepId: string) => {
    const newSteps = steps.filter(s => s.id !== stepId);
    // Update nextStepId references
    const removedIndex = steps.findIndex(s => s.id === stepId);
    if (removedIndex > 0 && removedIndex < steps.length - 1) {
      const prevStep = steps[removedIndex - 1];
      prevStep.nextStepId = steps[removedIndex + 1]?.id;
    } else if (removedIndex > 0) {
      const prevStep = steps[removedIndex - 1];
      prevStep.nextStepId = undefined;
    }
    setSteps(newSteps);
    if (selectedStepId === stepId) {
      setSelectedStepId(null);
    }
  }, [steps, selectedStepId]);

  const updateStep = useCallback((stepId: string, updates: Partial<WorkflowStep>) => {
    setSteps(steps.map(s => s.id === stepId ? { ...s, ...updates } : s));
  }, [steps]);

  const handleSave = useCallback(() => {
    const newWorkflow: Workflow = {
      id: workflow?.id || `workflow-${Date.now()}`,
      name,
      description,
      steps,
      createdAt: workflow?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    onSave?.(newWorkflow);
  }, [name, description, steps, workflow, onSave]);

  const handleRun = useCallback(async () => {
    if (steps.length === 0) {
      alert('Add at least one step to run the workflow');
      return;
    }

    setIsRunning(true);
    try {
      const newWorkflow: Workflow = {
        id: workflow?.id || `workflow-${Date.now()}`,
        name,
        description,
        steps,
        createdAt: workflow?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      await onRun?.(newWorkflow);
    } catch (error) {
      console.error('Workflow execution failed:', error);
      alert(`Workflow failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunning(false);
    }
  }, [name, description, steps, workflow, onRun]);

  const selectedStep = steps.find(s => s.id === selectedStepId);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex-1">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workflow Name"
            className="text-lg font-semibold bg-transparent border-none outline-none w-full"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="text-sm text-gray-400 bg-transparent border-none outline-none w-full mt-1"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-200 border border-blue-500/40 hover:bg-blue-500/30 transition-colors flex items-center gap-2"
          >
            <Save size={16} />
            Save
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning || steps.length === 0}
            className="px-4 py-2 rounded-lg bg-green-500/20 text-green-200 border border-green-500/40 hover:bg-green-500/30 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Run
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Steps Panel */}
        <div className="w-80 border-r border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Steps</h3>
            <div className="grid grid-cols-2 gap-2">
              {STEP_TYPES.map(({ type, label, icon: Icon, color }) => (
                <button
                  key={type}
                  onClick={() => addStep(type)}
                  className={`p-2 rounded-lg border border-gray-700 hover:border-${color}-500/40 bg-gray-800/50 hover:bg-gray-800 transition-colors flex flex-col items-center gap-1 text-xs`}
                >
                  <Icon size={16} className={`text-${color}-400`} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {steps.length === 0 ? (
              <div className="text-center text-gray-500 py-8 text-sm">
                <Settings size={32} className="mx-auto mb-2 opacity-50" />
                <p>No steps yet</p>
                <p className="text-xs mt-1">Add steps from above</p>
              </div>
            ) : (
              steps.map((step, index) => {
                const stepType = STEP_TYPES.find(s => s.type === step.type);
                const Icon = stepType?.icon || Settings;
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedStepId === step.id
                        ? 'border-blue-500/60 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                    onClick={() => setSelectedStepId(step.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className="text-gray-400" />
                        <span className="text-xs font-medium text-gray-300">
                          {index + 1}. {step.label}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeStep(step.id);
                        }}
                        className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {step.nextStepId && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                        <ArrowRight size={10} />
                        <span>→ Step {steps.findIndex(s => s.id === step.nextStepId) + 1}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Step Editor */}
        <div className="flex-1 flex flex-col">
          {selectedStep ? (
            <StepEditor
              step={selectedStep}
              onUpdate={(updates) => updateStep(selectedStep.id, updates)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Settings size={48} className="mx-auto mb-4 opacity-30" />
                <p>Select a step to edit</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StepEditor({ step, onUpdate }: { step: WorkflowStep; onUpdate: (updates: Partial<WorkflowStep>) => void }) {
  const stepType = STEP_TYPES.find(s => s.type === step.type);
  const Icon = stepType?.icon || Settings;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-2 rounded-lg bg-${stepType?.color || 'gray'}-500/20`}>
            <Icon size={20} className={`text-${stepType?.color || 'gray'}-400`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{step.label}</h3>
            <p className="text-sm text-gray-400">{stepType?.label} Step</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Label</label>
            <input
              type="text"
              value={step.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {step.type === 'search' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Search Query</label>
                <input
                  type="text"
                  value={step.config.query || ''}
                  onChange={(e) => onUpdate({ config: { ...step.config, query: e.target.value } })}
                  placeholder="Enter search query..."
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </>
          )}

          {step.type === 'navigate' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">URL</label>
                <input
                  type="text"
                  value={step.config.url || ''}
                  onChange={(e) => onUpdate({ config: { ...step.config, url: e.target.value } })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </>
          )}

          {step.type === 'extract' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Selector</label>
                <input
                  type="text"
                  value={step.config.selector || ''}
                  onChange={(e) => onUpdate({ config: { ...step.config, selector: e.target.value } })}
                  placeholder="CSS selector (e.g., .title, #content)"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Extract As</label>
                <select
                  value={step.config.extractAs || 'text'}
                  onChange={(e) => onUpdate({ config: { ...step.config, extractAs: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="text">Text</option>
                  <option value="html">HTML</option>
                  <option value="attribute">Attribute</option>
                  <option value="json">JSON</option>
                </select>
              </div>
            </>
          )}

          {step.type === 'click' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Selector</label>
                <input
                  type="text"
                  value={step.config.selector || ''}
                  onChange={(e) => onUpdate({ config: { ...step.config, selector: e.target.value } })}
                  placeholder="CSS selector or text"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </>
          )}

          {step.type === 'fill' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Selector</label>
                <input
                  type="text"
                  value={step.config.selector || ''}
                  onChange={(e) => onUpdate({ config: { ...step.config, selector: e.target.value } })}
                  placeholder="CSS selector"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Value</label>
                <input
                  type="text"
                  value={step.config.value || ''}
                  onChange={(e) => onUpdate({ config: { ...step.config, value: e.target.value } })}
                  placeholder="Text to fill"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </>
          )}

          {step.type === 'wait' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Duration (ms)</label>
                <input
                  type="number"
                  value={step.config.duration || 1000}
                  onChange={(e) => onUpdate({ config: { ...step.config, duration: parseInt(e.target.value) || 1000 } })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </>
          )}

          {step.type === 'condition' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Condition Type</label>
                <select
                  value={step.condition?.type || 'equals'}
                  onChange={(e) => onUpdate({ 
                    condition: { 
                      type: (e.target.value as 'equals' | 'contains' | 'exists'),
                      field: step.condition?.field || '',
                      value: step.condition?.value || '',
                    } 
                  })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="equals">Equals</option>
                  <option value="contains">Contains</option>
                  <option value="exists">Exists</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Field</label>
                <input
                  type="text"
                  value={step.condition?.field || ''}
                  onChange={(e) => onUpdate({ 
                    condition: { 
                      type: step.condition?.type || 'equals',
                      field: e.target.value,
                      value: step.condition?.value || '',
                    } 
                  })}
                  placeholder="Field to check"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Value</label>
                <input
                  type="text"
                  value={step.condition?.value || ''}
                  onChange={(e) => onUpdate({ 
                    condition: { 
                      type: step.condition?.type || 'equals',
                      field: step.condition?.field || '',
                      value: e.target.value,
                    } 
                  })}
                  placeholder="Expected value"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </>
          )}

          {step.type === 'loop' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Loop Over</label>
                <select
                  value={step.config.loopOver || 'items'}
                  onChange={(e) => onUpdate({ config: { ...step.config, loopOver: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="items">Items from previous step</option>
                  <option value="range">Number range</option>
                  <option value="selector">Elements matching selector</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function getDefaultConfig(type: WorkflowStep['type']): Record<string, any> {
  switch (type) {
    case 'search':
      return { query: '' };
    case 'navigate':
      return { url: '' };
    case 'extract':
      return { selector: '', extractAs: 'text' };
    case 'click':
      return { selector: '' };
    case 'fill':
      return { selector: '', value: '' };
    case 'wait':
      return { duration: 1000 };
    case 'condition':
      return {};
    case 'loop':
      return { loopOver: 'items' };
    default:
      return {};
  }
}

