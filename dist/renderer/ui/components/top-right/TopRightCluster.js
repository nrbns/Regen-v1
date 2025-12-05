import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { CircleHelp, MessageSquare, Workflow } from 'lucide-react';
import { NotificationsMenu } from './NotificationsMenu';
import { ProfileMenu } from './ProfileMenu';
import { SettingsMenu } from './SettingsMenu';
import { FeaturesMenu } from './FeaturesMenu';
import { FeedbackModal } from '../../../components/FeedbackModal';
import { SystemStatusPanel } from '../../../components/SystemStatusPanel';
import { LanguageSwitcher } from '../../../components/layout/LanguageSwitcher';
import { WorkflowMarketplace } from '../../../components/workflows/WorkflowMarketplace';
export function TopRightCluster() {
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [workflowMarketplaceOpen, setWorkflowMarketplaceOpen] = useState(false);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(LanguageSwitcher, {}), _jsx(SystemStatusPanel, {}), _jsx(NotificationsMenu, {}), _jsx(FeaturesMenu, {}), _jsx(SettingsMenu, {}), _jsx("button", { type: "button", "aria-label": "Open workflow marketplace", className: "rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-500)]", onClick: () => setWorkflowMarketplaceOpen(true), title: "Workflow Marketplace", children: _jsx(Workflow, { className: "h-5 w-5", "aria-hidden": true }) }), _jsx("button", { type: "button", "aria-label": "Send feedback", className: "rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-500)]", onClick: () => setFeedbackOpen(true), children: _jsx(MessageSquare, { className: "h-5 w-5", "aria-hidden": true }) }), _jsx("button", { type: "button", "aria-label": "Open help or command palette", className: "rounded-lg p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-500)]", onClick: () => {
                            window.dispatchEvent(new CustomEvent('commandbar:open'));
                        }, children: _jsx(CircleHelp, { className: "h-5 w-5", "aria-hidden": true }) }), _jsx(ProfileMenu, {})] }), _jsx(FeedbackModal, { open: feedbackOpen, onClose: () => setFeedbackOpen(false) }), _jsx(WorkflowMarketplace, { open: workflowMarketplaceOpen, onClose: () => setWorkflowMarketplaceOpen(false) })] }));
}
