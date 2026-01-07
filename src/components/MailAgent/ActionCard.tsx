/**
 * Action Card Component
 * User approval interface for agent actions
 * Shows preview, estimated time, risk level, and approve/reject buttons
 */

import React, { useState } from 'react';
import type { AgentPlan } from '../../../services/mailAgent/types';

export interface ActionCardProps {
  plan: AgentPlan;
  onApprove: (planId: string) => void;
  onReject: (planId: string) => void;
  onEdit?: (planId: string) => void;
  isExecuting?: boolean;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  plan,
  onApprove,
  onReject,
  onEdit,
  isExecuting = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getRiskColor = (level: 'low' | 'medium' | 'high'): string => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'failed':
        return '✗';
      case 'rejected':
        return '⊘';
      case 'in_progress':
        return '⟳';
      default:
        return '○';
    }
  };

  const estimatedTime = Math.ceil(plan.tasks.length * 2); // ~2s per task

  return (
    <div className="action-card mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-md">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{plan.intent}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {plan.tasks.length} tasks · ~{estimatedTime}s
          </p>
        </div>

        {/* Risk Badge */}
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${getRiskColor(
            plan.estimatedRiskLevel
          )}`}
        >
          {plan.estimatedRiskLevel.toUpperCase()} RISK
        </span>
      </div>

      {/* Task Summary */}
      <div className="mb-4">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          {showDetails ? '▼' : '▶'} {showDetails ? 'Hide' : 'Show'} task details
        </button>

        {showDetails && (
          <div className="mt-2 space-y-2">
            {plan.tasks.map((task, idx) => (
              <div key={task.id} className="flex items-center gap-2 rounded bg-gray-50 p-2 text-sm">
                <span className="text-gray-400">{getStatusIcon(task.status)}</span>
                <span className="font-mono text-xs text-gray-600">
                  {idx + 1}. {task.type.replace(/_/g, ' ')}
                </span>
                {task.error && <span className="ml-auto text-xs text-red-600">{task.error}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {plan.requiresApproval && !isExecuting && (
        <div className="flex gap-2">
          <button
            onClick={() => onApprove(plan.id)}
            className="flex-1 rounded bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
            disabled={isExecuting}
          >
            ✓ Approve & Execute
          </button>

          {onEdit && (
            <button
              onClick={() => onEdit(plan.id)}
              className="rounded bg-gray-200 px-4 py-2 font-medium text-gray-800 transition-colors hover:bg-gray-300"
              disabled={isExecuting}
            >
              Edit
            </button>
          )}

          <button
            onClick={() => onReject(plan.id)}
            className="rounded bg-red-100 px-4 py-2 font-medium text-red-700 transition-colors hover:bg-red-200"
            disabled={isExecuting}
          >
            ✗ Reject
          </button>
        </div>
      )}

      {/* Executing State */}
      {isExecuting && (
        <div className="flex items-center gap-2 text-blue-600">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
          <span className="text-sm font-medium">Executing...</span>
        </div>
      )}

      {/* Auto-Execute for Low Risk */}
      {!plan.requiresApproval && (
        <div className="text-sm italic text-gray-500">
          ✓ Auto-executing (low risk, no approval needed)
        </div>
      )}
    </div>
  );
};

/**
 * Action Card List Component
 * Displays multiple action cards
 */
export interface ActionCardListProps {
  plans: AgentPlan[];
  onApprove: (planId: string) => void;
  onReject: (planId: string) => void;
  onEdit?: (planId: string) => void;
  executingPlanId?: string;
}

export const ActionCardList: React.FC<ActionCardListProps> = ({
  plans,
  onApprove,
  onReject,
  onEdit,
  executingPlanId,
}) => {
  if (plans.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        <p>No pending actions</p>
      </div>
    );
  }

  return (
    <div className="action-card-list space-y-4">
      {plans.map(plan => (
        <ActionCard
          key={plan.id}
          plan={plan}
          onApprove={onApprove}
          onReject={onReject}
          onEdit={onEdit}
          isExecuting={executingPlanId === plan.id}
        />
      ))}
    </div>
  );
};

export default ActionCard;
