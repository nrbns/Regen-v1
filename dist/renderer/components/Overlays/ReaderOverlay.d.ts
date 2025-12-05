interface ReaderOverlayProps {
    active: boolean;
    onClose: () => void;
    tabId?: string | null;
    url?: string | null;
}
export declare function ReaderOverlay({ active, onClose, tabId, url }: ReaderOverlayProps): import("react/jsx-runtime").JSX.Element | null;
export {};
