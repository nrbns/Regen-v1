/**
 * Developer Console - Feature #8
 * AI-enhanced dev tools
 */

import { useState, useRef, useEffect } from 'react';
import { Code, Sparkles, Bug, Zap, Play, Copy, Check } from 'lucide-react';
import { toast } from '../../utils/toast';

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
      // Create sandboxed execution
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const iframeWindow = iframe.contentWindow;
      if (!iframeWindow) throw new Error('Failed to create sandbox');

      // Capture console output
      let capturedOutput = '';
      const originalLog = iframeWindow.console.log;
      iframeWindow.console.log = (...args: any[]) => {
        capturedOutput += args.map(a => String(a)).join(' ') + '\n';
        originalLog.apply(iframeWindow.console, args);
      };

      // Execute code
      const result = iframeWindow.eval(code);
      
      if (result !== undefined) {
        capturedOutput += String(result) + '\n';
      }

      setOutput(capturedOutput || 'Code executed successfully');
      document.body.removeChild(iframe);
    } catch (err: any) {
      setError(err.message);
      setOutput(`Error: ${err.message}`);
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
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Code className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold">AI Developer Console</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => generateCode('Create a function that calculates factorial')}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm flex items-center gap-1"
          >
            <Sparkles className="w-4 h-4" />
            Generate
          </button>
          {error && (
            <button
              onClick={fixCode}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm flex items-center gap-1"
            >
              <Zap className="w-4 h-4" />
              Fix
            </button>
          )}
          <button
            onClick={runCode}
            disabled={isRunning || !code.trim()}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center gap-1 disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            Run
          </button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          <div className="p-2 border-b border-gray-700 bg-gray-800">
            <span className="text-xs text-gray-400">JavaScript</span>
          </div>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Write or paste JavaScript code here..."
            className="flex-1 bg-gray-950 text-green-400 font-mono text-sm p-4 resize-none focus:outline-none"
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className="w-1/2 flex flex-col border-l border-gray-700">
          <div className="p-2 border-b border-gray-700 bg-gray-800">
            <span className="text-xs text-gray-400">Output</span>
          </div>
          <div
            ref={consoleRef}
            className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-gray-950"
          >
            {isRunning && <div className="text-yellow-400">Running...</div>}
            {error && <div className="text-red-400">{error}</div>}
            {output && <div className="text-green-400 whitespace-pre-wrap">{output}</div>}
            {!output && !error && !isRunning && (
              <div className="text-gray-500">Output will appear here</div>
            )}
          </div>
        </div>
      </div>

      {/* AI Explanation */}
      {aiExplanation && (
        <div className="p-4 border-t border-gray-700 bg-purple-900/20">
          <div className="flex items-start gap-2">
            <Sparkles className="w-5 h-5 text-purple-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-purple-300 mb-1">AI Explanation</h3>
              <p className="text-sm text-gray-300">{aiExplanation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

