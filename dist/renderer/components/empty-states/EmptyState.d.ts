/**
 * Empty State Components - Tier 3
 * Helpful empty states instead of dead UI
 */
import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
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
export declare function EmptyState({ icon: Icon, title, description, action, illustration, }: EmptyStateProps): import("react/jsx-runtime").JSX.Element;
export declare const EmptyStates: {
    NoTabs: () => import("react/jsx-runtime").JSX.Element;
    NoBookmarks: () => import("react/jsx-runtime").JSX.Element;
    NoWorkspaces: () => import("react/jsx-runtime").JSX.Element;
    NoAgentRuns: () => import("react/jsx-runtime").JSX.Element;
    NoDocuments: ({ onUpload }: {
        onUpload: (files: FileList | null) => void;
    }) => import("react/jsx-runtime").JSX.Element;
    NoSearchResults: (query: string) => import("react/jsx-runtime").JSX.Element;
};
export {};
