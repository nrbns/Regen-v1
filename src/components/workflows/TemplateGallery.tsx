/**
 * Template Gallery Component
 * Phase 2, Day 3: Workflow Builder - Enhanced template selection UI
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Sparkles,
  TrendingUp,
  FileText,
  Globe,
  // Camera, // Unused
  Languages,
  X,
  CheckCircle2,
} from 'lucide-react';
import { getAllTemplates, type AutomationPlaybook } from '../../data/automationTemplates';

interface TemplateGalleryProps {
  onSelect: (template: AutomationPlaybook) => void;
  onClose: () => void;
}

type TemplateCategory = 'all' | 'research' | 'automation' | 'data' | 'translation';

const categoryIcons = {
  all: Sparkles,
  research: TrendingUp,
  automation: Globe,
  data: FileText,
  translation: Languages,
};

const categoryColors = {
  all: 'text-purple-400',
  research: 'text-emerald-400',
  automation: 'text-blue-400',
  data: 'text-cyan-400',
  translation: 'text-yellow-400',
};

export function TemplateGallery({ onSelect, onClose }: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const templates = getAllTemplates();

  // Phase 2, Day 3: Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch =
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.goal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.steps.some(step =>
        (step.skill || '').toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'research' &&
        (template.title.toLowerCase().includes('research') ||
          template.goal.toLowerCase().includes('research'))) ||
      (selectedCategory === 'automation' &&
        template.steps.length > 2 &&
        !template.title.toLowerCase().includes('research')) ||
      (selectedCategory === 'data' &&
        (template.title.toLowerCase().includes('extract') ||
          template.title.toLowerCase().includes('screenshot'))) ||
      (selectedCategory === 'translation' && template.title.toLowerCase().includes('translate'));

    return matchesSearch && matchesCategory;
  });

  const handleSelect = (template: AutomationPlaybook) => {
    setSelectedTemplate(template.id);
    setTimeout(() => {
      onSelect(template);
      onClose();
    }, 200);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Workflow Templates</h2>
            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">
              {filteredTemplates.length} templates
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-600 p-2 text-gray-400 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="border-b border-slate-700 bg-slate-800/30 p-4">
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', 'research', 'automation', 'data', 'translation'] as TemplateCategory[]).map(
              category => {
                const Icon = categoryIcons[category];
                const isSelected = selectedCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? 'border-purple-500/50 bg-purple-500/20 text-purple-200'
                        : 'border-slate-600 bg-slate-700/50 text-gray-300 hover:border-slate-500'
                    }`}
                  >
                    <Icon className={`h-3 w-3 ${isSelected ? categoryColors[category] : ''}`} />
                    <span className="capitalize">{category}</span>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Template Grid */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-3 h-12 w-12 text-gray-600" />
              <p className="text-gray-400">No templates found</p>
              <p className="mt-1 text-sm text-gray-500">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredTemplates.map(template => {
                const isSelected = selectedTemplate === template.id;
                return (
                  <motion.button
                    key={template.id}
                    onClick={() => handleSelect(template)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative rounded-lg border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-purple-500/50 bg-purple-500/10 ring-2 ring-purple-500/30'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute right-2 top-2">
                        <CheckCircle2 className="h-5 w-5 text-purple-400" />
                      </div>
                    )}

                    <div className="mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-400" />
                      <h3 className="font-semibold text-white">{template.title}</h3>
                    </div>

                    <p className="mb-3 line-clamp-2 text-xs text-gray-400">{template.goal}</p>

                    <div className="flex flex-wrap gap-1">
                      {template.steps.slice(0, 3).map((step, idx) => (
                        <span
                          key={idx}
                          className="rounded bg-slate-700/50 px-2 py-0.5 text-[10px] text-gray-300"
                        >
                          {step.skill || 'action'}
                        </span>
                      ))}
                      {template.steps.length > 3 && (
                        <span className="rounded bg-slate-700/50 px-2 py-0.5 text-[10px] text-gray-300">
                          +{template.steps.length - 3}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span>{template.steps.length} steps</span>
                      {template.output && (
                        <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-cyan-300">
                          {template.output.type}
                        </span>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
