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

export const ApprovalPanel: React.FC<ApprovalPanelProps> = ({
  plan,
  onApprove,
  onReject,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
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
    <div className="approval-panel bg-white rounded-lg shadow-lg border border-gray-200 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getAgentIcon(plan.intent.suggestedAgents?.[0] || 'general')}</span>
            <div>
              <h2 className="text-xl font-bold">Execution Plan Approval</h2>
              <p className="text-sm text-blue-100">
                {plan.intent.suggestedAgents?.[0] || 'general'} • {plan.intent.intent}
              </p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiskColor(plan.riskLevel)}`}>
            {plan.riskLevel.toUpperCase()} RISK
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-gray-50 border-b">
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
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          📋 Execution Steps
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-700 ml-auto"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </h3>

        <div className="space-y-3">
          {plan.tasks.map((task, index) => (
            <div
              key={task.taskId}
              className={`border rounded-lg p-4 border-gray-200`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getAgentIcon(task.agent)}</span>
                    <span className="font-semibold text-gray-900">{task.name}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  
                  {showDetails && (
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      {task.estimatedDuration && (
                        <div>⏱️ Duration: {formatDuration(task.estimatedDuration)}</div>
                      )}
                      {task.dependencies && task.dependencies.length > 0 && (
                        <div>🔗 Depends on: {task.dependencies.join(', ')}</div>
                      )}
                      {task.parameters && (
                        <div className="mt-2 bg-gray-100 rounded p-2 font-mono text-xs overflow-x-auto">
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
        <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-semibold text-red-900">High Risk Operation</div>
              <div className="text-sm text-red-700 mt-1">
                This plan includes operations that may:
                <ul className="list-disc ml-5 mt-1">
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
      <div className="px-6 py-4 bg-gray-50 rounded-b-lg border-t flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Plan ID: <code className="font-mono text-xs bg-gray-200 px-2 py-1 rounded">{plan.planId}</code>
        </div>
        
        <div className="flex gap-3">
          {!isRejecting ? (
            <>
              <button
                onClick={() => setIsRejecting(true)}
                className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
              >
                ❌ Reject
              </button>
              <button
                onClick={handleApprove}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold transition-colors shadow-md"
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
                onChange={(e) => setRejectReason(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={() => setIsRejecting(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
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
