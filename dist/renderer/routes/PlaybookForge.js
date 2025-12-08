import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { executeAutomation, getAutomationStatus, onAutomationStatusUpdate, } from '../services/automationBridge';
import { toast } from '../utils/toast';
import { Play, Loader2, CheckCircle2, XCircle, AlertCircle, Sparkles } from 'lucide-react';
import { parseChainDefinition, getChainExecutor } from '../core/agents/chainExecutor';
import { ChainProgressIndicator } from '../components/agents/ChainProgressIndicator';
import { YAMLEditor } from '../components/workflows/YAMLEditor';
import { TemplateGallery } from '../components/workflows/TemplateGallery';
import { parseWorkflowDefinition } from '../core/workflows/yamlParser';
const KEY = 'omnib_playbooks_v1';
function load() {
    try {
        return JSON.parse(localStorage.getItem(KEY) || '[]');
    }
    catch {
        return [];
    }
}
function save(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
}
export default function PlaybookForge() {
    const [items, setItems] = useState(load());
    const [title, setTitle] = useState('New Playbook');
    const [yaml, setYaml] = useState('');
    const [currentExecution, setCurrentExecution] = useState(getAutomationStatus());
    const [showTemplates, setShowTemplates] = useState(false);
    const [showTemplateGallery, setShowTemplateGallery] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);
    const [validationWarnings, setValidationWarnings] = useState([]);
    // Phase 1, Day 8: Chain execution state
    const [chainExecution, setChainExecution] = useState(null);
    const [chainExecutor] = useState(() => getChainExecutor());
    useEffect(() => {
        setItems(load());
        // AUTOMATION INTEGRATION: Listen for automation status updates
        const unsubscribe = onAutomationStatusUpdate(setCurrentExecution);
        return unsubscribe;
    }, []);
    const addFromRecorder = async () => {
        try {
            const dsl = await window.recorder?.getDsl?.();
            const y = typeof dsl === 'string' ? dsl : JSON.stringify(dsl, null, 2);
            setYaml(y);
        }
        catch (error) {
            console.error('[PlaybookForge] Failed to get DSL from recorder:', error);
            // Silently fail - user can manually enter YAML
        }
    };
    const saveItem = () => {
        try {
            const next = [{ id: cryptoRandom(), title, yaml, createdAt: Date.now() }, ...items];
            setItems(next);
            save(next);
        }
        catch (error) {
            console.error('[PlaybookForge] Failed to save item:', error);
            // Could show toast notification here
        }
    };
    const runItem = async (pb) => {
        try {
            // Phase 1, Day 8: Try chain executor first
            const chain = parseChainDefinition(pb.yaml);
            if (chain) {
                // Execute as agent chain
                setChainExecution({
                    chainId: chain.id,
                    status: 'pending',
                    currentStep: 0,
                    totalSteps: chain.steps.length,
                    progress: 0,
                    results: [],
                });
                const state = await chainExecutor.execute(chain, (progressState) => {
                    setChainExecution(progressState);
                });
                setChainExecution(state);
                if (state.status === 'completed') {
                    toast.success(`Chain "${chain.name}" completed successfully`);
                }
                else if (state.status === 'failed') {
                    toast.error(`Chain "${chain.name}" failed: ${state.error}`);
                }
                return;
            }
            // Fallback to automation bridge
            const parsed = JSON.parse(pb.yaml);
            // AUTOMATION INTEGRATION: Use automation bridge to execute
            const playbook = {
                id: pb.id,
                title: pb.title,
                goal: parsed.goal || 'Execute automation',
                steps: parsed.steps || [],
                output: parsed.output,
            };
            await executeAutomation(playbook);
        }
        catch (error) {
            console.error('[PlaybookForge] Failed to run playbook:', error);
            if (error instanceof SyntaxError) {
                toast.error('Invalid JSON/YAML format');
            }
            else {
                toast.error(`Failed to run playbook: ${error instanceof Error ? error.message : String(error)}`);
            }
            if (chainExecution) {
                setChainExecution({
                    ...chainExecution,
                    status: 'failed',
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    };
    const cancelChain = () => {
        chainExecutor.cancel();
        setChainExecution(null);
        toast.info('Chain execution cancelled');
    };
    const loadTemplate = (template) => {
        setTitle(template.title);
        setYaml(JSON.stringify({
            goal: template.goal,
            steps: template.steps,
            output: template.output,
        }, null, 2));
        setShowTemplateGallery(false);
        toast.success(`Loaded template: ${template.title}`);
    };
    // Phase 2, Day 3: Validate workflow
    const handleValidate = (isValid, error) => {
        if (!isValid && error) {
            setValidationErrors([error]);
        }
        else {
            // Full validation
            const result = parseWorkflowDefinition(yaml);
            setValidationErrors(result.errors);
            setValidationWarnings(result.warnings);
        }
    };
    return (_jsxs("div", { className: "grid h-full grid-cols-2 gap-4 p-4", children: [_jsxs("div", { className: "flex flex-col gap-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "font-medium text-white", children: "Create Workflow" }), _jsxs("button", { className: "flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-1.5 text-xs text-white hover:bg-purple-700 transition-colors", onClick: () => setShowTemplateGallery(true), children: [_jsx(Sparkles, { className: "h-3 w-3" }), "Browse Templates"] })] }), showTemplateGallery && (_jsx(TemplateGallery, { onSelect: loadTemplate, onClose: () => setShowTemplateGallery(false) })), chainExecution && (_jsx(ChainProgressIndicator, { state: chainExecution, onCancel: chainExecution.status === 'running' ? cancelChain : undefined })), !chainExecution && currentExecution && currentExecution.status !== 'idle' && (_jsxs("div", { className: `flex items-center gap-2 rounded p-2 text-xs ${currentExecution.status === 'running'
                            ? 'border border-blue-700 bg-blue-900/30'
                            : currentExecution.status === 'success'
                                ? 'border border-green-700 bg-green-900/30'
                                : currentExecution.status === 'error'
                                    ? 'border border-red-700 bg-red-900/30'
                                    : 'border border-yellow-700 bg-yellow-900/30'}`, children: [currentExecution.status === 'running' && _jsx(Loader2, { className: "h-3 w-3 animate-spin" }), currentExecution.status === 'success' && (_jsx(CheckCircle2, { className: "h-3 w-3 text-green-400" })), currentExecution.status === 'error' && _jsx(XCircle, { className: "h-3 w-3 text-red-400" }), currentExecution.status === 'cancelled' && (_jsx(AlertCircle, { className: "h-3 w-3 text-yellow-400" })), _jsxs("span", { children: [currentExecution.status === 'running' && `Running: ${currentExecution.playbookId}`, currentExecution.status === 'success' && 'Completed successfully', currentExecution.status === 'error' && `Error: ${currentExecution.error}`, currentExecution.status === 'cancelled' && 'Cancelled'] }), currentExecution.progress !== undefined && (_jsxs("div", { className: "ml-auto text-xs", children: [currentExecution.progress, "%"] }))] })), _jsx("input", { className: "rounded bg-neutral-800 px-2 py-1", value: title, onChange: e => setTitle(e.target.value) }), _jsx(YAMLEditor, { value: yaml, onChange: setYaml, onValidate: handleValidate, placeholder: "Enter workflow definition in YAML or JSON format...", height: "400px" }), validationErrors.length > 0 && (_jsxs("div", { className: "rounded-lg border border-red-500/50 bg-red-500/10 p-3", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2 text-sm font-medium text-red-300", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), "Validation Errors"] }), _jsx("ul", { className: "space-y-1 text-xs text-red-200", children: validationErrors.map((error, idx) => (_jsxs("li", { children: ["\u2022 ", error] }, idx))) })] })), validationWarnings.length > 0 && validationErrors.length === 0 && (_jsxs("div", { className: "rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3", children: [_jsxs("div", { className: "mb-2 flex items-center gap-2 text-sm font-medium text-yellow-300", children: [_jsx(AlertCircle, { className: "h-4 w-4" }), "Warnings"] }), _jsx("ul", { className: "space-y-1 text-xs text-yellow-200", children: validationWarnings.map((warning, idx) => (_jsxs("li", { children: ["\u2022 ", warning] }, idx))) })] })), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: "rounded bg-neutral-800 px-2 py-1", onClick: addFromRecorder, children: "Load from Recorder" }), _jsx("button", { className: "rounded bg-indigo-600 px-2 py-1 text-white", onClick: saveItem, children: "Save" })] })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("h3", { className: "font-medium", children: "Library" }), _jsx("div", { className: "space-y-2 overflow-auto", children: items.map(pb => (_jsxs("div", { className: "rounded border border-neutral-800 p-2", children: [_jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsx("div", { className: "font-medium", children: pb.title }), _jsx("div", { className: "text-xs text-neutral-400", children: new Date(pb.createdAt).toLocaleString() })] }), _jsx("pre", { className: "max-h-40 overflow-auto rounded bg-neutral-900 p-2 text-xs", children: pb.yaml }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: "flex items-center gap-1 rounded bg-indigo-600 px-2 py-1 text-white disabled:opacity-50", onClick: () => runItem(pb), disabled: currentExecution?.status === 'running', children: currentExecution?.status === 'running' &&
                                                currentExecution.playbookId === pb.id ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-3 w-3 animate-spin" }), "Running..."] })) : (_jsxs(_Fragment, { children: [_jsx(Play, { className: "h-3 w-3" }), "Run"] })) }), _jsx("button", { className: "rounded bg-neutral-800 px-2 py-1", onClick: () => {
                                                const next = items.filter(x => x.id !== pb.id);
                                                setItems(next);
                                                save(next);
                                            }, children: "Delete" })] })] }, pb.id))) })] })] }));
}
function cryptoRandom() {
    return Math.random().toString(36).slice(2);
}
