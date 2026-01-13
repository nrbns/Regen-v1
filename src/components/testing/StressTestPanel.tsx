/**
 * Stress Test Panel Component
 * 
 * Provides UI for running event bus stress tests
 */

import React, { useState } from 'react';
import { Play, Square, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { runStressTestWithReport, runQuickTest, runFullTest, printReport, type StressTestReport } from '../../core/testing/stressTestRunner';

export function StressTestPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<StressTestReport | null>(null);
  const [config, setConfig] = useState({
    tabs: 50,
    duration: 60000,
    eventsPerSecond: 100,
    rapidScroll: true,
    rapidSearch: true,
    concurrentAutomations: true,
  });

  const handleRunQuickTest = async () => {
    setIsRunning(true);
    setReport(null);
    try {
      const result = await runQuickTest();
      setReport(result);
      printReport(result);
    } catch (error) {
      console.error('[StressTest] Test failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunFullTest = async () => {
    setIsRunning(true);
    setReport(null);
    try {
      const result = await runFullTest();
      setReport(result);
      printReport(result);
    } catch (error) {
      console.error('[StressTest] Test failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunCustomTest = async () => {
    setIsRunning(true);
    setReport(null);
    try {
      const result = await runStressTestWithReport(config);
      setReport(result);
      printReport(result);
    } catch (error) {
      console.error('[StressTest] Test failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 bg-slate-800 rounded-lg border border-slate-700">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-400" />
        Event Bus Stress Test
      </h2>

      <div className="space-y-4">
        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleRunQuickTest}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded flex items-center gap-2"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Quick Test (10s)
          </button>
          <button
            onClick={handleRunFullTest}
            disabled={isRunning}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded flex items-center gap-2"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Full Test (60s)
          </button>
        </div>

        {/* Custom Config */}
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Custom Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tabs</label>
              <input
                type="number"
                value={config.tabs}
                onChange={(e) => setConfig({ ...config, tabs: parseInt(e.target.value) || 50 })}
                className="w-full px-2 py-1 bg-slate-700 text-white rounded text-sm"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Duration (ms)</label>
              <input
                type="number"
                value={config.duration}
                onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) || 60000 })}
                className="w-full px-2 py-1 bg-slate-700 text-white rounded text-sm"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Events/sec</label>
              <input
                type="number"
                value={config.eventsPerSecond}
                onChange={(e) => setConfig({ ...config, eventsPerSecond: parseInt(e.target.value) || 100 })}
                className="w-full px-2 py-1 bg-slate-700 text-white rounded text-sm"
                disabled={isRunning}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.rapidScroll}
                onChange={(e) => setConfig({ ...config, rapidScroll: e.target.checked })}
                className="w-4 h-4"
                disabled={isRunning}
              />
              <label className="text-xs text-slate-400">Rapid Scroll</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.rapidSearch}
                onChange={(e) => setConfig({ ...config, rapidSearch: e.target.checked })}
                className="w-4 h-4"
                disabled={isRunning}
              />
              <label className="text-xs text-slate-400">Rapid Search</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.concurrentAutomations}
                onChange={(e) => setConfig({ ...config, concurrentAutomations: e.target.checked })}
                className="w-4 h-4"
                disabled={isRunning}
              />
              <label className="text-xs text-slate-400">Concurrent Automations</label>
            </div>
          </div>
          <button
            onClick={handleRunCustomTest}
            disabled={isRunning}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded flex items-center gap-2"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Run Custom Test
          </button>
        </div>

        {/* Results */}
        {report && (
          <div className="border-t border-slate-700 pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              {report.passed ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <h3 className="text-sm font-semibold text-white">
                {report.passed ? 'Test Passed' : 'Test Failed'}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Total Events:</span>
                <span className="text-white ml-2">{report.results.totalEvents.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400">Crashes:</span>
                <span className={`ml-2 ${report.results.crashes > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {report.results.crashes}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Errors:</span>
                <span className={`ml-2 ${report.results.errors.length > 10 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {report.results.errors.length}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Max Memory:</span>
                <span className="text-white ml-2">
                  {report.results.maxMemoryMB?.toFixed(2) || 'N/A'} MB
                </span>
              </div>
              <div>
                <span className="text-slate-400">Avg Latency:</span>
                <span className="text-white ml-2">
                  {report.results.avgEventLatency?.toFixed(2) || 'N/A'} ms
                </span>
              </div>
            </div>

            {Object.keys(report.results.eventsByType).length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-slate-400 mb-2">Events by Type:</h4>
                <div className="space-y-1">
                  {Object.entries(report.results.eventsByType).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-xs">
                      <span className="text-slate-300">{type}:</span>
                      <span className="text-white">{count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.recommendations.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-slate-400 mb-2">Recommendations:</h4>
                <ul className="space-y-1">
                  {report.recommendations.map((rec, i) => (
                    <li key={i} className="text-xs text-yellow-400">{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
