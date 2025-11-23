import React, { useState } from 'react';
import { CircleHelp, MessageSquare } from 'lucide-react';

import { NotificationsMenu } from './NotificationsMenu';
import { ProfileMenu } from './ProfileMenu';
import { SettingsMenu } from './SettingsMenu';
import { FeedbackModal } from '../../../components/FeedbackModal';
import { SystemStatusPanel } from '../../../components/SystemStatusPanel';

export function TopRightCluster() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <SystemStatusPanel />
        <NotificationsMenu />
        <SettingsMenu />
        {/* Tier 2: Feedback Button */}
        <button
          type="button"
          aria-label="Send feedback"
          className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-500)]"
          onClick={() => setFeedbackOpen(true)}
        >
          <MessageSquare className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Open help or command palette"
          className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-500)]"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('commandbar:open'));
          }}
        >
          <CircleHelp className="h-5 w-5" aria-hidden />
        </button>
        <ProfileMenu />
      </div>
      {/* Tier 2: Feedback Modal */}
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}
