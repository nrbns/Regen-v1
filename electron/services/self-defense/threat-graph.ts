/**
 * Threat Intelligence Graph
 * Visualizes connected trackers, suspicious domains, certificate reuses
 */

export interface ThreatNode {
  id: string;
  type: 'domain' | 'tracker' | 'certificate' | 'ip';
  label: string;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

export interface ThreatEdge {
  source: string;
  target: string;
  type: 'tracks' | 'uses' | 'connects_to' | 'shares_cert';
  weight: number;
}

export interface ThreatGraph {
  nodes: ThreatNode[];
  edges: ThreatEdge[];
}

export class ThreatGraphService {
  private graph: ThreatGraph = { nodes: [], edges: [] };
  private nodeMap = new Map<string, ThreatNode>();

  /**
   * Record tracker connection
   */
  recordTracker(domain: string, tracker: string): void {
    const domainNodeId = this.getOrCreateNode('domain', domain, 'medium');
    const trackerNodeId = this.getOrCreateNode('tracker', tracker, 'high');
    this.addEdge(domainNodeId, trackerNodeId, 'tracks', 1);
  }

  /**
   * Record certificate reuse
   */
  recordCertificateReuse(domain1: string, domain2: string, certFingerprint: string): void {
    const node1Id = this.getOrCreateNode('domain', domain1, 'low');
    const node2Id = this.getOrCreateNode('domain', domain2, 'low');
    const certNodeId = this.getOrCreateNode('certificate', certFingerprint.slice(0, 16), 'medium');
    
    this.addEdge(node1Id, certNodeId, 'uses', 1);
    this.addEdge(node2Id, certNodeId, 'uses', 1);
    
    // Mark as suspicious if same cert used by multiple domains
    if (this.getConnectedDomains(certNodeId).length > 2) {
      this.updateThreatLevel(certNodeId, 'high');
    }
  }

  /**
   * Get graph
   */
  getGraph(): ThreatGraph {
    return {
      nodes: [...this.graph.nodes],
      edges: [...this.graph.edges],
    };
  }

  /**
   * Get connected domains for a certificate
   */
  private getConnectedDomains(certNodeId: string): string[] {
    const connected = this.graph.edges
      .filter(e => e.target === certNodeId && e.type === 'uses')
      .map(e => e.source);
    
    return connected.map(nodeId => {
      const node = this.nodeMap.get(nodeId);
      return node?.label || '';
    }).filter(Boolean);
  }

  private getOrCreateNode(type: ThreatNode['type'], label: string, threatLevel: ThreatNode['threatLevel']): string {
    const nodeId = `${type}:${label}`;
    
    if (!this.nodeMap.has(nodeId)) {
      const node: ThreatNode = {
        id: nodeId,
        type,
        label,
        threatLevel,
      };
      this.nodeMap.set(nodeId, node);
      this.graph.nodes.push(node);
    }

    return nodeId;
  }

  private addEdge(source: string, target: string, type: ThreatEdge['type'], weight: number): void {
    const exists = this.graph.edges.some(e =>
      e.source === source && e.target === target && e.type === type
    );

    if (!exists) {
      this.graph.edges.push({ source, target, type, weight });
    }
  }

  private updateThreatLevel(nodeId: string, level: ThreatNode['threatLevel']): void {
    const node = this.nodeMap.get(nodeId);
    if (node) {
      node.threatLevel = level;
    }
  }

  /**
   * Clear graph
   */
  clear(): void {
    this.graph = { nodes: [], edges: [] };
    this.nodeMap.clear();
  }
}

// Singleton instance
let threatGraphInstance: ThreatGraphService | null = null;

export function getThreatGraphService(): ThreatGraphService {
  if (!threatGraphInstance) {
    threatGraphInstance = new ThreatGraphService();
  }
  return threatGraphInstance;
}

