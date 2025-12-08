/**
 * Document Editor Component
 * Phase 2, Day 1: Auto-Editing for Word/PDF/Excel
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  Loader2,
  Eye,
  Save,
  Wand2,
} from 'lucide-react';
import {
  generateEditSuggestions,
  applySuggestions,
  generateEditPreview,
  parseDocument,
  type EditSuggestion,
  type DocumentType,
} from '../../core/docs/autoEditor';
import { toast } from '../../utils/toast';

interface DocumentEditorProps {
  file: File;
  onSave?: (editedContent: string) => void;
  onClose?: () => void;
}

export function DocumentEditor({ file, onSave, onClose }: DocumentEditorProps) {
  const [content, setContent] = useState<string>('');
  const [documentType, setDocumentType] = useState<DocumentType>('txt');
  const [suggestions, setSuggestions] = useState<EditSuggestion[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [filter, setFilter] = useState<EditSuggestion['type'] | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<EditSuggestion['severity'] | 'all'>('all');

  // Phase 2, Day 1: Parse document on load
  useEffect(() => {
    const loadDocument = async () => {
      setLoading(true);
      try {
        const parsed = await parseDocument(file);
        setContent(parsed.content);
        setDocumentType(parsed.type);
      } catch (error) {
        console.error('[DocumentEditor] Failed to parse document:', error);
        toast.error('Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [file]);

  // Phase 2, Day 1: Generate suggestions
  const handleGenerateSuggestions = async () => {
    if (!content) return;

    setGenerating(true);
    try {
      const newSuggestions = await generateEditSuggestions(content, documentType, {
        focusAreas: ['grammar', 'style', 'clarity'],
        strictness: 'normal',
      });
      setSuggestions(newSuggestions);
      toast.success(`Generated ${newSuggestions.length} editing suggestions`);
    } catch (error) {
      console.error('[DocumentEditor] Failed to generate suggestions:', error);
      toast.error('Failed to generate suggestions');
    } finally {
      setGenerating(false);
    }
  };

  // Phase 2, Day 1: Toggle suggestion application
  const toggleSuggestion = (id: string) => {
    setAppliedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Phase 2, Day 1: Apply all suggestions
  const applyAll = () => {
    setAppliedIds(new Set(suggestions.map(s => s.id)));
  };

  // Phase 2, Day 1: Clear all applications
  const clearAll = () => {
    setAppliedIds(new Set());
  };

  // Phase 2, Day 1: Generate edited content
  const editedContent = useMemo(() => {
    if (appliedIds.size === 0) return content;
    return applySuggestions(content, suggestions, Array.from(appliedIds));
  }, [content, suggestions, appliedIds]);

  // Phase 2, Day 1: Generate preview
  const preview = useMemo(() => {
    if (appliedIds.size === 0) return null;
    return generateEditPreview(content, editedContent, suggestions, Array.from(appliedIds));
  }, [content, editedContent, suggestions, appliedIds]);

  // Phase 2, Day 1: Filter suggestions
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(s => {
      if (filter !== 'all' && s.type !== filter) return false;
      if (severityFilter !== 'all' && s.severity !== severityFilter) return false;
      return true;
    });
  }, [suggestions, filter, severityFilter]);

  // Phase 2, Day 1: Save edited content
  const handleSave = () => {
    if (onSave) {
      onSave(editedContent);
      toast.success('Document saved');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        <span className="ml-3 text-gray-400">Loading document...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-purple-400" />
          <div>
            <h1 className="text-lg font-semibold">{file.name}</h1>
            <p className="text-xs text-gray-400">
              {documentType.toUpperCase()} • {content.length.toLocaleString()} characters
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateSuggestions}
            disabled={generating || !content}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Generate Suggestions
              </>
            )}
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-gray-300 hover:border-slate-600"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          {onSave && (
            <button
              onClick={handleSave}
              disabled={appliedIds.size === 0}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-gray-300 hover:border-slate-600"
            >
              Close
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Suggestions Panel */}
        <aside className="w-96 border-r border-slate-800 bg-slate-900/50 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Filters */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase">Filter by Type</label>
              <select
                value={filter}
                onChange={e => setFilter(e.target.value as any)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
              >
                <option value="all">All Types</option>
                <option value="grammar">Grammar</option>
                <option value="style">Style</option>
                <option value="clarity">Clarity</option>
                <option value="fact-check">Fact Check</option>
                <option value="formatting">Formatting</option>
                <option value="structure">Structure</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase">Filter by Severity</label>
              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value as any)}
                className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
              >
                <option value="all">All Severities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={applyAll}
                disabled={suggestions.length === 0}
                className="flex-1 rounded border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
              >
                Apply All
              </button>
              <button
                onClick={clearAll}
                disabled={appliedIds.size === 0}
                className="flex-1 rounded border border-slate-700 px-3 py-2 text-xs text-gray-300 hover:border-slate-600 disabled:opacity-50"
              >
                Clear All
              </button>
            </div>

            {/* Stats */}
            <div className="rounded border border-slate-700 bg-slate-800/50 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total Suggestions</span>
                <span className="font-semibold text-white">{suggestions.length}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-gray-400">Applied</span>
                <span className="font-semibold text-emerald-400">{appliedIds.size}</span>
              </div>
            </div>
          </div>

          {/* Suggestions List */}
          <div className="border-t border-slate-800">
            {filteredSuggestions.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                {suggestions.length === 0 ? (
                  <>
                    <Sparkles className="mx-auto h-8 w-8 text-gray-600 mb-2" />
                    <p>No suggestions yet</p>
                    <p className="text-xs mt-1">Click "Generate Suggestions" to start</p>
                  </>
                ) : (
                  <p>No suggestions match the current filters</p>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {filteredSuggestions.map(suggestion => {
                  const isApplied = appliedIds.has(suggestion.id);
                  return (
                    <SuggestionItem
                      key={suggestion.id}
                      suggestion={suggestion}
                      isApplied={isApplied}
                      onToggle={() => toggleSuggestion(suggestion.id)}
                    />
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Editor/Preview */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {showPreview && preview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full p-6"
              >
                <PreviewView preview={preview} />
              </motion.div>
            ) : (
              <motion.div
                key="editor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full p-6"
              >
                <EditorView content={editedContent} onChange={setContent} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function SuggestionItem({
  suggestion,
  isApplied,
  onToggle,
}: {
  suggestion: EditSuggestion;
  isApplied: boolean;
  onToggle: () => void;
}) {
  const severityColors = {
    high: 'border-red-500/50 bg-red-500/10 text-red-200',
    medium: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-200',
    low: 'border-blue-500/50 bg-blue-500/10 text-blue-200',
  };

  const typeIcons = {
    grammar: '📝',
    style: '✨',
    clarity: '💡',
    'fact-check': '🔍',
    formatting: '🎨',
    structure: '📐',
  };

  return (
    <li className="p-4 hover:bg-slate-800/30 transition-colors">
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={`mt-1 flex-shrink-0 rounded border-2 p-1 transition-colors ${
            isApplied
              ? 'border-emerald-500 bg-emerald-500/20'
              : 'border-slate-600 bg-slate-800'
          }`}
        >
          {isApplied ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <div className="h-4 w-4" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{typeIcons[suggestion.type] || '📄'}</span>
            <span className="text-xs font-semibold uppercase text-gray-400">{suggestion.type}</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] ${severityColors[suggestion.severity]}`}
            >
              {suggestion.severity}
            </span>
            <span className="text-xs text-gray-500">
              {(suggestion.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-gray-400 line-through">{suggestion.originalText}</p>
              <p className="text-emerald-300">{suggestion.suggestedText}</p>
            </div>
            <p className="text-xs text-gray-500">{suggestion.reason}</p>
          </div>
        </div>
      </div>
    </li>
  );
}

function EditorView({
  content,
  onChange,
}: {
  content: string;
  onChange: (content: string) => void;
}) {
  return (
    <div className="h-full">
      <textarea
        value={content}
        onChange={e => onChange(e.target.value)}
        className="h-full w-full resize-none rounded border border-slate-700 bg-slate-900 p-4 font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        placeholder="Document content will appear here..."
      />
    </div>
  );
}

function PreviewView({ preview }: { preview: NonNullable<ReturnType<typeof generateEditPreview>> }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-lg font-semibold">Preview Changes</h2>
        <div className="rounded border border-slate-700 bg-slate-900 p-6">
          <div className="space-y-4">
            {preview.changes.map((change, idx) => (
              <div key={idx} className="rounded border border-slate-700 bg-slate-800/50 p-4">
                <div className="mb-2 text-xs text-gray-400">Change {idx + 1}</div>
                {change.type === 'replace' && (
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-gray-500">Original:</span>
                      <p className="text-red-300 line-through">{change.original}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Edited:</span>
                      <p className="text-emerald-300">{change.edited}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

