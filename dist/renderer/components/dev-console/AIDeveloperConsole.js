import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Developer Console - Feature #8
 * AI-enhanced dev tools
 */
import { useState, useRef, useEffect } from 'react';
import { Code, Sparkles, Zap, Play } from 'lucide-react';
import { toast } from '../../utils/toast';
export function AIDeveloperConsole() {
    const [code, setCode] = useState('');
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [aiExplanation, setAiExplanation] = useState('');
    const [error, setError] = useState(null);
    const consoleRef = useRef(null);
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
            if (!iframeWindow)
                throw new Error('Failed to create sandbox');
            // Capture console output
            let capturedOutput = '';
            const consoleObj = iframeWindow.console;
            if (consoleObj && consoleObj.log) {
                const originalLog = consoleObj.log;
                consoleObj.log = (...args) => {
                    capturedOutput += args.map(a => String(a)).join(' ') + '\n';
                    originalLog.apply(consoleObj, args);
                };
            }
            // Execute code
            const result = iframeWindow.eval ? iframeWindow.eval(code) : eval(code);
            if (result !== undefined) {
                capturedOutput += String(result) + '\n';
            }
            setOutput(capturedOutput || 'Code executed successfully');
            document.body.removeChild(iframe);
        }
        catch (err) {
            setError(err.message);
            setOutput(`Error: ${err.message}`);
        }
        finally {
            setIsRunning(false);
        }
    };
    const explainError = async (errorText) => {
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
            }
            else {
                setAiExplanation('Failed to get AI explanation');
            }
        }
        catch {
            setAiExplanation('AI service unavailable');
        }
    };
    const generateCode = async (prompt) => {
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
        }
        catch {
            toast.error('Failed to generate code');
        }
    };
    const fixCode = async () => {
        if (!error)
            return;
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
        }
        catch {
            toast.error('Failed to fix code');
        }
    };
    useEffect(() => {
        if (error) {
            explainError(error);
        }
    }, [error]);
    return (_jsxs("div", { className: "flex flex-col h-full bg-gray-900 text-white", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-gray-700", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Code, { className: "w-5 h-5 text-purple-400" }), _jsx("h2", { className: "text-lg font-semibold", children: "AI Developer Console" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: () => generateCode('Create a function that calculates factorial'), className: "px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm flex items-center gap-1", children: [_jsx(Sparkles, { className: "w-4 h-4" }), "Generate"] }), error && (_jsxs("button", { onClick: fixCode, className: "px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm flex items-center gap-1", children: [_jsx(Zap, { className: "w-4 h-4" }), "Fix"] })), _jsxs("button", { onClick: runCode, disabled: isRunning || !code.trim(), className: "px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm flex items-center gap-1 disabled:opacity-50", children: [_jsx(Play, { className: "w-4 h-4" }), "Run"] })] })] }), _jsxs("div", { className: "flex-1 flex", children: [_jsxs("div", { className: "flex-1 flex flex-col", children: [_jsx("div", { className: "p-2 border-b border-gray-700 bg-gray-800", children: _jsx("span", { className: "text-xs text-gray-400", children: "JavaScript" }) }), _jsx("textarea", { value: code, onChange: e => setCode(e.target.value), placeholder: "Write or paste JavaScript code here...", className: "flex-1 bg-gray-950 text-green-400 font-mono text-sm p-4 resize-none focus:outline-none", spellCheck: false })] }), _jsxs("div", { className: "w-1/2 flex flex-col border-l border-gray-700", children: [_jsx("div", { className: "p-2 border-b border-gray-700 bg-gray-800", children: _jsx("span", { className: "text-xs text-gray-400", children: "Output" }) }), _jsxs("div", { ref: consoleRef, className: "flex-1 overflow-y-auto p-4 font-mono text-sm bg-gray-950", children: [isRunning && _jsx("div", { className: "text-yellow-400", children: "Running..." }), error && _jsx("div", { className: "text-red-400", children: error }), output && _jsx("div", { className: "text-green-400 whitespace-pre-wrap", children: output }), !output && !error && !isRunning && (_jsx("div", { className: "text-gray-500", children: "Output will appear here" }))] })] })] }), aiExplanation && (_jsx("div", { className: "p-4 border-t border-gray-700 bg-purple-900/20", children: _jsxs("div", { className: "flex items-start gap-2", children: [_jsx(Sparkles, { className: "w-5 h-5 text-purple-400 mt-0.5" }), _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "text-sm font-semibold text-purple-300 mb-1", children: "AI Explanation" }), _jsx("p", { className: "text-sm text-gray-300", children: aiExplanation })] })] }) }))] }));
}
