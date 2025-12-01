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

class ViewportDiffEmbedder {
  private lastEmbeddedHashes = new Map<string, string>(); // tabId -> last hash
  private embeddedNodes = new Map<string, Set<string>>(); // tabId -> set of node IDs

  /**
   * Get viewport nodes and diff against last embedded state
   */
  getViewportDiff(
    tabId: string,
    viewport: HTMLElement
  ): {
    newNodes: DOMNode[];
    removedNodes: string[];
  } {
    const currentNodes = this.extractViewportNodes(viewport);
    const currentHash = this.computeViewportHash(currentNodes);
    const lastHash = this.lastEmbeddedHashes.get(tabId) || '';

    // If viewport hasn't changed, return empty diff
    if (currentHash === lastHash) {
      return { newNodes: [], removedNodes: [] };
    }

    const embeddedNodeIds = this.embeddedNodes.get(tabId) || new Set<string>();
    const newNodes = currentNodes.filter(node => !embeddedNodeIds.has(node.id));

    // Update state
    this.lastEmbeddedHashes.set(tabId, currentHash);
    newNodes.forEach(node => embeddedNodeIds.add(node.id));
    this.embeddedNodes.set(tabId, embeddedNodeIds);

    return { newNodes, removedNodes: [] };
  }

  /**
   * Extract visible nodes from viewport
   */
  private extractViewportNodes(viewport: HTMLElement): DOMNode[] {
    const nodes: DOMNode[] = [];
    const walker = document.createTreeWalker(
      viewport,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      {
        acceptNode: node => {
          // Only process visible elements
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
              return NodeFilter.FILTER_REJECT;
            }
            // Only process elements with meaningful text
            const text = el.textContent?.trim() || '';
            if (text.length < 10) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        },
      }
    );

    let node;
    let currentNode: Node | null;
    while ((currentNode = walker.nextNode())) {
      if (currentNode.nodeType === Node.ELEMENT_NODE) {
        const el = currentNode as HTMLElement;
        const text = el.textContent?.trim() || '';
        if (text.length >= 10) {
          nodes.push({
            id: this.generateNodeId(el),
            hash: this.hashText(text),
            text,
            element: el,
          });
        }
      }
    }

    return nodes;
  }

  /**
   * Generate stable ID for DOM node
   */
  private generateNodeId(element: HTMLElement): string {
    // Use data-embed-id if exists, otherwise generate from position
    if (element.dataset.embedId) {
      return element.dataset.embedId;
    }

    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      const parent: HTMLElement | null = current.parentElement;
      if (parent) {
        const index = Array.from(parent.children).indexOf(current);
        path.unshift(`${current.tagName.toLowerCase()}:${index}`);
      }
      current = parent;
    }

    const id = path.join('>');
    element.dataset.embedId = id;
    return id;
  }

  /**
   * Hash text for change detection
   */
  private hashText(text: string): string {
    // Simple hash for change detection
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Compute viewport hash for change detection
   */
  private computeViewportHash(nodes: DOMNode[]): string {
    const hashes = nodes
      .map(n => n.hash)
      .sort()
      .join('|');
    return this.hashText(hashes);
  }

  /**
   * Clear state for a tab
   */
  clearTab(tabId: string): void {
    this.lastEmbeddedHashes.delete(tabId);
    this.embeddedNodes.delete(tabId);
  }
}

export const viewportDiffEmbedder = new ViewportDiffEmbedder();
