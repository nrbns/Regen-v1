/**
 * QuickAccessEditor - Edit, add, remove, and reorder quick access icons
 */
interface QuickAccessSite {
    id: string;
    url: string;
    title: string;
    favicon?: string;
    icon?: string;
    notificationCount?: number;
}
interface QuickAccessEditorProps {
    sites: QuickAccessSite[];
    onUpdate: (sites: QuickAccessSite[]) => void;
    isOpen: boolean;
    onClose: () => void;
}
export declare function QuickAccessEditor({ sites, onUpdate, isOpen, onClose }: QuickAccessEditorProps): import("react/jsx-runtime").JSX.Element;
export {};
