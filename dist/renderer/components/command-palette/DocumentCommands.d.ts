/**
 * Document Editing Commands for Command Palette
 * Integrates with GlobalSearch or standalone command system
 */
import { LucideIcon } from 'lucide-react';
export interface DocumentCommand {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    action: () => void;
    keywords: string[];
    category: 'document';
}
export declare function getDocumentCommands(navigate: (path: string) => void): DocumentCommand[];
