import React from 'react';

export function ContextOverlay({
  title,
  content,
  children,
  onDismiss,
}: {
  title?: string;
  content?: React.ReactNode;
  children?: React.ReactNode;
  onDismiss?: () => void;
}) {
  // Support both `content` prop and children for flexible usage in tests and app
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="max-w-lg rounded-lg bg-gray-900 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={() => onDismiss && onDismiss()} className="text-gray-400">
            Close
          </button>
        </div>
        <div className="mt-4">{content ?? children}</div>
      </div>
    </div>
  );
}

export default ContextOverlay;
