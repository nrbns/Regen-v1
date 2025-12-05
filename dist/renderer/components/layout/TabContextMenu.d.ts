/**
 * TabContextMenu - Right-click menu for tab actions (Ghost, Burn, etc.)
 */
interface TabContextMenuProps {
    tabId: string;
    url: string;
    containerId?: string;
    containerName?: string;
    containerColor?: string;
    mode?: 'normal' | 'ghost' | 'private';
    sleeping?: boolean;
    onClose: () => void;
}
export declare function TabContextMenu({ tabId, url, containerId, containerName, containerColor, mode, sleeping, onClose, }: TabContextMenuProps): import("react/jsx-runtime").JSX.Element;
export {};
