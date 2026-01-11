/**
 * Automation Panel - UI for creating and managing automation rules
 * Location: Settings → System → Automation
 * 
 * Users can create "When X, do Y" rules with visual editor
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Plus, Trash2, Edit2, Power, PowerOff, CheckCircle, XCircle } from 'lucide-react';
import { automationEngine, AutomationRule } from '../../core/automation/automationEngine';

export function AutomationPanel() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load rules
  useEffect(() => {
    setRules(automationEngine.getRules());

    // Listen for automation events
    const handleAutomationExecuted = (event: CustomEvent) => {
      // Refresh rules to show updated trigger counts
      setRules([...automationEngine.getRules()]);
    };

    window.addEventListener('AUTOMATION_EXECUTED' as any, handleAutomationExecuted);
    return () => window.removeEventListener('AUTOMATION_EXECUTED' as any, handleAutomationExecuted);
  }, []);

  const toggleRule = (ruleId: string) => {
    const rule = automationEngine.getRule(ruleId);
    if (rule?.enabled) {
      automationEngine.disableRule(ruleId);
    } else {
      automationEngine.enableRule(ruleId);
    }
    setRules([...automationEngine.getRules()]);
  };

  const deleteRule = (ruleId: string) => {
    if (confirm('Delete this automation rule?')) {
      automationEngine.deleteRule(ruleId);
      setRules([...automationEngine.getRules()]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Automation Rules
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Create "When X, do Y" rules. All automations are explicit, visible, and cancelable.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Rule
        </button>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-700 rounded-lg">
          <Zap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No automation rules yet</p>
          <p className="text-slate-500 text-xs mt-1">Create your first rule to automate browser actions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <motion.div
              key={rule.id}
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-medium">{rule.name}</h4>
                    {rule.enabled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded-full">
                        <XCircle className="w-3 h-3" />
                        Disabled
                      </span>
                    )}
                  </div>

                  {/* Rule details */}
                  <div className="text-sm text-slate-400 space-y-1">
                    <p>
                      <span className="text-slate-500">Trigger:</span>{' '}
                      {rule.trigger.event}
                      {rule.trigger.condition && ' (with condition)'}
                    </p>
                    <p>
                      <span className="text-slate-500">Action:</span>{' '}
                      {rule.action.type === 'task' && `Run task: ${rule.action.taskId}`}
                      {rule.action.type === 'command' && `Execute: ${rule.action.commandText}`}
                      {rule.action.type === 'custom' && 'Custom function'}
                    </p>
                    {rule.metadata.triggerCount > 0 && (
                      <p className="text-xs text-slate-500">
                        Triggered {rule.metadata.triggerCount} time(s)
                        {rule.metadata.lastTriggered && (
                          <> · Last: {new Date(rule.metadata.lastTriggered).toLocaleString()}</>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      rule.enabled
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                    title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                  >
                    {rule.enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-2 bg-slate-700 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                    title="Delete rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm">
        <p className="text-blue-300 font-medium mb-1">⚡ Automation Philosophy</p>
        <p className="text-blue-200/80 text-xs leading-relaxed">
          Regen automations are <strong>explicit</strong> (you create them), <strong>visible</strong> (you see when
          they run), and <strong>cancelable</strong> (you can disable anytime). They run locally with zero AI cost
          unless the action itself requires AI.
        </p>
      </div>

      {/* Create Modal - Placeholder for now */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Create Automation Rule</h3>
            <p className="text-sm text-slate-400 mb-6">
              Advanced rule creation UI coming soon. For now, default rules are available above.
            </p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
