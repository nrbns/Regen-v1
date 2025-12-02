import { useEffect, useState } from 'react';
import {
  executeAutomation,
  getAutomationStatus,
  onAutomationStatusUpdate,
  type AutomationPlaybook,
} from '../services/automationBridge';
import { getAllTemplates, getTemplate } from '../data/automationTemplates';
import { toast } from '../utils/toast';
import { Play, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

type Playbook = { id: string; title: string; yaml: string; createdAt: number };

const KEY = 'omnib_playbooks_v1';

function load(): Playbook[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}
function save(items: Playbook[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export default function PlaybookForge() {
  const [items, setItems] = useState<Playbook[]>(load());
  const [title, setTitle] = useState('New Playbook');
  const [yaml, setYaml] = useState('');
  const [currentExecution, setCurrentExecution] = useState(getAutomationStatus());
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    setItems(load());

    // AUTOMATION INTEGRATION: Listen for automation status updates
    const unsubscribe = onAutomationStatusUpdate(setCurrentExecution);
    return unsubscribe;
  }, []);

  const addFromRecorder = async () => {
    try {
      const dsl = await (window as any).recorder?.getDsl?.();
      const y = typeof dsl === 'string' ? dsl : JSON.stringify(dsl, null, 2);
      setYaml(y);
    } catch (error) {
      console.error('[PlaybookForge] Failed to get DSL from recorder:', error);
      // Silently fail - user can manually enter YAML
    }
  };

  const saveItem = () => {
    try {
      const next = [{ id: cryptoRandom(), title, yaml, createdAt: Date.now() }, ...items];
      setItems(next);
      save(next);
    } catch (error) {
      console.error('[PlaybookForge] Failed to save item:', error);
      // Could show toast notification here
    }
  };

  const runItem = async (pb: Playbook) => {
    try {
      const parsed = JSON.parse(pb.yaml);

      // AUTOMATION INTEGRATION: Use automation bridge to execute
      const playbook: AutomationPlaybook = {
        id: pb.id,
        title: pb.title,
        goal: parsed.goal || 'Execute automation',
        steps: parsed.steps || [],
        output: parsed.output,
      };

      await executeAutomation(playbook);
    } catch (error) {
      console.error('[PlaybookForge] Failed to run playbook:', error);
      if (error instanceof SyntaxError) {
        toast.error('Invalid JSON/YAML format');
      } else {
        toast.error(
          `Failed to run playbook: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  };

  const loadTemplate = (templateId: string) => {
    const template = getTemplate(templateId);
    if (template) {
      setTitle(template.title);
      setYaml(
        JSON.stringify(
          {
            goal: template.goal,
            steps: template.steps,
            output: template.output,
          },
          null,
          2
        )
      );
      setShowTemplates(false);
      toast.success(`Loaded template: ${template.title}`);
    }
  };

  return (
    <div className="grid h-full grid-cols-2 gap-4 p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Create Playbook</h3>
          <button
            className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
            onClick={() => setShowTemplates(!showTemplates)}
          >
            {showTemplates ? 'Hide' : 'Show'} Templates
          </button>
        </div>

        {/* AUTOMATION INTEGRATION: Show templates */}
        {showTemplates && (
          <div className="max-h-40 overflow-auto rounded border border-neutral-700 bg-neutral-900 p-2">
            <div className="mb-2 text-xs font-medium text-neutral-400">Sample Templates:</div>
            {getAllTemplates().map(template => (
              <button
                key={template.id}
                className="mb-1 block w-full rounded p-1 text-left text-xs hover:bg-neutral-800"
                onClick={() => loadTemplate(template.id)}
              >
                {template.title}
              </button>
            ))}
          </div>
        )}

        {/* AUTOMATION INTEGRATION: Show execution status */}
        {currentExecution && currentExecution.status !== 'idle' && (
          <div
            className={`flex items-center gap-2 rounded p-2 text-xs ${
              currentExecution.status === 'running'
                ? 'border border-blue-700 bg-blue-900/30'
                : currentExecution.status === 'success'
                  ? 'border border-green-700 bg-green-900/30'
                  : currentExecution.status === 'error'
                    ? 'border border-red-700 bg-red-900/30'
                    : 'border border-yellow-700 bg-yellow-900/30'
            }`}
          >
            {currentExecution.status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
            {currentExecution.status === 'success' && (
              <CheckCircle2 className="h-3 w-3 text-green-400" />
            )}
            {currentExecution.status === 'error' && <XCircle className="h-3 w-3 text-red-400" />}
            {currentExecution.status === 'cancelled' && (
              <AlertCircle className="h-3 w-3 text-yellow-400" />
            )}
            <span>
              {currentExecution.status === 'running' && `Running: ${currentExecution.playbookId}`}
              {currentExecution.status === 'success' && 'Completed successfully'}
              {currentExecution.status === 'error' && `Error: ${currentExecution.error}`}
              {currentExecution.status === 'cancelled' && 'Cancelled'}
            </span>
            {currentExecution.progress !== undefined && (
              <div className="ml-auto text-xs">{currentExecution.progress}%</div>
            )}
          </div>
        )}
        <input
          className="rounded bg-neutral-800 px-2 py-1"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <textarea
          id="playbook-yaml-editor"
          name="playbook-yaml"
          className="flex-1 rounded bg-neutral-800 p-2 text-xs"
          value={yaml}
          onChange={e => setYaml(e.target.value)}
          placeholder="Paste DSL (JSON/YAML) here"
        />
        <div className="flex gap-2">
          <button className="rounded bg-neutral-800 px-2 py-1" onClick={addFromRecorder}>
            Load from Recorder
          </button>
          <button className="rounded bg-indigo-600 px-2 py-1 text-white" onClick={saveItem}>
            Save
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">Library</h3>
        <div className="space-y-2 overflow-auto">
          {items.map(pb => (
            <div key={pb.id} className="rounded border border-neutral-800 p-2">
              <div className="flex items-center justify-between text-sm">
                <div className="font-medium">{pb.title}</div>
                <div className="text-xs text-neutral-400">
                  {new Date(pb.createdAt).toLocaleString()}
                </div>
              </div>
              <pre className="max-h-40 overflow-auto rounded bg-neutral-900 p-2 text-xs">
                {pb.yaml}
              </pre>
              <div className="flex gap-2">
                <button
                  className="flex items-center gap-1 rounded bg-indigo-600 px-2 py-1 text-white disabled:opacity-50"
                  onClick={() => runItem(pb)}
                  disabled={currentExecution?.status === 'running'}
                >
                  {currentExecution?.status === 'running' &&
                  currentExecution.playbookId === pb.id ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3" />
                      Run
                    </>
                  )}
                </button>
                <button
                  className="rounded bg-neutral-800 px-2 py-1"
                  onClick={() => {
                    const next = items.filter(x => x.id !== pb.id);
                    setItems(next);
                    save(next);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2);
}
