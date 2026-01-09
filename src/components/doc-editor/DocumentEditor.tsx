import React from 'react';

export function DocumentEditor() {
  return (
    <div className="h-full flex items-center justify-center bg-slate-900 text-white">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">Document Editor</h1>
        <p className="text-slate-400 max-w-md">
          Advanced document editing capabilities will be available here.
          This feature is currently under development.
        </p>
        <div className="flex justify-center space-x-4 mt-6">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
            New Document
          </button>
          <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
            Open Existing
          </button>
        </div>
      </div>
    </div>
  );
}