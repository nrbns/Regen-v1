/**
 * Document Viewer - Overlay for viewing full documents with highlighted snippets
 */
interface DocumentViewerProps {
    isOpen: boolean;
    onClose: () => void;
    document: {
        id: string;
        title: string;
        url?: string;
        type: 'tab' | 'pdf' | 'docx' | 'txt' | 'md' | 'html' | 'snapshot' | 'web';
        snippet?: string;
        content?: string;
    };
    highlightText?: string;
}
export declare function DocumentViewer({ isOpen, onClose, document, highlightText }: DocumentViewerProps): import("react/jsx-runtime").JSX.Element | null;
export {};
