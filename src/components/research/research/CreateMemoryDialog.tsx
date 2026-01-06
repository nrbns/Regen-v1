/**
 * Create Memory Dialog
 * Modal for creating new memory events (notes, bookmarks, tasks)
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Bookmark, CheckSquare, Tag, Link, Plus } from 'lucide-react';
import { trackNote, trackBookmark, trackTask } from '../../core/supermemory/tracker';
import { showToast } from '../../state/toastStore';
import { useTokens } from '../../ui/useTokens';
import { Button } from '../../ui/button';
import { Input, TextArea } from '../../ui/input';
import type { MemoryEventType } from '../../core/supermemory/event-types';

interface CreateMemoryDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  initialType?: MemoryEventType;
  initialUrl?: string;
  initialTitle?: string;
}

type MemoryFormType = 'note' | 'bookmark' | 'task';

const MEMORY_TYPES: Array<{
  value: MemoryFormType;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
}> = [
  { value: 'note', label: 'Note', icon: FileText, description: 'Save a text note with tags' },
  { value: 'bookmark', label: 'Bookmark', icon: Bookmark, description: 'Bookmark a URL for later' },
  {
    value: 'task',
    label: 'Task',
    icon: CheckSquare,
    description: 'Create a task with optional due date',
  },
];

export function CreateMemoryDialog({
  open,
  onClose,
  onCreated,
  initialType,
  initialUrl,
  initialTitle,
}: CreateMemoryDialogProps) {
  const tokens = useTokens();
  const [type, setType] = useState<MemoryFormType>(
    (initialType === 'note' || initialType === 'bookmark' || initialType === 'task'
      ? initialType
      : 'note') as MemoryFormType
  );
  const [title, setTitle] = useState(initialTitle || '');
  const [url, setUrl] = useState(initialUrl || '');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed.startsWith('#') ? trimmed : `#${trimmed}`]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      setTags(tags.filter(t => t !== tagToRemove));
    },
    [tags]
  );

  const handleTagInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
        let eventId = '';

        if (type === 'note') {
          if (!content.trim()) {
            showToast('error', 'Note content is required');
            setLoading(false);
            return;
          }
          eventId = await trackNote(url || window.location.href, {
            title: title || 'Untitled Note',
            notePreview: content,
            noteLength: content.length,
            tags: tags.length > 0 ? tags : undefined,
            url: url || undefined,
          });
        } else if (type === 'bookmark') {
          if (!url.trim()) {
            showToast('error', 'URL is required for bookmarks');
            setLoading(false);
            return;
          }
          const bookmarkMetadata: any = {
            title: title || 'Untitled Bookmark',
          };
          if (tags.length > 0) {
            bookmarkMetadata.tags = tags;
          }
          eventId = await trackBookmark(url, bookmarkMetadata);
        } else if (type === 'task') {
          if (!title.trim()) {
            showToast('error', 'Task title is required');
            setLoading(false);
            return;
          }
          // trackTask doesn't support tags directly, but we can add them to metadata
          const taskMetadata: any = {
            url: url || undefined,
            notes: content || undefined,
            priority,
            dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
          };
          if (tags.length > 0) {
            taskMetadata.tags = tags;
          }
          eventId = await trackTask(title, taskMetadata);
        }

        if (eventId) {
          showToast(
            'success',
            `${MEMORY_TYPES.find(t => t.value === type)?.label} created successfully`
          );
          // Reset form
          setTitle('');
          setUrl('');
          setContent('');
          setTags([]);
          setTagInput('');
          setPriority('medium');
          setDueDate('');
          onCreated?.();
          onClose();
        } else {
          showToast('error', 'Failed to create memory');
        }
      } catch (error) {
        console.error('[CreateMemoryDialog] Failed to create memory:', error);
        showToast('error', 'Failed to create memory');
      } finally {
        setLoading(false);
      }
    },
    [type, title, url, content, tags, priority, dueDate, onCreated, onClose]
  );

  const handleClose = useCallback(() => {
    if (!loading) {
      onClose();
    }
  }, [loading, onClose]);

  if (!open) return null;

  const selectedTypeInfo = MEMORY_TYPES.find(t => t.value === type);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
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
            aria-labelledby="create-memory-title"
          >
            <div
              className="w-full max-w-lg bg-[var(--surface-root)] border border-[var(--surface-border)] rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between border-b border-[var(--surface-border)]"
                style={{ padding: tokens.spacing(4) }}
              >
                <div className="flex items-center gap-3">
                  {selectedTypeInfo && (
                    <selectedTypeInfo.icon
                      size={20}
                      className="text-[var(--color-primary-400)] flex-shrink-0"
                    />
                  )}
                  <h2
                    id="create-memory-title"
                    className="font-semibold text-[var(--text-primary)]"
                    style={{ fontSize: tokens.fontSize.lg }}
                  >
                    Create Memory
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

              {/* Type Selector */}
              <div
                className="border-b border-[var(--surface-border)]"
                style={{ padding: tokens.spacing(3), paddingTop: tokens.spacing(2) }}
              >
                <div className="flex gap-2">
                  {MEMORY_TYPES.map(typeOption => {
                    const Icon = typeOption.icon;
                    return (
                      <button
                        key={typeOption.value}
                        onClick={e => {
                          (e as any).stopImmediatePropagation();
                          e.stopPropagation();
                          setType(typeOption.value);
                        }}
                        onMouseDown={e => {
                          (e as any).stopImmediatePropagation();
                          e.stopPropagation();
                        }}
                        className={`
                          flex-1 flex flex-col items-center gap-2 px-3 py-2.5 rounded-lg border transition-all
                          ${
                            type === typeOption.value
                              ? 'bg-[var(--color-primary-600)] border-[var(--color-primary-500)] text-white'
                              : 'bg-[var(--surface-elevated)] border-[var(--surface-border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                          }
                          focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:ring-offset-1
                        `}
                        style={{ zIndex: 10011, isolation: 'isolate' }}
                        aria-pressed={type === typeOption.value}
                      >
                        <Icon size={18} />
                        <div className="text-xs font-medium">{typeOption.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form */}
              <form
                onSubmit={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleSubmit(e);
                }}
                className="flex-1 overflow-y-auto"
                style={{ padding: tokens.spacing(4) }}
                onMouseDown={e => {
                  // Don't interfere with form submission
                  const target = e.target as HTMLElement;
                  if (
                    target.closest('button[type="submit"]') ||
                    target.closest('input') ||
                    target.closest('textarea') ||
                    target.closest('select')
                  ) {
                    return;
                  }
                }}
                onClick={e => {
                  // Don't interfere with form submission
                  const target = e.target as HTMLElement;
                  if (
                    target.closest('button[type="submit"]') ||
                    target.closest('input') ||
                    target.closest('textarea') ||
                    target.closest('select')
                  ) {
                    return;
                  }
                }}
              >
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label
                      htmlFor="memory-title"
                      className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
                      style={{ fontSize: tokens.fontSize.sm }}
                    >
                      Title {type === 'task' && <span className="text-red-400">*</span>}
                    </label>
                    <Input
                      id="memory-title"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder={type === 'task' ? 'Task title...' : 'Optional title...'}
                      required={type === 'task'}
                      disabled={loading}
                    />
                  </div>

                  {/* URL */}
                  {(type === 'bookmark' || type === 'note') && (
                    <div>
                      <label
                        htmlFor="memory-url"
                        className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
                        style={{ fontSize: tokens.fontSize.sm }}
                      >
                        URL {type === 'bookmark' && <span className="text-red-400">*</span>}
                      </label>
                      <div className="flex items-center gap-2">
                        <Link size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                        <Input
                          id="memory-url"
                          type="url"
                          value={url}
                          onChange={e => setUrl(e.target.value)}
                          placeholder="https://example.com"
                          required={type === 'bookmark'}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  )}

                  {/* Content/Notes */}
                  {(type === 'note' || type === 'task') && (
                    <div>
                      <label
                        htmlFor="memory-content"
                        className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
                        style={{ fontSize: tokens.fontSize.sm }}
                      >
                        {type === 'note' ? 'Content' : 'Notes'}{' '}
                        {type === 'note' && <span className="text-red-400">*</span>}
                      </label>
                      <TextArea
                        id="memory-content"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder={type === 'note' ? 'Write your note...' : 'Optional notes...'}
                        rows={type === 'note' ? 6 : 4}
                        required={type === 'note'}
                        disabled={loading}
                      />
                    </div>
                  )}

                  {/* Task-specific fields */}
                  {type === 'task' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="memory-priority"
                          className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
                          style={{ fontSize: tokens.fontSize.sm }}
                        >
                          Priority
                        </label>
                        <select
                          id="memory-priority"
                          value={priority}
                          onChange={e => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--surface-panel)] border border-[var(--surface-border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
                          style={{ fontSize: tokens.fontSize.sm }}
                          disabled={loading}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="memory-due-date"
                          className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
                          style={{ fontSize: tokens.fontSize.sm }}
                        >
                          Due Date
                        </label>
                        <Input
                          id="memory-due-date"
                          type="date"
                          value={dueDate}
                          onChange={e => setDueDate(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  <div>
                    <label
                      htmlFor="memory-tags"
                      className="block text-sm font-medium text-[var(--text-primary)] mb-1.5"
                      style={{ fontSize: tokens.fontSize.sm }}
                    >
                      Tags
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      <Tag size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                      <Input
                        id="memory-tags"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={handleTagInputKeyDown}
                        placeholder="Add tags (press Enter or comma)"
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        tone="secondary"
                        size="sm"
                        icon={<Plus size={14} />}
                        onClick={e => {
                          (e as any).stopImmediatePropagation();
                          e.stopPropagation();
                          handleAddTag();
                        }}
                        onMouseDown={e => {
                          (e as any).stopImmediatePropagation();
                          e.stopPropagation();
                        }}
                        disabled={loading || !tagInput.trim()}
                        style={{ zIndex: 10011, isolation: 'isolate' }}
                      >
                        Add
                      </Button>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface-elevated)] text-[var(--color-primary-300)] text-xs"
                            style={{ fontSize: tokens.fontSize.xs }}
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={e => {
                                (e as any).stopImmediatePropagation();
                                e.stopPropagation();
                                handleRemoveTag(tag);
                              }}
                              onMouseDown={e => {
                                (e as any).stopImmediatePropagation();
                                e.stopPropagation();
                              }}
                              className="hover:text-red-400 transition-colors"
                              style={{ zIndex: 10011, isolation: 'isolate' }}
                              aria-label={`Remove tag ${tag}`}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </form>

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
                  type="submit"
                  tone="primary"
                  onClick={e => {
                    // Prevent double submission - form onSubmit will handle it
                    e.preventDefault();
                    e.stopPropagation();
                    (e as any).stopImmediatePropagation();
                  }}
                  onMouseDown={e => {
                    // Allow mousedown to proceed normally for form submission
                    e.stopPropagation();
                  }}
                  disabled={loading || !title.trim()}
                  loading={loading}
                  style={{ zIndex: 10011, isolation: 'isolate', pointerEvents: 'auto' }}
                >
                  Create {selectedTypeInfo?.label}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
