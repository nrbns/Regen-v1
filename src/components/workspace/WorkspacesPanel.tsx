import React from 'react';
import { Folder, Plus, Settings } from 'lucide-react';

export function WorkspacesPanel() {
  const workspaces = [
    { id: '1', name: 'Research', itemCount: 15, lastModified: '2 hours ago' },
    { id: '2', name: 'Development', itemCount: 8, lastModified: '1 day ago' },
    { id: '3', name: 'Personal', itemCount: 23, lastModified: '3 days ago' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-200">Workspaces</h3>
        <button className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm">
          <Plus className="w-4 h-4" />
          <span>New</span>
        </button>
      </div>

      <div className="space-y-3">
        {workspaces.map((workspace) => (
          <div
            key={workspace.id}
            className="flex items-center space-x-3 p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg cursor-pointer transition-colors"
          >
            <Folder className="w-5 h-5 text-blue-400" />
            <div className="flex-1">
              <h4 className="font-medium text-slate-200">{workspace.name}</h4>
              <p className="text-sm text-slate-400">
                {workspace.itemCount} items • {workspace.lastModified}
              </p>
            </div>
            <button className="p-1 text-slate-400 hover:text-slate-200 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}