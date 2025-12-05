/**
 * n8n Workflow Marketplace
 * Browse, share, and install workflows
 */
export interface Workflow {
    id: string;
    name: string;
    description: string;
    author: string;
    category: 'automation' | 'research' | 'trade' | 'productivity' | 'integration';
    language?: string;
    tags: string[];
    downloads: number;
    rating: number;
    workflowUrl?: string;
    workflowId?: string;
    createdAt: number;
    updatedAt: number;
}
interface WorkflowMarketplaceProps {
    open: boolean;
    onClose: () => void;
}
export declare function WorkflowMarketplace({ open, onClose }: WorkflowMarketplaceProps): import("react/jsx-runtime").JSX.Element | null;
export {};
