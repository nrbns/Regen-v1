/**
 * Export Memories Dialog
 * Modal for exporting memories to JSON or CSV with filtering options
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  FileJson,
  FileSpreadsheet,
  Calendar,
  Filter,
  Tag as TagIcon,
} from 'lucide-react';
import { exportMemories, type ExportOptions } from '../../utils/export';
import { showToast } from '../../state/toastStore';
import { useTokens } from '../../ui/useTokens';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import type { MemoryEvent } from '../../core/supermemory/tracker';
import type { MemoryEventType } from '../../core/supermemory/event-types';

interface ExportMemoriesDialogProps {
  open: boolean;
  onClose: () => void;
  events: MemoryEvent[];
  availableTags: string[];
}

export function ExportMemoriesDialog({
  open,
  onClose,
  events,
  availableTags,
}: ExportMemoriesDialogProps) {
  const tokens = useTokens();
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const allEventTypes: MemoryEventType[] = [
    'search',
    'visit',
    'mode_switch',
    'bookmark',
    'note',
    'task',
    'highlight',
    'screenshot',
    'agent',
  ];

  const handleToggleType = useCallback((type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }, []);

  const handleToggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  }, []);

  const handleExport = useCallback(() => {
    setLoading(true);

    try {
      const options: ExportOptions = {
        format,
        dateRange:
          dateRange.start || dateRange.end
            ? {
                start: dateRange.start ? new Date(dateRange.start).getTime() : undefined,
                end: dateRange.end ? new Date(dateRange.end).getTime() : undefined,
              }
            : undefined,
        filterByType: selectedTypes.length > 0 ? selectedTypes : undefined,
        filterByTags: selectedTags.length > 0 ? selectedTags : undefined,
      };

      exportMemories(events, options);

      const count = events.length;
      showToast(
        'success',
        `Exported ${count} ${count === 1 ? 'memory' : 'memories'} to ${format.toUpperCase()}`
      );
      onClose();
    } catch (error) {
      console.error('[ExportMemoriesDialog] Export failed:', error);
      showToast('error', 'Failed to export memories');
    } finally {
      setLoading(false);
    }
  }, [format, dateRange, selectedTypes, selectedTags, events, onClose]);

  const handleClose = useCallback(() => {
    if (!loading) {
      onClose();
    }
  }, [loading, onClose]);

  if (!open) return null;

  const filteredCount = events.length; // Could calculate actual filtered count

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={e => {
              // Only close if clicking directly on backdrop, not on dialog content
              if (e.target === e.currentTarget) {
                handleClose();
              }
            }}
            onMouseDown={e => {
              // Don't interfere with button clicks
              const target = e.target as HTMLElement;
              if (
                target.closest('button') ||
                target.closest('[role="button"]') ||
                target.closest('[role="dialog"]')
              ) {
                return;
              }
            }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-memories-title"
          >
            <div
              className="w-full max-w-2xl bg-[var(--surface-root)] border border-[var(--surface-border)] rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between border-b border-[var(--surface-border)]"
                style={{ padding: tokens.spacing(4) }}
              >
                <div className="flex items-center gap-3">
                  <Download size={20} className="text-[var(--color-primary-400)]" />
                  <h2
                    id="export-memories-title"
                    className="font-semibold text-[var(--text-primary)]"
                    style={{ fontSize: tokens.fontSize.lg }}
                  >
                    Export Memories
                  </h2>
                </div>
                <button
                  onClick={e => {
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                    handleClose();
                  }}
                  onMouseDown={e => {
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                  }}
                  disabled={loading}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] disabled:opacity-50"
                  style={{ zIndex: 10011, isolation: 'isolate' }}
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto" style={{ padding: tokens.spacing(4) }}>
                <div className="space-y-6">
                  {/* Format Selection */}
                  <div>
                    <label
                      className="block text-sm font-medium text-[var(--text-primary)] mb-3"
                      style={{ fontSize: tokens.fontSize.sm }}
                    >
                      Export Format
                    </label>
                    <div className="flex gap-3">
                      <button
                        onClick={e => {
                          (e as any).stopImmediatePropagation();
                          e.stopPropagation();
                          setFormat('json');
                        }}
                        onMouseDown={e => {
                          (e as any).stopImmediatePropagation();
                          e.stopPropagation();
                        }}
                        className={`
                          flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border transition-all
                          ${
                            format === 'json'
                              ? 'bg-[var(--color-primary-600)] border-[var(--color-primary-500)] text-white'
                              : 'bg-[var(--surface-elevated)] border-[var(--surface-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                          }
                          focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1
                        `}
                        style={{ zIndex: 10011, isolation: 'isolate' }}
                        aria-pressed={format === 'json'}
                      >
                        <FileJson size={20} />
                        <div className="text-left">
                          <div className="font-medium">JSON</div>
                          <div className="text-xs opacity-80">Structured data format</div>
                        </div>
                      </button>
                      <button
                        onClick={e => {
                          (e as any).stopImmediatePropagation();
                          e.stopPropagation();
                          setFormat('csv');
                        }}
                        onMouseDown={e => {
                          (e as any).stopImmediatePropagation();
                          e.stopPropagation();
                        }}
                        className={`
                          flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border transition-all
                          ${
                            format === 'csv'
                              ? 'bg-[var(--color-primary-600)] border-[var(--color-primary-500)] text-white'
                              : 'bg-[var(--surface-elevated)] border-[var(--surface-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                          }
                          focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1
                        `}
                        style={{ zIndex: 10011, isolation: 'isolate' }}
                        aria-pressed={format === 'csv'}
                      >
                        <FileSpreadsheet size={20} />
                        <div className="text-left">
                          <div className="font-medium">CSV</div>
                          <div className="text-xs opacity-80">Spreadsheet format</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Date Range */}
                  <div>
                    <label
                      className="block text-sm font-medium text-[var(--text-primary)] mb-3"
                      style={{ fontSize: tokens.fontSize.sm }}
                    >
                      <Calendar size={16} className="inline mr-2" />
                      Date Range (Optional)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="export-start-date"
                          className="block text-xs text-[var(--text-muted)] mb-1.5"
                          style={{ fontSize: tokens.fontSize.xs }}
                        >
                          Start Date
                        </label>
                        <Input
                          id="export-start-date"
                          type="date"
                          value={dateRange.start || ''}
                          onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                          disabled={loading}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="export-end-date"
                          className="block text-xs text-[var(--text-muted)] mb-1.5"
                          style={{ fontSize: tokens.fontSize.xs }}
                        >
                          End Date
                        </label>
                        <Input
                          id="export-end-date"
                          type="date"
                          value={dateRange.end || ''}
                          onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Type Filter */}
                  <div>
                    <label
                      className="block text-sm font-medium text-[var(--text-primary)] mb-3"
                      style={{ fontSize: tokens.fontSize.sm }}
                    >
                      <Filter size={16} className="inline mr-2" />
                      Filter by Type (Optional)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {allEventTypes.map(type => (
                        <button
                          key={type}
                          onClick={e => {
                            (e as any).stopImmediatePropagation();
                            e.stopPropagation();
                            handleToggleType(type);
                          }}
                          onMouseDown={e => {
                            (e as any).stopImmediatePropagation();
                            e.stopPropagation();
                          }}
                          className={`
                            px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                            ${
                              selectedTypes.includes(type)
                                ? 'bg-[var(--color-primary-600)] text-white'
                                : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                            }
                            focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1
                          `}
                          style={{
                            fontSize: tokens.fontSize.sm,
                            zIndex: 10011,
                            isolation: 'isolate',
                          }}
                          aria-pressed={selectedTypes.includes(type)}
                        >
                          {type.replace('_', ' ')}
                        </button>
                      ))}
                      {selectedTypes.length > 0 && (
                        <button
                          onClick={e => {
                            (e as any).stopImmediatePropagation();
                            e.stopPropagation();
                            setSelectedTypes([]);
                          }}
                          onMouseDown={e => {
                            (e as any).stopImmediatePropagation();
                            e.stopPropagation();
                          }}
                          className="px-3 py-1.5 rounded-full text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                          style={{
                            fontSize: tokens.fontSize.sm,
                            zIndex: 10011,
                            isolation: 'isolate',
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tag Filter */}
                  {availableTags.length > 0 && (
                    <div>
                      <label
                        className="block text-sm font-medium text-[var(--text-primary)] mb-3"
                        style={{ fontSize: tokens.fontSize.sm }}
                      >
                        <TagIcon size={16} className="inline mr-2" />
                        Filter by Tags (Optional)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.slice(0, 10).map(tag => (
                          <button
                            key={tag}
                            onClick={e => {
                              (e as any).stopImmediatePropagation();
                              e.stopPropagation();
                              handleToggleTag(tag);
                            }}
                            onMouseDown={e => {
                              (e as any).stopImmediatePropagation();
                              e.stopPropagation();
                            }}
                            className={`
                              px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                              ${
                                selectedTags.includes(tag)
                                  ? 'bg-[var(--color-primary-600)] text-white'
                                  : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                              }
                              focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1
                            `}
                            style={{
                              fontSize: tokens.fontSize.sm,
                              zIndex: 10011,
                              isolation: 'isolate',
                            }}
                            aria-pressed={selectedTags.includes(tag)}
                          >
                            #{tag}
                          </button>
                        ))}
                        {selectedTags.length > 0 && (
                          <button
                            onClick={e => {
                              (e as any).stopImmediatePropagation();
                              e.stopPropagation();
                              setSelectedTags([]);
                            }}
                            onMouseDown={e => {
                              (e as any).stopImmediatePropagation();
                              e.stopPropagation();
                            }}
                            className="px-3 py-1.5 rounded-full text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                            style={{
                              fontSize: tokens.fontSize.sm,
                              zIndex: 10011,
                              isolation: 'isolate',
                            }}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  <div
                    className="rounded-lg border border-[var(--surface-border)] bg-[var(--surface-elevated)]"
                    style={{ padding: tokens.spacing(3) }}
                  >
                    <div className="text-sm text-[var(--text-primary)] font-medium mb-1">
                      Export Summary
                    </div>
                    <div className="text-xs text-[var(--text-muted)] space-y-1">
                      <div>Format: {format.toUpperCase()}</div>
                      <div>Memories: {filteredCount}</div>
                      {dateRange.start && (
                        <div>From: {new Date(dateRange.start).toLocaleDateString()}</div>
                      )}
                      {dateRange.end && (
                        <div>To: {new Date(dateRange.end).toLocaleDateString()}</div>
                      )}
                      {selectedTypes.length > 0 && (
                        <div>Types: {selectedTypes.length} selected</div>
                      )}
                      {selectedTags.length > 0 && <div>Tags: {selectedTags.length} selected</div>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-end gap-3 border-t border-[var(--surface-border)]"
                style={{ padding: tokens.spacing(4) }}
              >
                <Button
                  type="button"
                  tone="secondary"
                  onClick={e => {
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                    handleClose();
                  }}
                  onMouseDown={e => {
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                  }}
                  disabled={loading}
                  style={{ zIndex: 10011, isolation: 'isolate' }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  tone="primary"
                  icon={<Download size={16} />}
                  onClick={e => {
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                    handleExport();
                  }}
                  onMouseDown={e => {
                    (e as any).stopImmediatePropagation();
                    e.stopPropagation();
                  }}
                  disabled={loading}
                  loading={loading}
                  style={{ zIndex: 10011, isolation: 'isolate' }}
                >
                  Export {format.toUpperCase()}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
