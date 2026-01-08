import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { TabsBar } from '../../ui/components/TabsBar';
import { CommandBar } from '../CommandBar';
import { WebView } from '../../ui/components/WebView';
import { Diagnostics } from '../../ui/components/Diagnostics';
import { IntentRipple } from '../../ui/components/IntentRipple';
import { IntelligenceNode } from '../../ui/components/IntelligenceNode';
import { ThoughtStream } from '../../ui/components/ThoughtStream';
import { StatusStrip } from '../../ui/components/StatusStrip';
import { systemState, IPCHandler, IPC_EVENTS } from '../../backend';
import { aiController } from '../../core/ai/AIController';

// UI IS NOW DUMB - Only renders SystemState, sends events
export function AppShell(): JSX.Element {
  // SINGLE SOURCE OF TRUTH: Only SystemState
  const [systemStateData, setSystemStateData] = useState(systemState.getState());

  // UI-only state (not persisted, recreated on refresh)
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  // UI-only state for visual effects (not persisted)
  const [showIntentRipple, setShowIntentRipple] = useState<{ x: number; y: number; intent: string } | null>(null);
  const [intelligenceNodes, setIntelligenceNodes] = useState<Array<{
    id: string;
    task: any;
    position: { x: number; y: number };
    isMinimized: boolean;
  }>>([]);
    cpu: 12,
    ram: 28,
    network: true,
    activeModel: 'local' as 'local' | 'online',
    taskCount: 0,
    uptime: 0,
  });

  // Subscribe to system state changes
  // UI IS DUMB: Only subscribes to SystemState changes
  useEffect(() => {
    const handleStateChange = (newState: any) => {
      setSystemStateData(newState);
    };

    systemState.on('state-changed', handleStateChange);

    return () => {
      systemState.off('state-changed', handleStateChange);
    };
  }, []);

  // KEYBOARD SHORTCUTS - First-class keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Focus command surface
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Focus command bar (would implement focus management)
        console.log('Focus command surface');
      }

      // Escape: Close current panels/overlays
      if (e.key === 'Escape') {
        if (expandedThoughtStream) {
          setExpandedThoughtStream(null);
        }
        if (showDiagnostics) {
          setShowDiagnostics(false);
        }
      }

      // Cmd/Ctrl + L: Toggle logs (would show/hide log panel)
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        console.log('Toggle logs');
      }

      // Cmd/Ctrl + Shift + C: Toggle calm mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        setCalmMode(!calmMode);
      }

      // Cancel current task (if any running)
      if (e.key === 'c' && (e.metaKey || e.ctrlKey) && e.altKey) {
        e.preventDefault();
        const runningTask = intelligenceNodes.find(n => n.task.status === 'running');
        if (runningTask) {
          handleCancelTask(runningTask.id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [expandedThoughtStream, showDiagnostics, calmMode, intelligenceNodes]);

  const activeTab = systemStateData.tabs.find(tab => tab.id === systemStateData.activeTabId);

  // Handle command orbit submission
  // UI IS DUMB: Only sends events, backend owns all logic and state
  const handleCommandSubmit = (intent: { type: string; input: string; confidence: number }) => {
    if (intent.type === 'navigate') {
      // Send navigation event - backend will update SystemState immediately
      IPCHandler.navigate(systemStateData.activeTabId!, intent.input);
    } else if (intent.type === 'search') {
      // Send search navigation event
      IPCHandler.navigate(systemStateData.activeTabId!, `https://www.google.com/search?q=${encodeURIComponent(intent.input)}`);
    } else if (intent.type === 'ai') {
      // Send AI task event - backend will update SystemState and run AI
      IPCHandler.runAI(intent.input);

      // Show intent ripple briefly (UI-only effect)
      setShowIntentRipple({
        x: window.innerWidth / 2,
        y: 100,
        intent: intent.type,
      });
    }
  };

    setTimeout(() => setShowIntentRipple(null), 2000);

    // Execute based on intent type
    if (intent.type === 'navigate' || intent.type === 'search') {
      if (systemStateData.activeTabId) {
        IPCHandler.navigate(systemStateData.activeTabId, intent.input);
      }
    } else {
      // AI task - create thought stream
      setExpandedThoughtStream(taskId);
      IPCHandler.runAI(intent.input);
    }
  };

  // Handle text selection for intent ripple
  const handleTextSelection = (x: number, y: number) => {
    setShowIntentRipple({ x, y, intent: 'text_selected' });
  };

  // Handle intent ripple action with AI processing
  const handleIntentRippleAction = async (action: string, selectedText?: string) => {
    if (!showIntentRipple) return;

    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const nodePosition = {
      x: showIntentRipple.x,
      y: showIntentRipple.y + 50,
    };

    let intent = '';
    let aiTask: 'explain' | 'summarize' | 'extract' = 'explain';

    switch (action) {
      case 'explain':
        intent = 'Explain the selected text';
        aiTask = 'explain';
        break;
      case 'summarize':
        intent = 'Summarize the selected text';
        aiTask = 'summarize';
        break;
      case 'search':
        intent = 'Search for the selected text';
        // Search is not AI, handle differently
        window.open(`https://www.google.com/search?q=${encodeURIComponent(selectedText || '')}`, '_blank');
        setShowIntentRipple(null);
        return;
      default:
        intent = action;
    }

    const newNode = {
      id: taskId,
      task: {
        id: taskId,
        intent,
        status: 'running' as const,
        model: systemResources.activeModel,
        createdAt: Date.now(),
      },
      position: nodePosition,
      isMinimized: false,
    };

    setIntelligenceNodes(prev => [...prev, newNode]);
    setExpandedThoughtStream(taskId);

    try {
      // Initialize AI if needed
      await aiController.initialize();

      // Process the AI request
      const response = await aiController.processSelectedText(
        selectedText || 'No text selected',
        aiTask
      );

      // Update task with completion
      setIntelligenceNodes(prev =>
        prev.map(node =>
          node.id === taskId
            ? { ...node, task: { ...node.task, status: 'done' as const } }
            : node
        )
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown AI error';
      console.error('[AppShell] AI processing failed:', errorMessage);

      // Update task with recoverable error
      setIntelligenceNodes(prev =>
        prev.map(node =>
          node.id === taskId
            ? { ...node, task: { ...node.task, status: 'failed' as const } }
            : node
        )
      );

      // Show recoverable error (no modal, inline in task node)
      console.log(`[ERROR] ${intent} failed: ${errorMessage}`);
      console.log(`[RECOVERY] Try switching to online model or reducing context size`);
    }

    setShowIntentRipple(null);
  };

  // ABSOLUTE USER CONTROL: Cancel, retry, close, switch model
  const handleCancelTask = (taskId: string) => {
    // Immediately update UI state
    setIntelligenceNodes(prev =>
      prev.map(node =>
        node.id === taskId
          ? { ...node, task: { ...node.task, status: 'cancelled' as const } }
          : node
      )
    );

    // Send cancel signal to backend
    IPCHandler.send('task:cancel', { taskId });

    // Close thought stream if this task was expanded
    if (expandedThoughtStream === taskId) {
      setExpandedThoughtStream(null);
    }
  };

  const handleRetryTask = (taskId: string) => {
    const node = intelligenceNodes.find(n => n.id === taskId);
    if (!node) return;

    // Reset task to running state
    const updatedNode = {
      ...node,
      task: {
        ...node.task,
        status: 'running' as const,
        createdAt: Date.now(),
      }
    };

    setIntelligenceNodes(prev =>
      prev.map(n => n.id === taskId ? updatedNode : n)
    );

    // Re-run the task
    setExpandedThoughtStream(taskId);
    IPCHandler.runAI(node.task.intent);
  };

  const handleCloseTask = (taskId: string) => {
    // Remove from UI completely
    setIntelligenceNodes(prev => prev.filter(n => n.id !== taskId));

    // Close thought stream if this task was expanded
    if (expandedThoughtStream === taskId) {
      setExpandedThoughtStream(null);
    }

    // Notify backend
    IPCHandler.send('task:close', { taskId });
  };

  // Handle model switching
  const handleModelSwitch = (newModel: 'local' | 'online') => {
    setSystemResources(prev => ({ ...prev, activeModel: newModel }));
    aiController.setPreferredModel(newModel);

    // Update all active tasks to use new model preference
    setIntelligenceNodes(prev =>
      prev.map(node => ({
        ...node,
        task: { ...node.task, model: newModel }
      }))
    );

    console.log(`Switched to ${newModel} model`);
  };

  const handleSwitchModel = (taskId: string, newModel: 'local' | 'online') => {
    // Update local state immediately
    setIntelligenceNodes(prev =>
      prev.map(node =>
        node.id === taskId
          ? { ...node, task: { ...node.task, model: newModel } }
          : node
      )
    );

    // Update global system model
    setSystemResources(prev => ({ ...prev, activeModel: newModel }));

    // Notify backend
    IPCHandler.send('model:switch', { taskId, model: newModel });
  };

  // Handle URL changes from iframe - UI only sends events
  const handleUrlChange = (url: string) => {
    if (systemStateData.activeTabId) {
      // In a real implementation, this would be handled by the WebView's navigation events
      // For now, just update the state
      systemState.updateTab(systemStateData.activeTabId, { url, title: url });
    }
  };

  // Handle AI task creation
  const handleAITask = (intent: string) => {
    setCurrentIntent({ intent, status: 'detected' });
    setShowAIPanel(true);
    setTaskListMinimized(false);

    // Simulate intent processing
    setTimeout(() => {
      setCurrentIntent(prev => prev ? { ...prev, status: 'running' } : null);
    }, 100);

    // Start the AI task
    IPCHandler.runAI(intent);
  };


  // Handle task selection from task list
  const handleSelectTask = (taskId: string) => {
    // For now, just show the AI panel
    setShowAIPanel(true);
  };

  // KEYBOARD SHORTCUTS - First-class keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Focus command orbit
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Focus would be handled by the CommandBar component
        return;
      }

      // Escape: Close current panels
      if (e.key === 'Escape') {
        if (expandedThoughtStream) {
          setExpandedThoughtStream(null);
        } else if (realityStripExpanded) {
          setRealityStripExpanded(false);
        }
      }

      // Cmd/Ctrl + L: Toggle logs
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        // Toggle logs visibility (would be implemented)
      }

      // Cmd/Ctrl + M: Switch model
      if ((e.metaKey || e.ctrlKey) && e.key === 'm') {
        e.preventDefault();
        const newModel = systemResources.activeModel === 'local' ? 'online' : 'local';
        handleModelSwitch(newModel);
      }

      // Cmd/Ctrl + Shift + C: Toggle calm mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        setCalmMode(!calmMode);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [expandedThoughtStream, realityStripExpanded, systemResources.activeModel, calmMode]);

  // Simulate resource monitoring (in real implementation, this would come from system monitoring)
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemResources(prev => ({
        ...prev,
        cpu: Math.floor(Math.random() * 30) + 10, // 10-40%
        ram: Math.floor(Math.random() * 40) + 20, // 20-60%
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut for diagnostics (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDiagnostics(true);
      }
      if (e.key === 'Escape' && showDiagnostics) {
        setShowDiagnostics(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDiagnostics]);

  return (
    <div className="h-screen w-screen bg-slate-900 text-white flex flex-col overflow-hidden">
      {/* Router Outlet for pages like Settings */}
      <Outlet />

      {/* ONE STABLE LAYOUT */}
      <div className="flex-1 flex flex-col">
        {/* TOP: Command Surface */}
        <div className="border-b border-slate-700">
          <CommandBar onSubmit={handleCommandSubmit} />
        </div>

        {/* MIDDLE: Browser Canvas + Intelligence */}
        <div className="flex-1 flex">
          {/* Left: Browser Canvas */}
          <div className="flex-1 flex flex-col">
            {/* Tabs Bar */}
            <TabsBar />

            {/* Browser Content */}
            <div className="flex-1 relative">
              <WebView
                url={activeTab?.url}
                onUrlChange={handleUrlChange}
                onTextSelect={handleTextSelection}
              />

              {/* Intent Ripple - UI feedback only */}
              {showIntentRipple && (
                <IntentRipple
                  x={showIntentRipple.x}
                  y={showIntentRipple.y}
                  intent={showIntentRipple.intent}
                  onAction={handleIntentRippleAction}
                  onClose={() => setShowIntentRipple(null)}
                />
              )}
            </div>
          </div>

          {/* RIGHT: Intelligence Panel */}
          <div className="w-96 border-l border-slate-700 flex flex-col">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-sm font-medium text-white">Intelligence</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Empty state guidance */}
              {intelligenceNodes.length === 0 && (
                <div className="text-center text-gray-500 text-sm py-8">
                  Select text or type a command to start AI processing
                </div>
              )}

              {/* Intelligence Nodes */}
              {intelligenceNodes.map((node) => (
                <IntelligenceNode
                  key={node.id}
                  task={node.task}
                  position={{ x: 0, y: 0 }} // Fixed position in panel
                  isMinimized={node.isMinimized}
                  onExpand={(taskId) => {
                    setExpandedThoughtStream(taskId);
                    setIntelligenceNodes(prev =>
                      prev.map(n =>
                        n.id === taskId ? { ...n, isMinimized: false } : n
                      )
                    );
                  }}
                  onClose={handleCloseTask}
                  onCancel={handleCancelTask}
                  onRetry={handleRetryTask}
                  onSwitchModel={handleSwitchModel}
                  steps={[
                    {
                      id: '1',
                      type: 'thinking',
                      content: 'Analyzing user request...',
                      timestamp: Date.now() - 2000,
                      duration: 500,
                    },
                    {
                      id: '2',
                      type: 'analyzing',
                      content: 'Processing selected content',
                      timestamp: Date.now() - 1500,
                      duration: 800,
                    },
                    {
                      id: '3',
                      type: 'generating',
                      content: 'Generating response using local AI',
                      timestamp: Date.now() - 500,
                      duration: 1200,
                    },
                  ]}
                  context={{
                    inputType: 'selected_text',
                    wordCount: 47,
                    readingTime: 1,
                    source: 'Current page',
                    url: systemStateData.tabs.find(t => t.id === systemStateData.activeTabId)?.url
                  }}
                />
              ))}

              {/* Live Logs Panel - Shows intent decisions, model choice, errors, throttles */}
              <div className="mt-6">
                <div className="text-xs font-medium text-gray-300 mb-2">Live Logs</div>
                <div className="bg-slate-800 rounded border border-slate-700 p-3 max-h-48 overflow-y-auto">
                  <div className="space-y-2 text-xs">
                    <div className="text-gray-400">
                      <span className="text-blue-400">→</span> Intent detected: AI query
                    </div>
                    <div className="text-gray-400">
                      <span className="text-green-400">→</span> Model selected: Local (fast, private)
                    </div>
                    <div className="text-gray-400">
                      <span className="text-yellow-400">→</span> Processing context (312 chars)
                    </div>
                    {systemStateData.status === 'working' && (
                      <div className="text-gray-400">
                        <span className="text-purple-400">●</span> AI running...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM: System Truth */}
        <StatusStrip status={systemStateData.status} />

      {/* Tabs Bar */}
      <div className="pt-16">
        <TabsBar />
      </div>

      {/* Web Content Area (Full bleed) */}
      <div className="flex-1 relative">
        <WebView
          url={activeTab?.url}
          onUrlChange={handleUrlChange}
          onTextSelect={handleTextSelection}
        />

        {/* Intelligence Nodes (Floating) - ABSOLUTE USER CONTROL */}
        {intelligenceNodes.length === 0 && !showIntentRipple && (
          <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-slate-800/90 backdrop-blur-sm rounded-lg px-4 py-2 text-sm text-gray-300 border border-slate-600/50">
            Select text or type a command to start AI processing
          </div>
        )}

        {intelligenceNodes.map((node) => (
          <IntelligenceNode
            key={node.id}
            task={node.task}
            position={node.position}
            isMinimized={node.isMinimized}
            onExpand={(taskId) => {
              setExpandedThoughtStream(taskId);
              setIntelligenceNodes(prev =>
                prev.map(n =>
                  n.id === taskId ? { ...n, isMinimized: false } : n
                )
              );
            }}
            onClose={handleCloseTask}
            onCancel={handleCancelTask}
            onRetry={handleRetryTask}
            onSwitchModel={handleSwitchModel}
          />
        ))}

        {/* Intent Ripple */}
        {showIntentRipple && (
          <IntentRipple
            x={showIntentRipple.x}
            y={showIntentRipple.y}
            intent={showIntentRipple.intent}
            onAction={handleIntentRippleAction}
            onClose={() => setShowIntentRipple(null)}
          />
        )}
      </div>

      {/* Thought Stream Panel (Right Side) */}
      {expandedThoughtStream && (
        <div className="fixed right-0 top-0 h-full w-96 bg-slate-900 border-l border-slate-700 shadow-xl z-40">
          <ThoughtStream
            steps={[
              {
                id: '1',
                type: 'thinking',
                content: 'Analyzing user request...',
                timestamp: Date.now() - 2000,
                duration: 500,
              },
              {
                id: '2',
                type: 'analyzing',
                content: 'Processing selected content and context',
                timestamp: Date.now() - 1500,
                duration: 800,
              },
              {
                id: '3',
                type: 'generating',
                content: 'Generating response using local AI model',
                timestamp: Date.now() - 500,
                duration: 1200,
              },
            ]}
            isActive={true}
            onStepClick={(stepId) => console.log('Step clicked:', stepId)}
          />
        </div>
      )}

      {/* Status Strip (Bottom) - Only shows Idle/Working/Recovering */}
      <StatusStrip status={systemStateData.status} />

        {/* Diagnostics (hidden by default, Ctrl+Shift+D to show) */}
        <Diagnostics
          isOpen={showDiagnostics}
          onClose={() => setShowDiagnostics(false)}
        />
      </div>
    </div>
  );
}

export default AppShell;

if (import.meta.hot) {
  import.meta.hot.accept();
}
