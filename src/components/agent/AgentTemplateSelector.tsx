/**
 * Agent Template Selector
 * UI for browsing and launching pre-configured research templates
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Target,
  BarChart3,
  Code2,
  Newspaper,
  BookOpen,
  GitCompare,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { getTemplates, getTemplatesByCategory, fillTemplate, type GoalTemplate } from '../../core/agent/templates';

interface TemplateFormProps {
  onSubmit: (goal: string, safety: any) => void;
  onClose: () => void;
}

export function AgentTemplateSelector({ onSubmit, onClose }: TemplateFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const _templates = getTemplates();
  const categories = ['research', 'analysis', 'monitoring', 'extraction'] as const;

  const handleSelectTemplate = (template: GoalTemplate) => {
    setSelectedTemplate(template);
    setInputs({});
  };

  const handleInputChange = (key: string, value: string) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) return;

    try {
      setLoading(true);
      const goal = fillTemplate(selectedTemplate, inputs);
      onSubmit(goal, selectedTemplate.defaultSafetyContext);
      onClose();
    } catch (error) {
      console.error('Template error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1150] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative flex h-[85vh] w-[min(900px,95vw)] flex-col rounded-2xl border border-slate-700/70 bg-slate-950/95 text-gray-100"
      >
        <header className="flex items-center justify-between border-b border-slate-800/60 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-300">
              <Sparkles size={14} />
              <span>Agent Templates</span>
            </div>
            <h2 className="mt-1 font-semibold text-white">
              {selectedTemplate ? selectedTemplate.name : 'Choose a Research Template'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-slate-700/60 bg-slate-900/70 p-2 text-slate-200 hover:bg-slate-900/90"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            {!selectedTemplate ? (
              <motion.div
                key="templates"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {categories.map(category => (
                  <div key={category}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                      {category}
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {getTemplatesByCategory(category).map(template => (
                        <button
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className="group relative flex flex-col gap-2 rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 text-left transition-all hover:border-emerald-500/50 hover:bg-slate-800/50"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <TemplateIcon icon={template.icon} />
                            <ChevronRight
                              size={16}
                              className="text-slate-500 transition-transform group-hover:translate-x-1"
                            />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-emerald-100">{template.name}</h4>
                            <p className="mt-1 text-xs text-slate-400">{template.description}</p>
                          </div>
                          {template.suggestedDomains && template.suggestedDomains.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {template.suggestedDomains.slice(0, 2).map((domain, i) => (
                                <span
                                  key={i}
                                  className="inline-block rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] text-slate-300"
                                >
                                  {domain}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
                  <div className="text-sm text-slate-300">{selectedTemplate.description}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    Expected output: <span className="capitalize">{selectedTemplate.expectedOutputType}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedTemplate.placeholders.map(placeholder => (
                    <div key={placeholder.key}>
                      <label className="block text-xs font-semibold uppercase tracking-widest text-slate-300">
                        {placeholder.label}
                        {placeholder.required && <span className="text-red-400"> *</span>}
                      </label>
                      {placeholder.type === 'text' ? (
                        <input
                          type="text"
                          value={inputs[placeholder.key] || ''}
                          onChange={e => handleInputChange(placeholder.key, e.target.value)}
                          placeholder={`Enter ${placeholder.label.toLowerCase()}`}
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-gray-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      ) : placeholder.type === 'url' ? (
                        <input
                          type="url"
                          value={inputs[placeholder.key] || ''}
                          onChange={e => handleInputChange(placeholder.key, e.target.value)}
                          placeholder="https://example.com"
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-gray-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      ) : (
                        <textarea
                          value={inputs[placeholder.key] || ''}
                          onChange={e => handleInputChange(placeholder.key, e.target.value)}
                          placeholder={`Enter ${placeholder.label.toLowerCase()} (one per line)`}
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-gray-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                          rows={3}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {selectedTemplate.suggestedDomains && selectedTemplate.suggestedDomains.length > 0 && (
                  <div className="rounded-lg border border-slate-700/30 bg-slate-900/30 p-3">
                    <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Suggested Domains
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedTemplate.suggestedDomains.map((domain, i) => (
                        <span
                          key={i}
                          className="inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200"
                        >
                          {domain}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="flex items-center justify-between border-t border-slate-800/60 px-6 py-4">
          <button
            onClick={() => {
              if (selectedTemplate) {
                setSelectedTemplate(null);
                setInputs({});
              } else {
                onClose();
              }
            }}
            className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100"
          >
            {selectedTemplate ? 'Back' : 'Close'}
          </button>
          {selectedTemplate && (
            <button
              onClick={handleSubmit}
              disabled={
                loading ||
                selectedTemplate.placeholders.some(
                  p => p.required && !inputs[p.key]
                )
              }
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={14} />
              <span>{loading ? 'Launching...' : 'Launch Research'}</span>
            </button>
          )}
        </footer>
      </motion.div>
    </div>
  );
}

function TemplateIcon({ icon }: { icon: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    Target: <Target size={18} />,
    BarChart3: <BarChart3 size={18} />,
    Code2: <Code2 size={18} />,
    Newspaper: <Newspaper size={18} />,
    BookOpen: <BookOpen size={18} />,
    GitCompare: <GitCompare size={18} />,
    TrendingUp: <TrendingUp size={18} />,
  };

  return (
    <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-300">
      {iconMap[icon] || <Sparkles size={18} />}
    </div>
  );
}
