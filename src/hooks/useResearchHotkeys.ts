import { useEffect } from 'react';
import { useAppStore } from '../state/appStore';
import { useOnboardingStore } from '../state/onboardingStore';
import { toast } from '../utils/toast';
import { exportSessionToFile } from '../lib/session-transfer';

function isCommandKey(event: KeyboardEvent): boolean {
  if (typeof navigator === 'undefined') return event.ctrlKey;
  const isMac = navigator.userAgent.includes('Mac');
  return isMac ? event.metaKey : event.ctrlKey;
}

export function useResearchHotkeys(): void {
  const setMode = useAppStore(state => state.setMode);
  const setResearchPaneOpen = useAppStore(state => state.setResearchPaneOpen);
  const startOnboarding = useOnboardingStore(state => state.start);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!isCommandKey(event)) return;

      const key = event.key.toLowerCase();

      if (event.shiftKey && key === 'r') {
        event.preventDefault();
        setMode('Research');
        setResearchPaneOpen(true);
        toast.success('Research agent ready — type your prompt.');
        return;
      }

      if (event.shiftKey && key === 's') {
        event.preventDefault();
        exportSessionToFile().catch(() => {});
        return;
      }

      if (event.shiftKey && (key === '/' || key === '?')) {
        event.preventDefault();
        startOnboarding();
        toast.info('Launching Research tour…');
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setMode, setResearchPaneOpen, startOnboarding]);
}
