/**
 * CommandBar Component
 * Global slash-driven command/search interface
 * Similar to VS Code's command palette or Spotlight
 */
import React from 'react';
export interface Command {
    id: string;
    label: string;
    description?: string;
    icon?: React.ReactNode;
    shortcut?: string;
    category?: string;
    action: () => void | Promise<void>;
}
export interface CommandBarProps {
    open: boolean;
    commands: Command[];
    onClose: () => void;
    onCommand?: (command: Command) => void;
    placeholder?: string;
    className?: string;
}
/**
 * CommandBar - Global command palette
 *
 * Keyboard shortcuts:
 * - / or Cmd+K / Ctrl+K: Open command bar
 * - Escape: Close
 * - Arrow Up/Down: Navigate
 * - Enter: Execute
 * - Tab: Complete
 */
export declare function CommandBar({ open, commands, onClose, onCommand, placeholder, className, }: CommandBarProps): import("react/jsx-runtime").JSX.Element | null;
