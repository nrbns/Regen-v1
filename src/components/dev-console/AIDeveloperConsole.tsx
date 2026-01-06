/**
 * Developer Console - Feature #8
 * AI-enhanced dev tools
 */

import { useState, useRef, useEffect } from 'react';
import { Code, Sparkles, Zap, Play } from 'lucide-react';
import { toast } from '../../utils/toast';
import { isV1ModeEnabled } from '../../config/mvpFeatureFlags';
import { requestExecution } from '../../core/executor/ExecutionGate';
import ContextPanel from '../context/ContextPanel';

export function AIDeveloperConsole() {
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  const runCode = async () => {
    setIsRunning(true);
    setOutput('');
    setError(null);

    try {
      // In v1-mode we do not allow arbitrary in-browser code execution.
      if (isV1ModeEnabled()) {
        throw new Error('Execution disabled in v1-mode for safety');
      }

      // Route execution request through the central ExecutionGate for auditing.
      // By default ExecutionGate denies execution until an approved sandbox is implemented.
      const result = await requestExecution({ type: 'developer:runCode', payload: { code } });
      setOutput(result?.output || 'Execution routed to sandbox');
    } catch (err: any) {
      setError(err?.message || String(err));
      setOutput(`Error: ${err?.message || String(err)}`);
    } finally {
      setIsRunning(false);
    }
  };

  const explainError = async (errorText: string) => {
    try {
      // Call AI API to explain error
      const response = await fetch('http://localhost:4000/api/ai/explain-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: errorText, code }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiExplanation(data.explanation || 'No explanation available');
      } else {
        setAiExplanation('Failed to get AI explanation');
      }
    } catch {
      setAiExplanation('AI service unavailable');
    }
  };

  const generateCode = async (prompt: string) => {
    try {
      const response = await fetch('http://localhost:4000/api/ai/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, language: 'javascript' }),
      });

      if (response.ok) {
        const data = await response.json();
        setCode(data.code || '');
        toast.success('Code generated!');
      }
    } catch {
      toast.error('Failed to generate code');
    }
  };

  const fixCode = async () => {
    if (!error) return;

    try {
      const response = await fetch('http://localhost:4000/api/ai/fix-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, error }),
      });

      if (response.ok) {
        const data = await response.json();
        setCode(data.fixedCode || code);
        setError(null);
        toast.success('Code fixed!');
      }
    } catch {
      toast.error('Failed to fix code');
    }
  };

  useEffect(() => {
    if (error) {
      explainError(error);
    }
  }, [error]);

  return (
    <div className="flex h-full flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 p-4">
        <div className="flex items-center gap-2">
          <Code className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold">AI Developer Console</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => generateCode('Create a function that calculates factorial')}
            className="flex items-center gap-1 rounded bg-purple-600 px-3 py-1 text-sm hover:bg-purple-700"
          >
            <Sparkles className="h-4 w-4" />
            Generate
          </button>
          {error && (
            <button
              onClick={fixCode}
              className="flex items-center gap-1 rounded bg-green-600 px-3 py-1 text-sm hover:bg-green-700"
            >
              <Zap className="h-4 w-4" />
              Fix
            </button>
          )}
          <button
            onClick={runCode}
            disabled={isRunning || !code.trim()}
            className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Run
          </button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex flex-1">
        <div className="flex flex-1 flex-col">
          <div className="border-b border-gray-700 bg-gray-800 p-2">
            <span className="text-xs text-gray-400">JavaScript</span>
          </div>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Write or paste JavaScript code here..."
            className="flex-1 resize-none bg-gray-950 p-4 font-mono text-sm text-green-400 focus:outline-none"
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className="flex w-1/2 flex-col border-l border-gray-700">
          <div className="border-b border-gray-700 bg-gray-800 p-2">
            <span className="text-xs text-gray-400">Output</span>
          </div>
          <div
            ref={consoleRef}
            className="flex-1 overflow-y-auto bg-gray-950 p-4 font-mono text-sm"
          >
            {isRunning && <div className="text-yellow-400">Running...</div>}
            {error && <div className="text-red-400">{error}</div>}
            {output && <div className="whitespace-pre-wrap text-green-400">{output}</div>}
            {!output && !error && !isRunning && (
              <div className="text-gray-500">Output will appear here</div>
            )}
          </div>

          {/* Context Panel - recent navigations */}
          <ContextPanel />
        </div>
      </div>

      {/* AI Explanation */}
      {aiExplanation && (
        <div className="border-t border-gray-700 bg-purple-900/20 p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-5 w-5 text-purple-400" />
            <div className="flex-1">
              <h3 className="mb-1 text-sm font-semibold text-purple-300">AI Explanation</h3>
              <p className="text-sm text-gray-300">{aiExplanation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
