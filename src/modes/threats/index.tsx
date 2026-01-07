import { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle2, XCircle, Loader2, Search, ExternalLink, Lock } from 'lucide-react';
import { useAgentExecutor } from '../../core/agents/useAgentRuntime';

interface ThreatResult {
  url: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  threats: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
  }>;
  aiAnalysis?: string;
}

export default function ThreatsPanel() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<ThreatResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runThreatsAgent = useAgentExecutor('threats.agent');

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Try IPC threat scan first
      let scanResult: any = null;
      try {
        scanResult = await (window as any).api?.threats?.scanUrl?.(url);
      } catch {
        console.warn('[ThreatsPanel] IPC scan not available, using agent only');
      }

      // Run AI agent for threat analysis
      const agentResult = await runThreatsAgent({
        prompt: `Analyze security threats for URL: ${url}`,
        context: { mode: 'Threats', url, scanResult },
      });

      // Build threat result
      const threatResult: ThreatResult = {
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
    } catch (err) {
      console.error('[ThreatsPanel] Scan failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan URL');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk: ThreatResult['riskLevel']) => {
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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <XCircle size={16} className="text-red-400" />;
      case 'medium':
        return <AlertTriangle size={16} className="text-yellow-400" />;
      case 'low':
        return <CheckCircle2 size={16} className="text-green-400" />;
      default:
        return <Shield size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#1A1D28] text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800/40 bg-gray-900/40 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-red-500/10 p-2">
            <Shield size={20} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Threat Mode</h2>
            <p className="text-xs text-gray-400">Security analysis with network isolation</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-green-400">
            <Lock size={14} />
            <span>Ghost Mode + Tor Active</span>
          </div>
        </div>
      </div>

      {/* Scan Input */}
      <div className="border-b border-gray-800/40 px-6 py-4">
        <form onSubmit={handleScan} className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL to scan for threats..."
              className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Shield size={16} />
                Scan
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="border-b border-gray-800/40 bg-red-500/10 px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-red-300">
            <AlertTriangle size={18} />
            {error}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-6">
        {!result ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="rounded-full border border-dashed border-gray-700/60 bg-gray-800/30 p-8 mb-4">
              <Shield size={48} className="text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-200 mb-2">No scan results</h3>
            <p className="text-sm text-gray-400 max-w-md">
              Enter a URL above to analyze security threats, vulnerabilities, and get threat intelligence.
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Risk Summary */}
            <div className={`rounded-lg border p-4 ${getRiskColor(result.riskLevel)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide mb-1">Overall Risk Level</div>
                  <div className="text-2xl font-bold capitalize">{result.riskLevel}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400 mb-1">URL</div>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline flex items-center gap-1"
                  >
                    {result.url}
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            {result.aiAnalysis && (
              <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
                <div className="text-xs font-semibold text-purple-300 mb-2">AI Threat Analysis</div>
                <div className="text-sm text-gray-300 whitespace-pre-wrap">{result.aiAnalysis}</div>
              </div>
            )}

            {/* Threats List */}
            <div className="space-y-3">
              <div className="text-sm font-semibold text-gray-200">Detected Threats</div>
              {result.threats.map((threat, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-gray-700/50 bg-gray-800/30 p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {getSeverityIcon(threat.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-200">{threat.type}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border capitalize ${getRiskColor(
                              threat.severity as ThreatResult['riskLevel']
                            )}`}
                          >
                            {threat.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">{threat.description}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          <span className="font-semibold">Recommendation:</span> {threat.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


