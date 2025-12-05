/**
 * Viewport Diff Embedding - Telepathy Upgrade Phase 1
 * Embed only new DOM nodes (saves 90% of embedding calls while scrolling)
 */
interface DOMNode {
    id: string;
    hash: string;
    text: string;
    element: HTMLElement;
}
declare class ViewportDiffEmbedder {
    private lastEmbeddedHashes;
    private embeddedNodes;
    /**
     * Get viewport nodes and diff against last embedded state
     */
    getViewportDiff(tabId: string, viewport: HTMLElement): {
        newNodes: DOMNode[];
        removedNodes: string[];
    };
    /**
     * Extract visible nodes from viewport
     */
    private extractViewportNodes;
    /**
     * Generate stable ID for DOM node
     */
    private generateNodeId;
    /**
     * Hash text for change detection
     */
    private hashText;
    /**
     * Compute viewport hash for change detection
     */
    private computeViewportHash;
    /**
     * Clear state for a tab
     */
    clearTab(tabId: string): void;
}
export declare const viewportDiffEmbedder: ViewportDiffEmbedder;
export {};
