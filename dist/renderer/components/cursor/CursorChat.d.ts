/**
 * Cursor AI Chat Component
 * Displays streaming chat interface with Cursor AI
 */
interface CursorChatProps {
    pageSnapshot?: {
        url: string;
        title: string;
        html?: string;
        text?: string;
    };
    editorState?: {
        filePath: string;
        content: string;
        language?: string;
        cursorLine?: number;
        cursorCol?: number;
    };
    onClose?: () => void;
}
export declare function CursorChat({ pageSnapshot, editorState, onClose }: CursorChatProps): import("react/jsx-runtime").JSX.Element;
export {};
