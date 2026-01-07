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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            🚀 Agent Orchestrator Demo
          </h1>
          <p className="text-gray-600">
            Week 1 Implementation - Intelligent Multi-Agent Execution
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            What would you like to do?
          </label>
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="e.g., Send an email to john@example.com about Q4 results"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            rows={3}
          />

          {/* Example Inputs */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Try these examples:</p>
            <div className="flex flex-wrap gap-2">
              {exampleInputs.map((example, i) => (
                <button
                  key={i}
                  onClick={() => setUserInput(example)}
                  className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
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
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🎯 Classify Intent
            </button>
            <button
              onClick={handleCreatePlan}
              disabled={loading || !userInput.trim()}
              className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📋 Create Plan
            </button>
            <button
              onClick={handleExecuteDirect}
              disabled={loading || !userInput.trim()}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⚡ Execute
            </button>
            <button
              onClick={reset}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
            >
              🔄 Reset
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="mt-4 text-center text-blue-600">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2">Processing...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Classification Result */}
          {classification && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
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
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${classification.confidence * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Risk Level:</span>
                  <span className={`ml-2 px-3 py-1 rounded-full text-sm font-semibold ${
                    classification.riskLevel === 'low' ? 'bg-green-100 text-green-700' :
                    classification.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {classification.riskLevel?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Execution Result */}
          {result && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                ⚡ Execution Result
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Status:</span>
                  <span
                    className={`ml-2 px-3 py-1 rounded-full text-sm font-semibold ${
                      result.success
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {result.success ? 'SUCCESS' : 'FAILED'}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Plan ID:</span>
                  <code className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
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
                        <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded ${
                              taskResult.status === 'completed' ? 'bg-green-100 text-green-700' :
                              taskResult.status === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="max-w-4xl w-full">
              <ApprovalPanel
                plan={plan}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">ℹ️ How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl mb-2">🎯</div>
              <h4 className="font-semibold mb-1">1. Classify</h4>
              <p className="text-sm text-gray-600">
                Intent Router analyzes your request and identifies the appropriate agent
                (mail, ppt, booking, research, etc.)
              </p>
            </div>
            <div>
              <div className="text-3xl mb-2">📋</div>
              <h4 className="font-semibold mb-1">2. Plan</h4>
              <p className="text-sm text-gray-600">
                Task Planner breaks down your request into executable steps with dependencies
                and estimates duration
              </p>
            </div>
            <div>
              <div className="text-3xl mb-2">⚡</div>
              <h4 className="font-semibold mb-1">3. Execute</h4>
              <p className="text-sm text-gray-600">
                Task Executor runs each step with retry logic, timeout protection, and
                automatic error handling
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrchestratorDemo;
