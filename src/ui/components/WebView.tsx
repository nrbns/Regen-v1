import React, { useState, useEffect } from 'react';
import { FloatingAction } from './FloatingAction';
import { ContextMenu } from './ContextMenu';
import { IPCHandler } from '../../backend/ipc/events';

interface WebViewProps {
  url?: string;
  onUrlChange?: (url: string) => void;
}

export function WebView({ url, onUrlChange }: WebViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [floatingAction, setFloatingAction] = useState<{ x: number; y: number; text: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Handle text selection for AI analysis
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      if (selectedText && selectedText.length > 10) {
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();

        if (rect) {
          setFloatingAction({
            x: rect.left + (rect.width / 2),
            y: rect.top,
            text: selectedText,
          });
        }
      } else {
        setFloatingAction(null);
      }
    };

    const handleClick = () => {
      // Close floating action when clicking elsewhere
      setFloatingAction(null);
      setContextMenu(null);
    };

    const handleContextMenu = (e: MouseEvent) => {
      // Only show context menu if we're on the welcome screen or there's selected text
      if (!url || url === 'regen://home') {
        setContextMenu({ x: e.clientX, y: e.clientY });
        e.preventDefault();
      } else {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();
        if (selectedText && selectedText.length > 5) {
          setContextMenu({ x: e.clientX, y: e.clientY });
          e.preventDefault();
        }
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('selectionchange', handleSelection);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const handleAnalyzeSelection = () => {
    if (floatingAction) {
      // Use IPC to send AI task
      IPCHandler.runAI(`Analyze this text: ${floatingAction.text}`);
      console.log('AI analysis triggered for selected text');
    }
    setFloatingAction(null);
  };

  const closeFloatingAction = () => {
    setFloatingAction(null);
  };

  const handleContextMenuAction = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (selectedText && selectedText.length > 5) {
      IPCHandler.runAI(`Analyze this text: ${selectedText}`);
    } else {
      // On welcome screen, just open AI
      IPCHandler.runAI("Hello, I need help with browsing.");
    }
  };

  // Show welcome screen when no URL
  if (!url) {
    return (
      <div className="flex-1 flex flex-col bg-slate-900">
        {/* Main content - slightly offset from center */}
        <div className="flex-1 flex items-start justify-center pt-16">
          <div className="text-center max-w-lg mx-auto px-8">
            {/* Purpose statement */}
            <p className="text-lg text-gray-200 mb-6 leading-relaxed font-medium">
              A calm, local-first browser that runs AI on your device.
            </p>

            {/* Capability signal (passive) */}
            <div className="text-sm text-gray-500 mb-6 text-center">
              Browse normally · Ask questions · Analyze pages · Works offline
            </div>

            {/* Quiet guide - less structured */}
            <div className="text-left space-y-2 text-gray-400">
              <div className="text-sm text-gray-300 mb-3">
                Getting started
              </div>
              <div className="space-y-1.5 text-sm">
                <div>Type a website or search term above</div>
                <div>Browse normally — AI stays idle unless you ask</div>
                <div>Select text anytime for local AI assistance</div>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle proof of life indicator */}
        <div className="px-6 py-3 text-right">
          <div className="text-xs text-gray-600 flex items-center justify-end gap-1.5">
            <div className="w-1.5 h-1.5 bg-green-600/70 rounded-full"></div>
            <span>Ready</span>
          </div>
        </div>

        {/* Floating AI Action */}
        {floatingAction && (
          <FloatingAction
            x={floatingAction.x}
            y={floatingAction.y}
            selectedText={floatingAction.text}
            onAnalyze={handleAnalyzeSelection}
            onClose={closeFloatingAction}
          />
        )}

      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      {isLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          Loading...
        </div>
      )}

      <iframe
        src={url}
        className="w-full h-full border-0"
        title="Regen Browser Content"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-navigation"
        onLoad={() => setIsLoading(false)}
        onLoadStart={() => setIsLoading(true)}
      />

      {/* Floating AI Action */}
      {floatingAction && (
        <FloatingAction
          x={floatingAction.x}
          y={floatingAction.y}
          selectedText={floatingAction.text}
          onAnalyze={handleAnalyzeSelection}
          onClose={closeFloatingAction}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onAskRegen={handleContextMenuAction}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
