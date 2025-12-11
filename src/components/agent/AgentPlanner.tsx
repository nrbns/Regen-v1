/**
 * Agent Planner UI Component
 * Generate and execute multi-step plans
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Sparkles, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { ipc } from '../lib/ipc-typed';

export interface PlanStep {
  id: string;
  action: string;
  args: Record<string, unknown>;
  expectedOutput?: string;
}

export interface Plan {
  id: string;
  goal: string;
  steps: PlanStep[];
  estimatedDuration?: number;
}

export function AgentPlanner() {
  const [goal, setGoal] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState<
    Array<{ stepId: string; success: boolean; result?: unknown; error?: string }>
  >([]);
  const [mode, setMode] = useState<string>('');

  const generatePlan = async () => {
    if (!goal.trim()) return;

    try {
      const generatedPlan = await ipc.agent.generatePlanFromGoal({
        goal,
        mode: mode || undefined,
      });
      setPlan(generatedPlan);
      setResults([]);
    } catch (error) {
      console.error('Failed to generate plan:', error);
      alert(`Failed to generate plan: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const executePlan = async () => {
    if (!plan) return;

    setExecuting(true);
    setResults([]);

    try {
      const result = (await ipc.agent.executePlan({
        planId: plan.id,
        plan,
      })) as {
        results: Array<{ stepId: string; success: boolean; result?: unknown; error?: string }>;
      };
      setResults(result.results || []);
    } catch (error) {
      console.error('Failed to execute plan:', error);
      alert(`Failed to execute plan: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-800 bg-gray-900/50 p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-400" />
        <h2 className="text-lg font-semibold text-gray-100">Agent Planner</h2>
      </div>

      {/* Goal Input */}
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-400">Goal</label>
        <textarea
          value={goal}
          onChange={e => setGoal(e.target.value)}
          placeholder="What do you want the agent to accomplish? (e.g., 'Research quantum computing breakthroughs')"
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          rows={3}
        />
        <input
          type="text"
          value={mode}
          onChange={e => setMode(e.target.value)}
          placeholder="Mode (optional): research, trade, game, etc."
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <button
          onClick={generatePlan}
          disabled={!goal.trim()}
          className="flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-700"
        >
          <Sparkles size={16} />
          Generate Plan
        </button>
      </div>

      {/* Plan Display */}
      {plan && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">Generated Plan</h3>
            <div className="text-xs text-gray-500">
              {plan.steps.length} steps • ~{plan.estimatedDuration || 0}s
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {plan.steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-600/20 text-xs font-semibold text-purple-400">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">{step.action}</span>
                      {results.find(r => r.stepId === step.id) &&
                        (results.find(r => r.stepId === step.id)?.success ? (
                          <CheckCircle2 size={14} className="text-green-400" />
                        ) : (
                          <XCircle size={14} className="text-red-400" />
                        ))}
                    </div>
                    <div className="mb-1 text-xs text-gray-400">
                      {Object.entries(step.args).map(([key, value]) => (
                        <span key={key} className="mr-2">
                          <span className="text-gray-500">{key}:</span>{' '}
                          {String(value).substring(0, 50)}
                        </span>
                      ))}
                    </div>
                    {step.expectedOutput && (
                      <div className="text-xs italic text-gray-500">
                        Expected: {step.expectedOutput}
                      </div>
                    )}
                    {results.find(r => r.stepId === step.id)?.error && (
                      <div className="mt-1 text-xs text-red-400">
                        Error: {results.find(r => r.stepId === step.id)?.error}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <button
            onClick={executePlan}
            disabled={executing}
            className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-700"
          >
            {executing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play size={16} />
                Execute Plan
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
