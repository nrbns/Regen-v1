/**
 * SmartActionButton - AI-generated action button with visual feedback
 * Based on Figma UI/UX Prototype Flow redesign
 */
export type SmartActionType = 'navigate' | 'openTab' | 'duplicateTab' | 'notes' | 'research' | 'copy' | 'search';
export interface SmartAction {
    id: string;
    type: SmartActionType;
    label: string;
    description?: string;
    icon?: React.ReactNode;
    onClick: () => void | Promise<void>;
}
export interface SmartActionButtonProps {
    action: SmartAction;
    compact?: boolean;
}
export declare function SmartActionButton({ action, compact }: SmartActionButtonProps): import("react/jsx-runtime").JSX.Element;
export interface SmartActionGroupProps {
    actions: SmartAction[];
    compact?: boolean;
    className?: string;
}
export declare function SmartActionGroup({ actions, compact, className, }: SmartActionGroupProps): import("react/jsx-runtime").JSX.Element | null;
