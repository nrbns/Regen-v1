import React from 'react';
import ErrorBanner from './ErrorBanner';
import { useRecoveryNotifications } from '../hooks/useRecoveryNotifications';
import { resumeJob } from '../services/jobs';

export const GlobalErrorBanner: React.FC = () => {
  const { notifications, clear } = useRecoveryNotifications();

  const latest = notifications[0];
  if (!latest) return null;

  async function handleResume() {
    if (!latest.jobId) return;
    try {
      await resumeJob(latest.jobId);
      clear();
    } catch (err) {
      console.warn('[GlobalErrorBanner] resume failed', err);
    }
  }

  return (
    <div className="fixed left-0 right-0 top-0 z-50">
      <ErrorBanner
        message={latest.message || 'A task failed or paused'}
        actionLabel={latest.type === 'failed' ? 'Resume' : 'Dismiss'}
        onAction={latest.type === 'failed' ? handleResume : clear}
        onClose={clear}
      />
    </div>
  );
};

export default GlobalErrorBanner;
