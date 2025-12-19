/**
 * Mail Agent Dashboard
 * Main UI for email automation agent
 * Combines intent input, action cards, and execution status
 */

import React, { useState } from 'react';
import { ActionCardList } from './ActionCard';
import { AgentPlanner } from '../../../services/mailAgent/agentPlanner';
import { AgentExecutor } from '../../../services/mailAgent/executor';
import type { AgentPlan } from '../../../services/mailAgent/types';

const planner = new AgentPlanner();
const executor = new AgentExecutor();

export const MailAgentDashboard: React.FC = () => {
  const [intent, setIntent] = useState('');
  const [plans, setPlans] = useState<AgentPlan[]>([]);
  const [executingPlanId, setExecutingPlanId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const userId = 'user'; // Get from auth context

  // Quick actions
  const quickActions = [
    'Summarize my unread emails',
    'Draft reply to the latest email',
    'Archive all promotional emails',
    'Flag emails from my boss as important',
  ];

  const handleCreatePlan = () => {
    if (!intent.trim()) return;

    const plan = planner.createPlan(userId, intent);
    setPlans(prev => [...prev, plan]);
    setHistory(prev => [intent, ...prev.slice(0, 9)]); // Keep last 10
    setIntent('');
  };

  const handleApprove = async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    setExecutingPlanId(planId);

    try {
      // Execute with auto-approval (for demo)
      await executor.execute(userId, plan, async () => true);

      // Remove from pending
      setPlans(prev => prev.filter(p => p.id !== planId));
    } catch (error) {
      console.error('Execution failed:', error);
    } finally {
      setExecutingPlanId(null);
    }
  };

  const handleReject = (planId: string) => {
    setPlans(prev => prev.filter(p => p.id !== planId));
  };

  const handleQuickAction = (action: string) => {
    setIntent(action);
    setTimeout(() => handleCreatePlan(), 100);
  };

  return (
    <div className="mail-agent-dashboard mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Mail Agent</h1>
        <p className="text-gray-600">
          Tell me what you'd like to do with your emails, and I'll create a plan for you.
        </p>
      </div>

      {/* Intent Input */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={intent}
            onChange={e => setIntent(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleCreatePlan()}
            placeholder="e.g., Summarize my unread emails and draft replies"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCreatePlan}
            disabled={!intent.trim()}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Create Plan
          </button>
        </div>

        {/* Quick Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickAction(action)}
              className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-200"
            >
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Pending Plans */}
      {plans.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Pending Actions</h2>
          <ActionCardList
            plans={plans}
            onApprove={handleApprove}
            onReject={handleReject}
            executingPlanId={executingPlanId || undefined}
          />
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Recent Intents</h2>
          <div className="rounded-lg bg-gray-50 p-4">
            <ul className="space-y-2">
              {history.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="text-gray-400">•</span>
                  <span>{item}</span>
                  <button
                    onClick={() => setIntent(item)}
                    className="ml-auto text-xs text-blue-600 hover:text-blue-800"
                  >
                    Use again
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg bg-blue-50 p-4">
          <div className="text-2xl font-bold text-blue-900">{history.length}</div>
          <div className="text-sm text-blue-600">Total Intents</div>
        </div>
        <div className="rounded-lg bg-green-50 p-4">
          <div className="text-2xl font-bold text-green-900">{plans.length}</div>
          <div className="text-sm text-green-600">Pending Plans</div>
        </div>
        <div className="rounded-lg bg-purple-50 p-4">
          <div className="text-2xl font-bold text-purple-900">{executingPlanId ? '1' : '0'}</div>
          <div className="text-sm text-purple-600">Executing</div>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-8 text-sm text-gray-500">
        <p className="mb-2">
          <strong>Examples:</strong>
        </p>
        <ul className="ml-2 list-inside list-disc space-y-1">
          <li>Read my unread emails</li>
          <li>Summarize emails from this week</li>
          <li>Draft reply to the latest email with a professional tone</li>
          <li>Archive all promotional emails from the last month</li>
        </ul>
      </div>
    </div>
  );
};

export default MailAgentDashboard;
