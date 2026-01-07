/**
 * Approval Panel - Week 1, Day 3
 * User interface for reviewing and approving execution plans
 * Shows task DAG, estimates, risks, and provides approve/reject controls
 */

import React, { useState } from 'react';
import type { ExecutionPlan } from '../hooks/useOrchestrator';

interface ApprovalPanelProps {
  plan: ExecutionPlan;
  onApprove: (planId: string) => void;
  onReject: (planId: string, reason: string) => void;
  _onModify?: (planId: string, modifications: Partial<ExecutionPlan>) => void;
}

export const ApprovalPanel: React.FC<ApprovalPanelProps> = ({ plan, onApprove, onReject }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-green-600 bg-green-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'high':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getAgentIcon = (agentType: string) => {
    const icons: Record<string, string> = {
      mail: '📧',
      ppt: '📊',
      booking: '🎫',
      research: '🔍',
      trading: '📈',
      browser: '🌐',
      file: '📁',
      general: '💬',
    };
    return icons[agentType] || '🤖';
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  };

  const calculateEstimatedTime = () => {
    // Sum up all task durations for display
    return plan.tasks.reduce((sum, task) => sum + (task.estimatedDuration || 0), 0);
  };

  const handleApprove = () => {
    onApprove(plan.planId);
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    onReject(plan.planId, rejectReason);
    setIsRejecting(false);
  };

  return (
    <div className="approval-panel mx-auto max-w-4xl rounded-lg border border-gray-200 bg-white shadow-lg">
      {/* Header */}
      <div className="rounded-t-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {getAgentIcon(plan.intent.suggestedAgents?.[0] || 'general')}
            </span>
            <div>
              <h2 className="text-xl font-bold">Execution Plan Approval</h2>
              <p className="text-sm text-blue-100">
                {plan.intent.suggestedAgents?.[0] || 'general'} • {plan.intent.intent}
              </p>
            </div>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-sm font-semibold ${getRiskColor(plan.riskLevel)}`}
          >
            {plan.riskLevel.toUpperCase()} RISK
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 border-b bg-gray-50 px-6 py-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{plan.tasks.length}</div>
          <div className="text-sm text-gray-600">Tasks</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {formatDuration(calculateEstimatedTime())}
          </div>
          <div className="text-sm text-gray-600">Est. Duration</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(plan.intent.confidence * 100)}%
          </div>
          <div className="text-sm text-gray-600">Confidence</div>
        </div>
      </div>

      {/* Task List */}
      <div className="px-6 py-4">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          📋 Execution Steps
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="ml-auto text-sm text-blue-600 hover:text-blue-700"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </h3>

        <div className="space-y-3">
          {plan.tasks.map((task, index) => (
            <div key={task.taskId} className={`rounded-lg border border-gray-200 p-4`}>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getAgentIcon(task.agent)}</span>
                    <span className="font-semibold text-gray-900">{task.name}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{task.description}</p>

                  {showDetails && (
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      {task.estimatedDuration && (
                        <div>⏱️ Duration: {formatDuration(task.estimatedDuration)}</div>
                      )}
                      {task.dependencies && task.dependencies.length > 0 && (
                        <div>🔗 Depends on: {task.dependencies.join(', ')}</div>
                      )}
                      {task.parameters && (
                        <div className="mt-2 overflow-x-auto rounded bg-gray-100 p-2 font-mono text-xs">
                          {JSON.stringify(task.parameters, null, 2)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Warning */}
      {plan.riskLevel === 'high' && (
        <div className="mx-6 mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-semibold text-red-900">High Risk Operation</div>
              <div className="mt-1 text-sm text-red-700">
                This plan includes operations that may:
                <ul className="ml-5 mt-1 list-disc">
                  <li>Make financial transactions</li>
                  <li>Delete or modify important data</li>
                  <li>Access external APIs with rate limits</li>
                  <li>Cannot be easily reversed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between rounded-b-lg border-t bg-gray-50 px-6 py-4">
        <div className="text-sm text-gray-600">
          Plan ID:{' '}
          <code className="rounded bg-gray-200 px-2 py-1 font-mono text-xs">{plan.planId}</code>
        </div>

        <div className="flex gap-3">
          {!isRejecting ? (
            <>
              <button
                onClick={() => setIsRejecting(true)}
                className="rounded-lg bg-gray-200 px-6 py-2 font-semibold text-gray-800 transition-colors hover:bg-gray-300"
              >
                ❌ Reject
              </button>
              <button
                onClick={handleApprove}
                className="rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-6 py-2 font-semibold text-white shadow-md transition-colors hover:from-green-600 hover:to-green-700"
              >
                ✅ Approve & Execute
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={() => setIsRejecting(false)}
                className="rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-800 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="rounded-lg bg-red-600 px-6 py-2 font-semibold text-white hover:bg-red-700"
              >
                Confirm Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalPanel;
