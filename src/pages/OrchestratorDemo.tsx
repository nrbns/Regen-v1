/**
 * Orchestrator Demo Page
 * Interactive UI for testing the orchestrator system
 */

import React, { useState } from 'react';
import { useOrchestrator } from '../hooks/useOrchestrator';
import { ApprovalPanel } from '../components/ApprovalPanel';

export const OrchestratorDemo: React.FC = () => {
  const [userInput, setUserInput] = useState('');
  const [userId] = useState('demo_user_123');
  const [showApproval, setShowApproval] = useState(false);

  const {
    loading,
    error,
    classification,
    plan,
    result,
    classify,
    createPlan,
    approvePlan,
    rejectPlan,
    executeDirect,
    reset,
  } = useOrchestrator();

  const handleClassify = async () => {
    if (!userInput.trim()) return;
    try {
      await classify(userInput);
    } catch (err) {
      console.error('Classification error:', err);
    }
  };

  const handleCreatePlan = async () => {
    if (!userInput.trim()) return;
    try {
      const newPlan = await createPlan(userInput, userId);
      if (newPlan.requiresApproval) {
        setShowApproval(true);
      }
    } catch (err) {
      console.error('Plan creation error:', err);
    }
  };

  const handleExecuteDirect = async () => {
    if (!userInput.trim()) return;
    try {
      await executeDirect(userInput, userId);
    } catch (err: any) {
      if (err.message === 'REQUIRES_APPROVAL') {
        // Create plan and show approval panel
        await handleCreatePlan();
      } else {
        console.error('Execution error:', err);
      }
    }
  };

  const handleApprove = async (planId: string) => {
    try {
      await approvePlan(planId, userId);
      setShowApproval(false);
      alert('Plan approved and executing...');
    } catch (err) {
      console.error('Approval error:', err);
    }
  };

  const handleReject = async (planId: string, reason: string) => {
    try {
      await rejectPlan(planId, userId, reason);
      setShowApproval(false);
      alert('Plan rejected');
    } catch (err) {
      console.error('Rejection error:', err);
    }
  };

  const exampleInputs = [
    'Send an email to john@example.com about the quarterly results',
    'Create a presentation about AI innovations',
    'Book a flight to San Francisco next Tuesday',
    'Research quantum computing applications',
    'Summarize my unread emails from today',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-4xl font-bold text-transparent">
            🚀 Agent Orchestrator Demo
          </h1>
          <p className="text-gray-600">Week 1 Implementation - Intelligent Multi-Agent Execution</p>
        </div>

        {/* Input Section */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-lg">
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            What would you like to do?
          </label>
          <textarea
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            placeholder="e.g., Send an email to john@example.com about Q4 results"
            className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />

          {/* Example Inputs */}
          <div className="mb-4">
            <p className="mb-2 text-sm text-gray-600">Try these examples:</p>
            <div className="flex flex-wrap gap-2">
              {exampleInputs.map((example, i) => (
                <button
                  key={i}
                  onClick={() => setUserInput(example)}
                  className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-200"
                >
                  {example.substring(0, 40)}...
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleClassify}
              disabled={loading || !userInput.trim()}
              className="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              🎯 Classify Intent
            </button>
            <button
              onClick={handleCreatePlan}
              disabled={loading || !userInput.trim()}
              className="flex-1 rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              📋 Create Plan
            </button>
            <button
              onClick={handleExecuteDirect}
              disabled={loading || !userInput.trim()}
              className="flex-1 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ⚡ Execute
            </button>
            <button
              onClick={reset}
              className="rounded-lg bg-gray-200 px-6 py-3 font-semibold text-gray-800 transition-colors hover:bg-gray-300"
            >
              🔄 Reset
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="mt-4 text-center text-blue-600">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <span className="ml-2">Processing...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Classification Result */}
          {classification && (
            <div className="rounded-lg bg-white p-6 shadow-lg">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                🎯 Intent Classification
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Agents:</span>
                  <span className="ml-2 font-semibold text-blue-600">
                    {classification.suggestedAgents?.join(', ') || 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Intent:</span>
                  <span className="ml-2 font-semibold">{classification.intent}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Confidence:</span>
                  <span className="ml-2 font-semibold">
                    {(classification.confidence * 100).toFixed(1)}%
                  </span>
                  <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-green-500"
                      style={{ width: `${classification.confidence * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Risk Level:</span>
                  <span
                    className={`ml-2 rounded-full px-3 py-1 text-sm font-semibold ${
                      classification.riskLevel === 'low'
                        ? 'bg-green-100 text-green-700'
                        : classification.riskLevel === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {classification.riskLevel?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Execution Result */}
          {result && (
            <div className="rounded-lg bg-white p-6 shadow-lg">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                ⚡ Execution Result
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Status:</span>
                  <span
                    className={`ml-2 rounded-full px-3 py-1 text-sm font-semibold ${
                      result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {result.success ? 'SUCCESS' : 'FAILED'}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Plan ID:</span>
                  <code className="ml-2 rounded bg-gray-100 px-2 py-1 font-mono text-xs">
                    {result.planId}
                  </code>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Duration:</span>
                  <span className="ml-2 font-semibold">{result.duration}ms</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Tasks:</span>
                  <span className="ml-2 font-semibold">
                    {result.completedTasks} completed, {result.failedTasks} failed
                  </span>
                </div>
                {result.results && result.results.length > 0 && (
                  <div className="mt-3">
                    <span className="text-sm text-gray-600">Task Results:</span>
                    <div className="mt-2 space-y-2">
                      {result.results.map((taskResult, idx) => (
                        <div key={idx} className="rounded bg-gray-50 p-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-2 py-0.5 ${
                                taskResult.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : taskResult.status === 'failed'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {taskResult.status}
                            </span>
                            <span className="font-mono">{taskResult.taskId}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Approval Panel */}
        {showApproval && plan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="w-full max-w-4xl">
              <ApprovalPanel plan={plan} onApprove={handleApprove} onReject={handleReject} />
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 rounded-lg bg-white p-6 shadow-lg">
          <h3 className="mb-4 text-lg font-semibold">ℹ️ How It Works</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <div className="mb-2 text-3xl">🎯</div>
              <h4 className="mb-1 font-semibold">1. Classify</h4>
              <p className="text-sm text-gray-600">
                Intent Router analyzes your request and identifies the appropriate agent (mail, ppt,
                booking, research, etc.)
              </p>
            </div>
            <div>
              <div className="mb-2 text-3xl">📋</div>
              <h4 className="mb-1 font-semibold">2. Plan</h4>
              <p className="text-sm text-gray-600">
                Task Planner breaks down your request into executable steps with dependencies and
                estimates duration
              </p>
            </div>
            <div>
              <div className="mb-2 text-3xl">⚡</div>
              <h4 className="mb-1 font-semibold">3. Execute</h4>
              <p className="text-sm text-gray-600">
                Task Executor runs each step with retry logic, timeout protection, and automatic
                error handling
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrchestratorDemo;
