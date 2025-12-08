/**
 * Lazy Monaco Editor Component
 * Only loads Monaco in non-Redix mode or when explicitly needed
 */

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { isRedixMode, getRedixConfig } from '../../lib/redix-mode';

// Lazy load Monaco only when not in Redix mode
const MonacoEditorLazy = lazy(async () => {
  try {
    const module = await import('@monaco-editor/react');
    return { default: module.default as any };
  } catch {
    // Fallback if Monaco is not available
    const FallbackEditor = () => (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <p className="text-sm mb-2">Monaco Editor not available</p>
          <p className="text-xs text-gray-500">
            {isRedixMode()
              ? 'Monaco is disabled in Redix mode'
              : 'Please install @monaco-editor/react'}
          </p>
        </div>
      </div>
    );
    return { default: FallbackEditor as any };
  }
});

interface LazyMonacoEditorProps {
  value: string;
  onChange?: (value: string | undefined) => void;
  language?: string;
  height?: string;
  theme?: string;
  readOnly?: boolean;
  [key: string]: any; // Allow other Monaco props
}

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">
    <div className="text-center">
      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-400" />
      <p className="text-xs">Loading editor...</p>
    </div>
  </div>
);

/**
 * Lazy-loaded Monaco Editor
 * Only loads when not in Redix mode
 */
export function LazyMonacoEditor(props: LazyMonacoEditorProps) {
  const config = getRedixConfig();

  // In Redix mode, show a simple textarea instead
  if (config.enabled && !config.enableMonaco) {
    return (
      <div className="h-full w-full">
        <textarea
          value={props.value}
          onChange={e => props.onChange?.(e.target.value)}
          className="w-full h-full bg-gray-900 text-gray-100 font-mono text-sm p-4 border border-gray-700 rounded focus:outline-none focus:border-purple-500 resize-none"
          readOnly={props.readOnly}
          placeholder={props.readOnly ? 'Editor disabled in Redix mode' : 'Type your code...'}
        />
        <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-500">
          Simple editor (Monaco disabled in Redix mode)
        </div>
      </div>
    );
  }

  // Load Monaco editor (lazy)
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MonacoEditorLazy {...(props as any)} />
    </Suspense>
  );
}


