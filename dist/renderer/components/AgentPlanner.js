import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Agent Planner UI Component
 * Generate and execute multi-step plans
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Sparkles, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { ipc } from '../lib/ipc-typed';
export function AgentPlanner() {
    const [goal, setGoal] = useState('');
    const [plan, setPlan] = useState(null);
    const [executing, setExecuting] = useState(false);
    const [results, setResults] = useState([]);
    const [mode, setMode] = useState('');
    const generatePlan = async () => {
        if (!goal.trim())
            return;
        try {
            const generatedPlan = await ipc.agent.generatePlanFromGoal({
                goal,
                mode: mode || undefined,
            });
            setPlan(generatedPlan);
            setResults([]);
        }
        catch (error) {
            console.error('Failed to generate plan:', error);
            alert(`Failed to generate plan: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    const executePlan = async () => {
        if (!plan)
            return;
        setExecuting(true);
        setResults([]);
        try {
            const result = await ipc.agent.executePlan({
                planId: plan.id,
                plan,
            });
            setResults(result.results || []);
        }
        catch (error) {
            console.error('Failed to execute plan:', error);
            alert(`Failed to execute plan: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            setExecuting(false);
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-4 p-6 bg-gray-900/50 rounded-lg border border-gray-800", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Sparkles, { className: "w-5 h-5 text-purple-400" }), _jsx("h2", { className: "text-lg font-semibold text-gray-100", children: "Agent Planner" })] }), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("label", { className: "text-sm text-gray-400", children: "Goal" }), _jsx("textarea", { value: goal, onChange: (e) => setGoal(e.target.value), placeholder: "What do you want the agent to accomplish? (e.g., 'Research quantum computing breakthroughs')", className: "px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500", rows: 3 }), _jsx("input", { type: "text", value: mode, onChange: (e) => setMode(e.target.value), placeholder: "Mode (optional): research, trade, game, etc.", className: "px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500" }), _jsxs("button", { onClick: generatePlan, disabled: !goal.trim(), className: "px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2", children: [_jsx(Sparkles, { size: 16 }), "Generate Plan"] })] }), plan && (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-sm font-semibold text-gray-300", children: "Generated Plan" }), _jsxs("div", { className: "text-xs text-gray-500", children: [plan.steps.length, " steps \u2022 ~", plan.estimatedDuration || 0, "s"] })] }), _jsx("div", { className: "flex flex-col gap-2", children: plan.steps.map((step, index) => (_jsx(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, className: "px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg", children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "flex-shrink-0 w-6 h-6 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-400 text-xs font-semibold", children: index + 1 }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: "text-sm font-medium text-gray-200", children: step.action }), results.find(r => r.stepId === step.id) && (results.find(r => r.stepId === step.id)?.success ? (_jsx(CheckCircle2, { size: 14, className: "text-green-400" })) : (_jsx(XCircle, { size: 14, className: "text-red-400" })))] }), _jsx("div", { className: "text-xs text-gray-400 mb-1", children: Object.entries(step.args).map(([key, value]) => (_jsxs("span", { className: "mr-2", children: [_jsxs("span", { className: "text-gray-500", children: [key, ":"] }), " ", String(value).substring(0, 50)] }, key))) }), step.expectedOutput && (_jsxs("div", { className: "text-xs text-gray-500 italic", children: ["Expected: ", step.expectedOutput] })), results.find(r => r.stepId === step.id)?.error && (_jsxs("div", { className: "text-xs text-red-400 mt-1", children: ["Error: ", results.find(r => r.stepId === step.id)?.error] }))] })] }) }, step.id))) }), _jsx("button", { onClick: executePlan, disabled: executing, className: "px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2", children: executing ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { size: 16, className: "animate-spin" }), "Executing..."] })) : (_jsxs(_Fragment, { children: [_jsx(Play, { size: 16 }), "Execute Plan"] })) })] }))] }));
}
