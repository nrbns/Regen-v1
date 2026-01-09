import React from 'react';
import { Save, RotateCcw } from 'lucide-react';

export function SettingsPersistence() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-200">Settings & Data</h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-lg">
          <div>
            <h4 className="font-medium text-slate-200">Auto-save settings</h4>
            <p className="text-sm text-slate-400">Automatically save your preferences</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-lg">
          <div>
            <h4 className="font-medium text-slate-200">Sync across devices</h4>
            <p className="text-sm text-slate-400">Keep settings synchronized</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
            <Save className="h-4 w-4" />
            <span>Save Settings</span>
          </button>

          <button className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors">
            <RotateCcw className="h-4 w-4" />
            <span>Reset to Defaults</span>
          </button>
        </div>
      </div>
    </div>
  );
}