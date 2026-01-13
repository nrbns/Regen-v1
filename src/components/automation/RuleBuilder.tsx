/**
 * Rule Builder Component - BATTLE 5
 * 
 * Simple UI for creating automation rules.
 * Event → Action → Report → Silence.
 * 
 * Example: "When I open research papers, summarize and save them."
 */

import React, { useState } from 'react';
import { Plus, X, Eye, CheckCircle2 } from 'lucide-react';
import { ruleEngine, type AutomationRule, type AutomationEvent, type AutomationAction } from '../../core/automation/RuleEngine';
import { SystemBehaviorIndicator } from '../system/SystemBehaviorIndicator';

/**
 * Rule Builder Component
 * BATTLE 5: Simple rule creation, no complex UI
 */
export function RuleBuilder() {
  const [rules, setRules] = useState<AutomationRule[]>(ruleEngine.getRules());
  const [showCreate, setShowCreate] = useState(false);
  const [newRule, setNewRule] = useState<Partial<AutomationRule>>({
    name: '',
    event: 'pattern:detected',
    action: 'summarize',
    enabled: true,
    confirmBeforeAction: true,
    temporary: false,
  });

  React.useEffect(() => {
    const unsubscribe = ruleEngine.onRuleChange(() => {
      setRules(ruleEngine.getRules());
    });

    return unsubscribe;
  }, []);

  const handleCreateRule = () => {
    if (!newRule.name || !newRule.event || !newRule.action) {
      return;
    }

    ruleEngine.createRule({
      name: newRule.name,
      description: newRule.description,
      enabled: newRule.enabled ?? true,
      event: newRule.event as AutomationEvent,
      eventFilter: newRule.eventFilter,
      action: newRule.action as AutomationAction,
      actionParams: newRule.actionParams,
      confirmBeforeAction: newRule.confirmBeforeAction ?? true,
      temporary: newRule.temporary ?? false,
    });

    // Reset form
    setNewRule({
      name: '',
      event: 'pattern:detected',
      action: 'summarize',
      enabled: true,
      confirmBeforeAction: true,
      temporary: false,
    });
    setShowCreate(false);
  };

  const handleDeleteRule = (id: string) => {
    ruleEngine.deleteRule(id);
  };

  const handleToggleRule = (id: string, enabled: boolean) => {
    ruleEngine.toggleRule(id, enabled);
  };

  return (
    <div className="space-y-4">
      {/* Rules List */}
      <div className="space-y-2">
        {rules.length === 0 ? (
          <div className="text-sm text-[var(--text-muted)] text-center py-8">
            No automation rules yet
          </div>
        ) : (
          rules.map(rule => (
            <div
              key={rule.id}
              className="flex items-center justify-between rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {rule.name}
                  </span>
                  {rule.enabled ? (
                    <SystemBehaviorIndicator state="ready" message="Active" size="sm" />
                  ) : (
                    <SystemBehaviorIndicator state="idle" message="Disabled" size="sm" />
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  When {rule.event.replace(':', ' ')} → {rule.action}
                </p>
                {rule.triggerCount > 0 && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Triggered {rule.triggerCount} time{rule.triggerCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleRule(rule.id, !rule.enabled)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {rule.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => handleDeleteRule(rule.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Rule Button */}
      {!showCreate && (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Rule
        </button>
      )}

      {/* Create Rule Form */}
      {showCreate && (
        <div className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-panel)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              New Automation Rule
            </h3>
            <button
              onClick={() => setShowCreate(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Name
            </label>
            <input
              type="text"
              value={newRule.name || ''}
              onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              placeholder="e.g., Summarize research papers"
              className="w-full rounded-md border border-[var(--surface-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              When
            </label>
            <select
              value={newRule.event || 'pattern:detected'}
              onChange={(e) => setNewRule({ ...newRule, event: e.target.value as AutomationEvent })}
              className="w-full rounded-md border border-[var(--surface-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
            >
              <option value="pattern:detected">Pattern detected</option>
              <option value="tab:opened">Tab opened</option>
              <option value="tab:navigated">Tab navigated</option>
              <option value="page:loaded">Page loaded</option>
            </select>
          </div>

          {newRule.event === 'pattern:detected' && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Pattern Type
              </label>
              <select
                value={(newRule.eventFilter?.patternType as string) || ''}
                onChange={(e) => setNewRule({
                  ...newRule,
                  eventFilter: {
                    ...newRule.eventFilter,
                    patternType: e.target.value as any,
                  },
                })}
                className="w-full rounded-md border border-[var(--surface-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
              >
                <option value="">Any pattern</option>
                <option value="research_paper">Research paper</option>
                <option value="code_repository">Code repository</option>
                <option value="video_content">Video content</option>
                <option value="long_article">Long article</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Then
            </label>
            <select
              value={newRule.action || 'summarize'}
              onChange={(e) => setNewRule({ ...newRule, action: e.target.value as AutomationAction })}
              className="w-full rounded-md border border-[var(--surface-border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
            >
              <option value="summarize">Summarize</option>
              <option value="save">Save to workspace</option>
              <option value="extract">Extract key points</option>
              <option value="analyze">Analyze</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={newRule.confirmBeforeAction ?? true}
                onChange={(e) => setNewRule({ ...newRule, confirmBeforeAction: e.target.checked })}
                className="rounded border-[var(--surface-border)]"
              />
              Confirm before action
            </label>
            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={newRule.temporary ?? false}
                onChange={(e) => setNewRule({ ...newRule, temporary: e.target.checked })}
                className="rounded border-[var(--surface-border)]"
              />
              Temporary (expires after use)
            </label>
          </div>

          <button
            onClick={handleCreateRule}
            disabled={!newRule.name}
            className="w-full rounded-md bg-[var(--color-primary-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-600)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create Rule
          </button>
        </div>
      )}
    </div>
  );
}
