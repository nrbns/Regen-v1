/**
 * EnhancedAIPanel - AI Assistant Panel with Smart Actions and Voice Input
 * Based on Figma UI/UX Prototype Flow redesign
 */
export interface EnhancedAIPanelProps {
    onClose?: () => void;
    initialQuery?: string;
}
export declare function EnhancedAIPanel({ onClose, initialQuery }: EnhancedAIPanelProps): import("react/jsx-runtime").JSX.Element;
