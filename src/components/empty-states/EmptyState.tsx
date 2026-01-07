/**
 * Empty State Components - Tier 3
 * Helpful empty states instead of dead UI
 */

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, FileText, Star, FolderOpen, Sparkles, Search } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  illustration?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  illustration,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      {illustration ? (
        <div className="mb-6">{illustration}</div>
      ) : (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10">
          <Icon size={48} className="text-purple-300" />
        </div>
      )}
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 max-w-md mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-medium hover:from-purple-600 hover:to-cyan-600 transition-all shadow-lg shadow-purple-500/30"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}

// Pre-built empty states
export const EmptyStates = {
  NoTabs: () => (
    <EmptyState
      icon={FileText}
      title="No tabs open"
      description="Create a new tab to start browsing. Try Research mode for AI-powered insights."
      action={{
        label: 'New Tab',
        onClick: async () => {
          const { ipc } = await import('../../lib/ipc-typed');
          const newTab = await ipc.tabs.create('about:blank');
          if (newTab) {
            const tabId =
              typeof newTab === 'object' && 'id' in newTab
                ? newTab.id
                : typeof newTab === 'string'
                  ? newTab
                  : null;
            if (tabId && typeof tabId === 'string') {
              const { useTabsStore } = await import('../../state/tabsStore');
              useTabsStore.getState().setActive(tabId);
            }
          }
        },
      }}
    />
  ),

  NoBookmarks: () => (
    <EmptyState
      icon={Star}
      title="No bookmarks yet"
      description="Click the star icon in the address bar to bookmark pages you want to revisit."
      action={{
        label: 'Browse',
        onClick: async () => {
          const { ipc } = await import('../../lib/ipc-typed');
          await ipc.tabs.create('https://www.google.com');
        },
      }}
    />
  ),

  NoWorkspaces: () => (
    <EmptyState
      icon={FolderOpen}
      title="No workspaces saved"
      description="Save your current tabs as a workspace to quickly restore your work sessions later."
      action={{
        label: 'Save Current Session',
        onClick: () => {
          // This will be handled by WorkspacesPanel
          const event = new CustomEvent('workspace:save');
          window.dispatchEvent(event);
        },
      }}
    />
  ),

  NoAgentRuns: () => (
    <EmptyState
      icon={Sparkles}
      title="No agent tasks yet"
      description="Try asking OmniAgent to explain a page, research a topic, or compare URLs."
      action={{
        label: 'Try OmniAgent',
        onClick: async () => {
          const { useAppStore } = await import('../../state/appStore');
          await useAppStore.getState().setMode('Research');
        },
      }}
    />
  ),

  NoDocuments: ({ onUpload }: { onUpload: (files: FileList | null) => void }) => (
    <EmptyState
      icon={FileText}
      title="No documents loaded"
      description="Upload PDF, DOCX, or text files to analyze them with AI."
      action={{
        label: 'Upload Documents',
        onClick: () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.accept = '.pdf,.docx,.txt,.md';
          input.onchange = e => {
            const target = e.target as HTMLInputElement;
            onUpload(target.files);
          };
          input.click();
        },
      }}
    />
  ),

  NoSearchResults: (query: string) => (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try different keywords or check your search settings.`}
    />
  ),
};
