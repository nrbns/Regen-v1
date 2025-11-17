/**
 * AccessibilityAudit - Accessibility Testing Component
 * 
 * Displays accessibility audit results and allows manual testing.
 * Uses axe-core for WCAG 2.1 AA compliance checking.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Accessibility, 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  RefreshCw, 
  ExternalLink,
  Info,
  XCircle,
  AlertCircle as AlertCircleIcon
} from 'lucide-react';
import { 
  runAccessibilityAudit, 
  calculateAccessibilityScore, 
  formatViolations 
} from '../../utils/accessibility-audit';

interface AuditResults {
  violations: any[];
  passes: any[];
  incomplete: any[];
  inapplicable: any[];
}

export function AccessibilityAudit() {
  const [auditing, setAuditing] = useState(false);
  const [results, setResults] = useState<AuditResults | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedViolations, setExpandedViolations] = useState<Set<string>>(new Set());

  const handleAudit = async () => {
    setAuditing(true);
    setError(null);
    setResults(null);
    setScore(null);

    try {
      const auditResults = await runAccessibilityAudit();
      setResults(auditResults);
      const calculatedScore = calculateAccessibilityScore(auditResults);
      setScore(calculatedScore);
    } catch (err) {
      console.error('Accessibility audit failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to run accessibility audit');
    } finally {
      setAuditing(false);
    }
  };

  const toggleViolation = (id: string) => {
    const newExpanded = new Set(expandedViolations);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedViolations(newExpanded);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'serious':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'moderate':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'minor':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-100 mb-2 flex items-center gap-2">
          <Accessibility size={20} />
          <span>Accessibility Audit</span>
        </h3>
        <p className="text-sm text-gray-400">
          Test your application for accessibility issues using axe-core. 
          This helps ensure WCAG 2.1 AA compliance.
        </p>
      </div>

      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-2">
          <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-200">
            <strong>Note:</strong> Accessibility audit is only available in development mode. 
            The audit checks for WCAG 2.1 AA compliance issues including ARIA attributes, 
            keyboard navigation, color contrast, and semantic HTML.
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <motion.button
          onClick={handleAudit}
          disabled={auditing || process.env.NODE_ENV !== 'development'}
          whileHover={{ scale: auditing ? 1 : 1.02 }}
          whileTap={{ scale: auditing ? 1 : 0.98 }}
          className={`px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2 ${
            auditing || process.env.NODE_ENV !== 'development' ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {auditing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Running Audit...</span>
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              <span>Run Accessibility Audit</span>
            </>
          )}
        </motion.button>

        {process.env.NODE_ENV !== 'development' && (
          <span className="text-sm text-gray-400">
            Accessibility audit is only available in development mode
          </span>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <XCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-200">
              <strong>Audit failed:</strong> {error}
            </div>
          </div>
        </div>
      )}

      {results && (
        <div className="space-y-6">
          {/* Score Summary */}
          {score !== null && (
            <div className="p-6 bg-gray-900/60 border border-gray-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-100">Accessibility Score</h4>
                <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
                  {score}/100
                </div>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    score >= 90 ? 'bg-green-500' :
                    score >= 70 ? 'bg-yellow-500' :
                    score >= 50 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <p className="text-sm text-gray-400 mt-2">
                {score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Needs Improvement' : 'Poor'} accessibility
              </p>
            </div>
          )}

          {/* Violations */}
          {results.violations.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-400" />
                <span>Violations ({results.violations.length})</span>
              </h4>
              <div className="space-y-3">
                {formatViolations(results.violations).map((violation) => (
                  <div
                    key={violation.id}
                    className={`p-4 rounded-lg border ${getImpactColor(violation.impact)}`}
                  >
                    <button
                      onClick={() => toggleViolation(violation.id)}
                      className="w-full text-left flex items-start justify-between gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded">
                            {violation.impact}
                          </span>
                          <span className="font-medium">{violation.id}</span>
                        </div>
                        <p className="text-sm mb-1">{violation.description}</p>
                        <p className="text-xs opacity-75">{violation.help}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">
                          {violation.nodes.length} issue{violation.nodes.length !== 1 ? 's' : ''}
                        </span>
                        {expandedViolations.has(violation.id) ? (
                          <XCircle size={16} />
                        ) : (
                          <Info size={16} />
                        )}
                      </div>
                    </button>
                    
                    {expandedViolations.has(violation.id) && (
                      <div className="mt-4 pt-4 border-t border-current/20">
                        <div className="space-y-3">
                          {violation.nodes.map((node, idx) => (
                            <div key={idx} className="p-3 bg-black/20 rounded text-sm">
                              <div className="font-mono text-xs mb-2 break-all">
                                {node.target.join(' → ')}
                              </div>
                              <div className="text-xs opacity-75 mb-2">
                                <code className="bg-black/30 px-2 py-1 rounded">
                                  {node.html}
                                </code>
                              </div>
                              {node.failureSummary && (
                                <div className="text-xs opacity-90">
                                  <strong>Issue:</strong> {node.failureSummary}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <a
                          href={violation.helpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs mt-3 text-blue-400 hover:text-blue-300 underline"
                        >
                          Learn more
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Passes */}
          {results.passes.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                <CheckCircle size={20} className="text-green-400" />
                <span>Passed Checks ({results.passes.length})</span>
              </h4>
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-200">
                  {results.passes.length} accessibility check{results.passes.length !== 1 ? 's' : ''} passed successfully.
                </p>
              </div>
            </div>
          )}

          {/* Incomplete */}
          {results.incomplete.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                <AlertCircleIcon size={20} className="text-yellow-400" />
                <span>Incomplete Checks ({results.incomplete.length})</span>
              </h4>
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-200">
                  {results.incomplete.length} check{results.incomplete.length !== 1 ? 's' : ''} could not be completed. 
                  These may require manual review.
                </p>
              </div>
            </div>
          )}

          {results.violations.length === 0 && results.passes.length > 0 && (
            <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
              <CheckCircle size={48} className="text-green-400 mx-auto mb-3" />
              <h4 className="text-lg font-semibold text-green-200 mb-2">
                No Accessibility Violations Found!
              </h4>
              <p className="text-sm text-green-300">
                Your application passes all automated accessibility checks.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

