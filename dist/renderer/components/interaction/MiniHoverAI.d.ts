/**
 * MiniHoverAI - Hover-based AI assistant for text selection
 * Based on Figma UI/UX Prototype Flow redesign
 */
export interface MiniHoverAIProps {
    enabled?: boolean;
    onAction?: (action: string, text: string) => void;
}
export declare function MiniHoverAI({ enabled, onAction }: MiniHoverAIProps): import("react/jsx-runtime").JSX.Element | null;
