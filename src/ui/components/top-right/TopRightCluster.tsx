import React, { useState } from 'react';
import { CircleHelp, MessageSquare, Workflow, PanelRight } from 'lucide-react';
import { useAppStore } from '../../../state/appStore';

import { NotificationsMenu } from './NotificationsMenu';
import { ProfileMenu } from './ProfileMenu';
import { SettingsMenu } from './SettingsMenu';
import { FeaturesMenu } from './FeaturesMenu';
import { FeedbackModal } from '../../../components/common/FeedbackModal';
import { SystemStatusPanel } from '../../../components/settings/SystemStatusPanel';
import { LanguageSwitcher } from '../../../components/layout/LanguageSwitcher';
import { WorkflowMarketplace } from '../../../components/workflows/WorkflowMarketplace';

export function TopRightCluster() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [workflowMarketplaceOpen, setWorkflowMarketplaceOpen] = useState(false);
  const { regenSidebarOpen, setRegenSidebarOpen } = useAppStore();

  return (
    <>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <SystemStatusPanel />
        <NotificationsMenu />
        {/* Regen Sidebar Toggle - Direct UI control (minimal requirement) */}
        <button
          type="button"
          aria-label={regenSidebarOpen ? 'Hide Regen sidebar' : 'Show Regen sidebar'}
          title={`Toggle Regen Sidebar (Ctrl+B)`}
          className={`rounded-lg p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-500)] ${
            regenSidebarOpen
              ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          onClick={() => setRegenSidebarOpen(!regenSidebarOpen)}
        >
          <PanelRight className="h-5 w-5" aria-hidden />
        </button>
        <FeaturesMenu />
        <SettingsMenu />
        {/* Workflow Marketplace Button */}
        <button
          type="button"
          aria-label="Open workflow marketplace"
          className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] focus-visible:ring-offset-2"
          onClick={() => setWorkflowMarketplaceOpen(true)}
          title="Workflow Marketplace"
        >
          <Workflow className="h-5 w-5" aria-hidden />
        </button>
        {/* Tier 2: Feedback Button */}
        <button
          type="button"
          aria-label="Send feedback"
          className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] focus-visible:ring-offset-2"
          onClick={() => setFeedbackOpen(true)}
        >
          <MessageSquare className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Open help or command palette"
          className="rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] focus-visible:ring-offset-2"
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
      {/* Workflow Marketplace */}
      <WorkflowMarketplace
        open={workflowMarketplaceOpen}
        onClose={() => setWorkflowMarketplaceOpen(false)}
      />
    </>
  );
}
