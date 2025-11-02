/**
 * Citation Graph Service
 * Extracts and manages citation relationships (URLs → Entities → Claims)
 */

import { getOllamaAdapter } from '../agent/ollama-adapter';

export interface CitationNode {
  id: string;
  type: 'url' | 'entity' | 'claim';
  label: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface CitationEdge {
  id: string;
  source: string;
  target: string;
  type: 'cites' | 'mentions' | 'relates_to';
  weight?: number;
}

export interface CitationGraph {
  nodes: CitationNode[];
  edges: CitationEdge[];
}

export class CitationGraphService {
  private graph: CitationGraph = { nodes: [], edges: [] };
  private nodeMap = new Map<string, CitationNode>();
  private edgeMap = new Map<string, CitationEdge>();

  /**
   * Add or update a URL node
   */
  addUrl(url: string, title?: string, metadata?: Record<string, unknown>): string {
    const nodeId = `url:${url}`;
    
    if (!this.nodeMap.has(nodeId)) {
      const node: CitationNode = {
        id: nodeId,
        type: 'url',
        label: title || url,
        url,
        metadata,
      };
      this.nodeMap.set(nodeId, node);
      this.graph.nodes.push(node);
    }

    return nodeId;
  }

  /**
   * Add or update an entity node
   */
  addEntity(name: string, metadata?: Record<string, unknown>): string {
    const nodeId = `entity:${name}`;
    
    if (!this.nodeMap.has(nodeId)) {
      const node: CitationNode = {
        id: nodeId,
        type: 'entity',
        label: name,
        metadata,
      };
      this.nodeMap.set(nodeId, node);
      this.graph.nodes.push(node);
    }

    return nodeId;
  }

  /**
   * Add or update a claim node
   */
  addClaim(text: string, sourceUrl?: string): string {
    const nodeId = `claim:${this.hashClaim(text)}`;
    
    if (!this.nodeMap.has(nodeId)) {
      const node: CitationNode = {
        id: nodeId,
        type: 'claim',
        label: text.substring(0, 100),
        metadata: { fullText: text, sourceUrl },
      };
      this.nodeMap.set(nodeId, node);
      this.graph.nodes.push(node);
    }

    return nodeId;
  }

  /**
   * Add an edge between nodes
   */
  addEdge(sourceId: string, targetId: string, type: CitationEdge['type'] = 'relates_to', weight = 1): string {
    const edgeId = `${sourceId}->${targetId}:${type}`;
    
    if (!this.edgeMap.has(edgeId)) {
      const edge: CitationEdge = {
        id: edgeId,
        source: sourceId,
        target: targetId,
        type,
        weight,
      };
      this.edgeMap.set(edgeId, edge);
      this.graph.edges.push(edge);
    } else {
      // Update weight if edge exists
      const existing = this.edgeMap.get(edgeId)!;
      existing.weight = (existing.weight || 1) + weight;
    }

    return edgeId;
  }

  /**
   * Extract citations from text using LLM
   */
  async extractFromText(text: string, sourceUrl?: string): Promise<void> {
    const ollama = getOllamaAdapter();
    const isAvailable = await ollama.checkAvailable();

    if (!isAvailable) {
      // Fallback: simple extraction
      this.addClaim(text, sourceUrl);
      if (sourceUrl) {
        const urlNodeId = this.addUrl(sourceUrl);
        const claimNodeId = this.addClaim(text, sourceUrl);
        this.addEdge(urlNodeId, claimNodeId, 'cites');
      }
      return;
    }

    // Use LLM to extract entities and claims
    const citations = await ollama.extractCitations(text, sourceUrl);

    // Add source URL node
    if (sourceUrl) {
      const urlNodeId = this.addUrl(sourceUrl);
      
      for (const citation of citations) {
        const claimNodeId = this.addClaim(citation.claim, citation.citation || sourceUrl);
        this.addEdge(urlNodeId, claimNodeId, 'cites');

        // Extract entities from claim (simple heuristic)
        const entities = this.extractEntities(citation.claim);
        for (const entity of entities) {
          const entityNodeId = this.addEntity(entity);
          this.addEdge(claimNodeId, entityNodeId, 'mentions');
        }
      }
    }
  }

  /**
   * Get the graph
   */
  getGraph(): CitationGraph {
    return { ...this.graph };
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
  <graph id="citation-graph" edgedefault="directed">`;

    const nodes = this.graph.nodes.map(n => {
      const attrs = [
        `<data key="type">${n.type}</data>`,
        `<data key="label">${this.escapeXml(n.label)}</data>`,
        n.url ? `<data key="url">${this.escapeXml(n.url)}</data>` : '',
      ].filter(Boolean).join('\n        ');
      return `    <node id="${n.id}">\n        ${attrs}\n    </node>`;
    }).join('\n');

    const edges = this.graph.edges.map(e => {
      const weight = e.weight ? ` weight="${e.weight}"` : '';
      return `    <edge id="${e.id}" source="${e.source}" target="${e.target}"${weight}/>`;
    }).join('\n');

    const footer = `  </graph>
</graphml>`;

    return `${header}\n${nodes}\n${edges}\n${footer}`;
  }

  /**
   * Export as JSON
   */
  exportJSON(): string {
    return JSON.stringify(this.graph, null, 2);
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.graph = { nodes: [], edges: [] };
    this.nodeMap.clear();
    this.edgeMap.clear();
  }

  private hashClaim(text: string): string {
    // Simple hash for claim ID
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private extractEntities(text: string): string[] {
    // Simple entity extraction (in production, use NER)
    const entities: string[] = [];
    // Extract capitalized phrases
    const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
    if (matches) {
      entities.push(...matches.filter(e => e.length > 3));
    }
    return entities;
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
let citationGraphInstance: CitationGraphService | null = null;

export function getCitationGraph(): CitationGraphService {
  if (!citationGraphInstance) {
    citationGraphInstance = new CitationGraphService();
  }
  return citationGraphInstance;
}

