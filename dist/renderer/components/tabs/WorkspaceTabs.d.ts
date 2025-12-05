/**
 * WorkspaceTabs - Day 3: SigmaOS-style nesting/workspaces
 * Supports infinite nesting and workspace organization
 */
interface WorkspaceTabsProps {
    nestLevel?: number;
    maxNestLevel?: number;
}
export declare function WorkspaceTabs({ nestLevel, maxNestLevel }: WorkspaceTabsProps): import("react/jsx-runtime").JSX.Element;
export {};
