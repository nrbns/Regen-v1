import React, { useState } from 'react';
import { usePageActions } from '../../hooks/usePageActions';

export default function IntentBadge(): JSX.Element {
  const { loading: pageActionsLoading } = usePageActions();
  const [selectedText, setSelectedText] = useState<string>('');
  const [detectedIntent, setDetectedIntent] = useState<string>('READY');
  const [isProcessing, setIsProcessing] = useState(false);

  // Listen for text selection
  React.useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || '';
      setSelectedText(text);

      if (text) {
        // Detect intent immediately when text is selected
        const regenTaskService = (window as any).regenTaskService;
        if (regenTaskService) {
          regenTaskService.processUserInput(text).then((task: any) => {
            const intentType = task.intent.split(':')[0];
            setDetectedIntent(intentType.toUpperCase());
          }).catch((error: any) => {
            console.warn('[IntentBadge] Intent detection failed:', error);
            setDetectedIntent('UNKNOWN');
          });
        } else {
          setDetectedIntent('LOADING');
        }
      } else {
        setDetectedIntent('READY');
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const handleDemoAction = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const demoIntent = selectedText || "Show me a real-time AI demo";
      const regenTaskService = (window as any).regenTaskService;
      if (regenTaskService) {
        await regenTaskService.processUserInput(demoIntent);
      }
    } catch (error) {
      console.error('[IntentBadge] Demo action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const isLoading = pageActionsLoading || isProcessing;

  return (
    <div className="p-2 border-b border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400">✨</span>
          <span className="text-sm font-medium">
            Intent: {detectedIntent}
          </span>
        </div>

        <button
          onClick={handleDemoAction}
          disabled={isLoading}
          className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded text-xs font-medium transition-colors"
        >
          <span>▶</span>
          {isLoading ? 'Processing...' : 'Run'}
        </button>
      </div>

      {selectedText && (
        <div className="mt-1 text-xs text-slate-400 truncate">
          Selected: "{selectedText.slice(0, 50)}{selectedText.length > 50 ? '...' : ''}"
        </div>
      )}
    </div>
  );
}
