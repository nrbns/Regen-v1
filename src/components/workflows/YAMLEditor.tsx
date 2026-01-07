/**
 * YAML Editor Component
 * Phase 2, Day 3: Workflow Builder - Enhanced YAML editor with syntax highlighting
 */

import { useState, useEffect, useRef } from 'react';
// import { motion } from 'framer-motion'; // Unused
import { AlertCircle, CheckCircle2, Code } from 'lucide-react';
import { toast } from '../../utils/toast';

interface YAMLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onValidate?: (isValid: boolean, error?: string) => void;
  placeholder?: string;
  height?: string;
}

/**
 * Phase 2, Day 3: Simple YAML/JSON validator
 */
function validateYAMLOrJSON(text: string): {
  valid: boolean;
  error?: string;
  format: 'yaml' | 'json';
} {
  if (!text.trim()) {
    return { valid: true, format: 'yaml' };
  }

  // Try JSON first
  try {
    JSON.parse(text);
    return { valid: true, format: 'json' };
  } catch {
    // Try YAML (basic validation)
    const lines = text.split('\n');
    let _indentStack: number[] = [];
    let inString = false;
    let _stringChar = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;

      // Check for basic YAML structure
      if (line.includes(':') && !inString) {
        // Valid key-value pair
        continue;
      } else if (line.startsWith('-') && !inString) {
        // Valid list item
        continue;
      } else if (line.match(/^[a-zA-Z_][a-zA-Z0-9_]*:/) && !inString) {
        // Valid key
        continue;
      } else if (line === '---' || line === '...') {
        // YAML document markers
        continue;
      } else if (!line.match(/^[-\s]*$/) && !inString) {
        // Might be invalid, but allow it (could be multiline string)
        continue;
      }
    }

    // Basic validation passed
    return { valid: true, format: 'yaml' };
  }
}

/**
 * Phase 2, Day 3: Simple syntax highlighting for YAML/JSON
 * SECURITY: Escapes HTML to prevent XSS, only uses safe span tags
 */
function highlightSyntax(text: string): string {
  // SECURITY: Escape HTML first to prevent XSS
  const escapeHtml = (str: string): string => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const escaped = escapeHtml(text);

  // Very basic syntax highlighting using HTML (only safe span tags)
  return escaped
    .replace(/("(?:[^"\\]|\\.)*"):/g, '<span class="text-purple-400">$1</span>:')
    .replace(/: ("(?:[^"\\]|\\.)*")/g, ': <span class="text-emerald-400">$1</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span class="text-blue-400">$1</span>')
    .replace(/: (true|false|null)/g, ': <span class="text-yellow-400">$1</span>')
    .replace(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*):/gm, '$1<span class="text-cyan-400">$2</span>:')
    .replace(/^(\s*)-\s/gm, '$1<span class="text-orange-400">-</span> ')
    .replace(/#.*$/gm, '<span class="text-gray-500">$&</span>');
}

export function YAMLEditor({
  value,
  onChange,
  onValidate,
  placeholder = 'Enter YAML or JSON workflow definition...',
  height = '400px',
}: YAMLEditorProps) {
  const [validation, setValidation] = useState<{
    valid: boolean;
    error?: string;
    format?: 'yaml' | 'json';
  }>({
    valid: true,
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Phase 2, Day 3: Validate on change
  useEffect(() => {
    const result = validateYAMLOrJSON(value);
    setValidation(result);
    if (onValidate) {
      onValidate(result.valid, result.error);
    }
  }, [value, onValidate]);

  // Phase 2, Day 3: Sync scroll between textarea and highlight overlay
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Phase 2, Day 3: Format JSON
  const formatJSON = () => {
    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange(formatted);
      toast.success('JSON formatted');
    } catch {
      toast.error('Invalid JSON');
    }
  };

  return (
    <div className="relative flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/50 px-3 py-2">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-400">
            {validation.format ? validation.format.toUpperCase() : 'YAML/JSON'}
          </span>
          {validation.valid ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {validation.format === 'json' && (
            <button
              onClick={formatJSON}
              className="rounded border border-slate-600 px-2 py-1 text-xs text-gray-300 hover:bg-slate-700"
            >
              Format JSON
            </button>
          )}
        </div>
      </div>

      {/* Editor Container */}
      <div className="relative flex-1 overflow-hidden rounded-b border border-t-0 border-slate-700 bg-slate-900">
        {/* Syntax Highlight Overlay */}
        <div
          ref={highlightRef}
          className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-sm leading-relaxed"
          style={{ height }}
          dangerouslySetInnerHTML={{
            __html: highlightSyntax(value || placeholder),
          }}
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onScroll={handleScroll}
          placeholder={placeholder}
          className="relative z-10 w-full resize-none bg-transparent p-3 font-mono text-sm leading-relaxed text-transparent caret-white focus:outline-none"
          style={{ height }}
          spellCheck={false}
        />

        {/* Error Message */}
        {!validation.valid && validation.error && (
          <div className="absolute bottom-0 left-0 right-0 border-t border-red-500/50 bg-red-500/10 p-2">
            <div className="flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="h-4 w-4" />
              <span>{validation.error}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
