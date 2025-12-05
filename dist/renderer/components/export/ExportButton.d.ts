/**
 * Export Button Component
 * One-click export to Notion/Obsidian/Roam
 */
interface ExportButtonProps {
    content: string;
    parentId?: string;
    graphName?: string;
}
export declare function ExportButton({ content, parentId, graphName }: ExportButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
