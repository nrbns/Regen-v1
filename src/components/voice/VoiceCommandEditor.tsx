/**
 * Voice Command Editor - Edit command before execution
 * Phase 1, Day 5: WISPR Voice Polish
 */

import { useState } from 'react';
import { Check, X, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceCommandEditorProps {
  initialCommand: string;
  onExecute: (command: string) => void;
  onCancel: () => void;
  language?: string;
}

export function VoiceCommandEditor({
  initialCommand,
  onExecute,
  onCancel,
  language = 'en',
}: VoiceCommandEditorProps) {
  const [command, setCommand] = useState(initialCommand);
  const [isEditing, setIsEditing] = useState(true);

  const handleExecute = () => {
    if (command.trim()) {
      onExecute(command.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <AnimatePresence>
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed bottom-4 right-4 z-[10000] w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
        >
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Mic className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-slate-200">
                {language === 'hi' ? 'आवाज आदेश' : 'Voice Command'}
              </span>
              <span className="ml-auto text-xs text-slate-500">
                {language === 'hi' ? 'संपादित करें' : 'Edit before executing'}
              </span>
            </div>

            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder={language === 'hi' ? 'आदेश दर्ज करें...' : 'Enter command...'}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              rows={3}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleExecute();
                } else if (e.key === 'Escape') {
                  handleCancel();
                }
              }}
            />

            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {language === 'hi'
                  ? 'Ctrl+Enter: निष्पादित करें | Esc: रद्द करें'
                  : 'Ctrl+Enter: Execute | Esc: Cancel'}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  <X size={14} />
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  onClick={handleExecute}
                  disabled={!command.trim()}
                  className="flex items-center gap-1 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={14} />
                  {language === 'hi' ? 'निष्पादित करें' : 'Execute'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

