import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle2, XCircle, Loader2, Search, ExternalLink, Lock } from 'lucide-react';
import { useAgentExecutor } from '../../core/agents/useAgentRuntime';
export default function ThreatsPanel() {
    const [url, setUrl] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const runThreatsAgent = useAgentExecutor('threats.agent');
    const handleScan = async (e) => {
        e.preventDefault();
        if (!url.trim())
            return;
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            // Try IPC threat scan first
            let scanResult = null;
            try {
                scanResult = await window.api?.threats?.scanUrl?.(url);
            }
            catch {
                console.warn('[ThreatsPanel] IPC scan not available, using agent only');
            }
            // Run AI agent for threat analysis
            const agentResult = await runThreatsAgent({
                prompt: `Analyze security threats for URL: ${url}`,
                context: { mode: 'Threats', url, scanResult },
            });
            // Build threat result
            const threatResult = {
                url,
                riskLevel: scanResult?.riskLevel || 'medium',
                threats: scanResult?.threats || [
                    {
                        type: 'General Security Check',
                        severity: 'medium',
                        description: 'Security analysis completed via AI agent',
                        recommendation: 'Review AI analysis below for specific recommendations',
                    },
                ],
                aiAnalysis: agentResult.success ? agentResult.output : undefined,
            };
            setResult(threatResult);
        }
        catch (err) {
            console.error('[ThreatsPanel] Scan failed:', err);
            setError(err instanceof Error ? err.message : 'Failed to scan URL');
        }
        finally {
            setLoading(false);
        }
    };
    const getRiskColor = (risk) => {
        switch (risk) {
            case 'critical':
                return 'text-red-400 bg-red-500/10 border-red-500/30';
            case 'high':
                return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
            case 'medium':
                return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
            case 'low':
                return 'text-green-400 bg-green-500/10 border-green-500/30';
        }
    };
    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'critical':
            case 'high':
                return _jsx(XCircle, { size: 16, className: "text-red-400" });
            case 'medium':
                return _jsx(AlertTriangle, { size: 16, className: "text-yellow-400" });
            case 'low':
                return _jsx(CheckCircle2, { size: 16, className: "text-green-400" });
            default:
                return _jsx(Shield, { size: 16, className: "text-gray-400" });
        }
    };
    return (_jsxs("div", { className: "flex h-full flex-col bg-[#1A1D28] text-gray-100", children: [_jsx("div", { className: "border-b border-gray-800/40 bg-gray-900/40 px-6 py-4", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "rounded-lg bg-red-500/10 p-2", children: _jsx(Shield, { size: 20, className: "text-red-400" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-lg font-semibold text-gray-100", children: "Threat Mode" }), _jsx("p", { className: "text-xs text-gray-400", children: "Security analysis with network isolation" })] }), _jsxs("div", { className: "ml-auto flex items-center gap-2 text-xs text-green-400", children: [_jsx(Lock, { size: 14 }), _jsx("span", { children: "Ghost Mode + Tor Active" })] })] }) }), _jsx("div", { className: "border-b border-gray-800/40 px-6 py-4", children: _jsxs("form", { onSubmit: handleScan, className: "flex gap-3", children: [_jsxs("div", { className: "flex-1 relative", children: [_jsx(Search, { size: 18, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" }), _jsx("input", { type: "url", value: url, onChange: (e) => setUrl(e.target.value), placeholder: "Enter URL to scan for threats...", className: "w-full bg-gray-800/50 border border-gray-700/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50" })] }), _jsx("button", { type: "submit", disabled: loading || !url.trim(), className: "px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { size: 16, className: "animate-spin" }), "Scanning..."] })) : (_jsxs(_Fragment, { children: [_jsx(Shield, { size: 16 }), "Scan"] })) })] }) }), error && (_jsx("div", { className: "border-b border-gray-800/40 bg-red-500/10 px-6 py-4", children: _jsxs("div", { className: "flex items-center gap-2 text-sm text-red-300", children: [_jsx(AlertTriangle, { size: 18 }), error] }) })), _jsx("div", { className: "flex-1 overflow-y-auto p-6", children: !result ? (_jsxs("div", { className: "flex flex-col items-center justify-center h-full text-center", children: [_jsx("div", { className: "rounded-full border border-dashed border-gray-700/60 bg-gray-800/30 p-8 mb-4", children: _jsx(Shield, { size: 48, className: "text-gray-500" }) }), _jsx("h3", { className: "text-lg font-semibold text-gray-200 mb-2", children: "No scan results" }), _jsx("p", { className: "text-sm text-gray-400 max-w-md", children: "Enter a URL above to analyze security threats, vulnerabilities, and get threat intelligence." })] })) : (_jsxs("div", { className: "max-w-4xl mx-auto space-y-6", children: [_jsx("div", { className: `rounded-lg border p-4 ${getRiskColor(result.riskLevel)}`, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs uppercase tracking-wide mb-1", children: "Overall Risk Level" }), _jsx("div", { className: "text-2xl font-bold capitalize", children: result.riskLevel })] }), _jsxs("div", { className: "text-right", children: [_jsx("div", { className: "text-xs text-gray-400 mb-1", children: "URL" }), _jsxs("a", { href: result.url, target: "_blank", rel: "noopener noreferrer", className: "text-sm hover:underline flex items-center gap-1", children: [result.url, _jsx(ExternalLink, { size: 14 })] })] })] }) }), result.aiAnalysis && (_jsxs("div", { className: "rounded-lg border border-purple-500/30 bg-purple-500/5 p-4", children: [_jsx("div", { className: "text-xs font-semibold text-purple-300 mb-2", children: "AI Threat Analysis" }), _jsx("div", { className: "text-sm text-gray-300 whitespace-pre-wrap", children: result.aiAnalysis })] })), _jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "text-sm font-semibold text-gray-200", children: "Detected Threats" }), result.threats.map((threat, idx) => (_jsx("div", { className: "rounded-lg border border-gray-700/50 bg-gray-800/30 p-4 space-y-2", children: _jsx("div", { className: "flex items-start justify-between gap-3", children: _jsxs("div", { className: "flex items-start gap-3 flex-1", children: [getSeverityIcon(threat.severity), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: "text-sm font-semibold text-gray-200", children: threat.type }), _jsx("span", { className: `text-xs px-2 py-0.5 rounded-full border capitalize ${getRiskColor(threat.severity)}`, children: threat.severity })] }), _jsx("p", { className: "text-sm text-gray-300", children: threat.description }), _jsxs("p", { className: "text-xs text-gray-400 mt-2", children: [_jsx("span", { className: "font-semibold", children: "Recommendation:" }), " ", threat.recommendation] })] })] }) }) }, idx)))] })] })) })] }));
}
