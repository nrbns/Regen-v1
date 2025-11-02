/**
 * History Graph - Autosave browsing trail visualization
 */

export interface HistoryNode {
  id: string;
  type: 'url' | 'note' | 'export' | 'action';
  label: string;
  url?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface HistoryEdge {
  source: string;
  target: string;
  type: 'navigate' | 'cite' | 'export' | 'note';
  timestamp: number;
}

export interface HistoryGraph {
  nodes: HistoryNode[];
  edges: HistoryEdge[];
}

export class HistoryGraphService {
  private graph: HistoryGraph = { nodes: [], edges: [] };
  private nodeMap = new Map<string, HistoryNode>();
  private readonly MAX_NODES = 5000;

  /**
   * Record a navigation event
   */
  recordNavigation(fromUrl: string | null, toUrl: string, title?: string): void {
    const timestamp = Date.now();

    // Add target node
    const toNodeId = this.getOrCreateUrlNode(toUrl, title || toUrl, timestamp);

    // Add edge from previous node
    if (fromUrl) {
      const fromNodeId = this.getOrCreateUrlNode(fromUrl, fromUrl, timestamp - 1);
      this.addEdge(fromNodeId, toNodeId, 'navigate', timestamp);
    }
  }

  /**
   * Record a citation link
   */
  recordCitation(sourceUrl: string, targetUrl: string): void {
    const sourceNodeId = this.getOrCreateUrlNode(sourceUrl, sourceUrl);
    const targetNodeId = this.getOrCreateUrlNode(targetUrl, targetUrl);
    this.addEdge(sourceNodeId, targetNodeId, 'cite', Date.now());
  }

  /**
   * Record an export action
   */
  recordExport(sourceUrl: string, exportType: string, filename: string): void {
    const sourceNodeId = this.getOrCreateUrlNode(sourceUrl, sourceUrl);
    const exportNodeId = `export:${filename}`;
    
    if (!this.nodeMap.has(exportNodeId)) {
      const node: HistoryNode = {
        id: exportNodeId,
        type: 'export',
        label: filename,
        timestamp: Date.now(),
        metadata: { type: exportType },
      };
      this.nodeMap.set(exportNodeId, node);
      this.graph.nodes.push(node);
      this.trimNodes();
    }

    this.addEdge(sourceNodeId, exportNodeId, 'export', Date.now());
  }

  /**
   * Record a note action
   */
  recordNote(url: string, noteText: string): void {
    const urlNodeId = this.getOrCreateUrlNode(url, url);
    const noteNodeId = `note:${this.hashString(noteText)}`;
    
    if (!this.nodeMap.has(noteNodeId)) {
      const node: HistoryNode = {
        id: noteNodeId,
        type: 'note',
        label: noteText.substring(0, 50),
        timestamp: Date.now(),
        metadata: { fullText: noteText },
      };
      this.nodeMap.set(noteNodeId, node);
      this.graph.nodes.push(node);
      this.trimNodes();
    }

    this.addEdge(urlNodeId, noteNodeId, 'note', Date.now());
  }

  /**
   * Get graph for visualization
   */
  getGraph(): HistoryGraph {
    return {
      nodes: [...this.graph.nodes],
      edges: [...this.graph.edges],
    };
  }

  /**
   * Get graph for specific time range
   */
  getGraphInRange(startTime: number, endTime: number): HistoryGraph {
    const nodes = this.graph.nodes.filter(n => 
      n.timestamp >= startTime && n.timestamp <= endTime
    );
    const nodeIds = new Set(nodes.map(n => n.id));
    
    const edges = this.graph.edges.filter(e =>
      nodeIds.has(e.source) && nodeIds.has(e.target) &&
      e.timestamp >= startTime && e.timestamp <= endTime
    );

    return { nodes, edges };
  }

  /**
   * Export as GraphML
   */
  exportGraphML(): string {
    const header = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="type" for="node" attr.name="type" attr.type="string"/>
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="url" for="node" attr.name="url" attr.type="string"/>
  <key id="timestamp" for="node" attr.name="timestamp" attr.type="long"/>
  <graph id="history-graph" edgedefault="directed">`;

    const nodes = this.graph.nodes.map(n => {
      const attrs = [
        `<data key="type">${n.type}</data>`,
        `<data key="label">${this.escapeXml(n.label)}</data>`,
        `<data key="timestamp">${n.timestamp}</data>`,
        n.url ? `<data key="url">${this.escapeXml(n.url)}</data>` : '',
      ].filter(Boolean).join('\n        ');
      return `    <node id="${n.id}">\n        ${attrs}\n    </node>`;
    }).join('\n');

    const edges = this.graph.edges.map(e => {
      return `    <edge id="${e.source}->${e.target}" source="${e.source}" target="${e.target}"/>`;
    }).join('\n');

    const footer = `  </graph>
</graphml>`;

    return `${header}\n${nodes}\n${edges}\n${footer}`;
  }

  /**
   * Clear graph
   */
  clear(): void {
    this.graph = { nodes: [], edges: [] };
    this.nodeMap.clear();
  }

  private getOrCreateUrlNode(url: string, label: string, timestamp?: number): string {
    const nodeId = `url:${this.hashString(url)}`;
    
    if (!this.nodeMap.has(nodeId)) {
      const node: HistoryNode = {
        id: nodeId,
        type: 'url',
        label,
        url,
        timestamp: timestamp || Date.now(),
      };
      this.nodeMap.set(nodeId, node);
      this.graph.nodes.push(node);
      this.trimNodes();
    }

    return nodeId;
  }

  private addEdge(source: string, target: string, type: HistoryEdge['type'], timestamp: number): void {
    const edgeId = `${source}->${target}:${type}`;
    const exists = this.graph.edges.some(e => 
      e.source === source && e.target === target && e.type === type
    );

    if (!exists) {
      this.graph.edges.push({ source, target, type, timestamp });
    }
  }

  private trimNodes(): void {
    if (this.graph.nodes.length > this.MAX_NODES) {
      // Keep most recent nodes
      const sorted = [...this.graph.nodes].sort((a, b) => b.timestamp - a.timestamp);
      const toKeep = sorted.slice(0, this.MAX_NODES);
      const toKeepIds = new Set(toKeep.map(n => n.id));

      this.graph.nodes = toKeep;
      this.graph.edges = this.graph.edges.filter(e =>
        toKeepIds.has(e.source) && toKeepIds.has(e.target)
      );
      
      // Update nodeMap
      this.nodeMap.clear();
      for (const node of toKeep) {
        this.nodeMap.set(node.id, node);
      }
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// Singleton instance
let historyGraphInstance: HistoryGraphService | null = null;

export function getHistoryGraphService(): HistoryGraphService {
  if (!historyGraphInstance) {
    historyGraphInstance = new HistoryGraphService();
  }
  return historyGraphInstance;
}

