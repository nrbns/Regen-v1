/**
 * Cognitive Layer - User Persona Learning
 * Observes browsing patterns and builds cognitive graph
 */

import { getOllamaAdapter } from '../agent/ollama-adapter';

export interface BrowsingPattern {
  url: string;
  domain: string;
  timeSpent: number;
  timestamp: number;
  actions: string[]; // 'read', 'summarize', 'cite', 'export', etc.
  topics?: string[];
}

export interface CognitiveNode {
  id: string;
  type: 'topic' | 'domain' | 'action' | 'habit';
  label: string;
  frequency: number;
  lastSeen: number;
  metadata?: Record<string, unknown>;
}

export interface CognitiveEdge {
  source: string;
  target: string;
  type: 'co_occurs' | 'leads_to' | 'precedes';
  weight: number;
}

export interface CognitiveGraph {
  nodes: CognitiveNode[];
  edges: CognitiveEdge[];
}

export interface Suggestion {
  type: 'action' | 'topic' | 'workflow';
  message: string;
  confidence: number;
}

export class PersonaLearningService {
  private patterns: BrowsingPattern[] = [];
  private graph: CognitiveGraph = { nodes: [], edges: [] };
  private nodeMap = new Map<string, CognitiveNode>();
  private readonly MAX_PATTERNS = 1000;

  /**
   * Record a browsing pattern
   */
  recordPattern(pattern: Omit<BrowsingPattern, 'timestamp'>): void {
    const fullPattern: BrowsingPattern = {
      ...pattern,
      timestamp: Date.now(),
    };

    this.patterns.push(fullPattern);

    // Keep only recent patterns
    if (this.patterns.length > this.MAX_PATTERNS) {
      this.patterns = this.patterns.slice(-this.MAX_PATTERNS);
    }

    // Update cognitive graph
    this.updateGraph(fullPattern);
  }

  /**
   * Get suggestions based on current context
   */
  async getSuggestions(context?: { currentUrl?: string; recentActions?: string[] }): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    // Analyze recent patterns
    const recent = this.patterns.slice(-20);
    
    // Find common workflows
    const workflows = this.detectWorkflows(recent);
    for (const workflow of workflows) {
      if (workflow.confidence > 0.6) {
        suggestions.push({
          type: 'workflow',
          message: workflow.message,
          confidence: workflow.confidence,
        });
      }
    }

    // Find topic suggestions
    const topics = this.extractCommonTopics(recent);
    for (const topic of topics) {
      suggestions.push({
        type: 'topic',
        message: `You often research: ${topic.label}. Continue exploring?`,
        confidence: topic.frequency / recent.length,
      });
    }

    // Find action suggestions
    if (context?.recentActions) {
      const commonNextAction = this.predictNextAction(context.recentActions);
      if (commonNextAction) {
        suggestions.push({
          type: 'action',
          message: `You usually ${commonNextAction} after this. Do it now?`,
          confidence: 0.7,
        });
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  /**
   * Get cognitive graph
   */
  getGraph(): CognitiveGraph {
    return {
      nodes: [...this.graph.nodes],
      edges: [...this.graph.edges],
    };
  }

  /**
   * Get user persona summary
   */
  async getPersonaSummary(): Promise<{ interests: string[]; habits: string[]; patterns: string }> {
    const interests: string[] = [];
    const habits: string[] = [];

    // Extract top topics
    const topicNodes = this.graph.nodes.filter(n => n.type === 'topic');
    topicNodes.sort((a, b) => b.frequency - a.frequency);
    interests.push(...topicNodes.slice(0, 10).map(n => n.label));

    // Extract common actions (habits)
    const actionNodes = this.graph.nodes.filter(n => n.type === 'action');
    actionNodes.sort((a, b) => b.frequency - a.frequency);
    habits.push(...actionNodes.slice(0, 5).map(n => n.label));

    // Generate natural language summary
    const ollama = getOllamaAdapter();
    const isAvailable = await ollama.checkAvailable();
    
    let patterns = 'No patterns detected yet.';
    
    if (isAvailable && this.patterns.length > 10) {
      try {
        const summaryText = `User has browsed ${this.patterns.length} pages. Top interests: ${interests.join(', ')}. Common actions: ${habits.join(', ')}.`;
        patterns = await ollama.summarize(summaryText, 100);
      } catch {
        // Fallback
        patterns = `User shows interest in: ${interests.slice(0, 3).join(', ')}.`;
      }
    }

    return { interests, habits, patterns };
  }

  /**
   * Update cognitive graph with new pattern
   */
  private updateGraph(pattern: BrowsingPattern): void {
    // Add domain node
    const domainNodeId = `domain:${pattern.domain}`;
    let domainNode = this.nodeMap.get(domainNodeId);
    if (!domainNode) {
      domainNode = {
        id: domainNodeId,
        type: 'domain',
        label: pattern.domain,
        frequency: 0,
        lastSeen: pattern.timestamp,
      };
      this.nodeMap.set(domainNodeId, domainNode);
      this.graph.nodes.push(domainNode);
    }
    domainNode.frequency++;
    domainNode.lastSeen = pattern.timestamp;

    // Add action nodes
    for (const action of pattern.actions) {
      const actionNodeId = `action:${action}`;
      let actionNode = this.nodeMap.get(actionNodeId);
      if (!actionNode) {
        actionNode = {
          id: actionNodeId,
          type: 'action',
          label: action,
          frequency: 0,
          lastSeen: pattern.timestamp,
        };
        this.nodeMap.set(actionNodeId, actionNode);
        this.graph.nodes.push(actionNode);
      }
      actionNode.frequency++;
      actionNode.lastSeen = pattern.timestamp;

      // Add edge: domain -> action
      this.addOrUpdateEdge(domainNodeId, actionNodeId, 'leads_to', 1);
    }

    // Add topic nodes if available
    if (pattern.topics) {
      for (const topic of pattern.topics) {
        const topicNodeId = `topic:${topic}`;
        let topicNode = this.nodeMap.get(topicNodeId);
        if (!topicNode) {
          topicNode = {
            id: topicNodeId,
            type: 'topic',
            label: topic,
            frequency: 0,
            lastSeen: pattern.timestamp,
          };
          this.nodeMap.set(topicNodeId, topicNode);
          this.graph.nodes.push(topicNode);
        }
        topicNode.frequency++;
        topicNode.lastSeen = pattern.timestamp;

        // Add edge: domain -> topic
        this.addOrUpdateEdge(domainNodeId, topicNodeId, 'co_occurs', 1);
      }
    }
  }

  /**
   * Detect workflows from patterns
   */
  private detectWorkflows(patterns: BrowsingPattern[]): Array<{ message: string; confidence: number }> {
    const workflows: Array<{ message: string; confidence: number }> = [];

    // Check for common sequences
    const sequences: Map<string, number> = new Map();
    
    for (let i = 0; i < patterns.length - 1; i++) {
      const seq = `${patterns[i].actions.join('+')} → ${patterns[i + 1].actions.join('+')}`;
      sequences.set(seq, (sequences.get(seq) || 0) + 1);
    }

    for (const [seq, count] of sequences.entries()) {
      if (count >= 3) {
        workflows.push({
          message: `You often do: ${seq}`,
          confidence: count / patterns.length,
        });
      }
    }

    return workflows;
  }

  /**
   * Extract common topics
   */
  private extractCommonTopics(patterns: BrowsingPattern[]): Array<{ label: string; frequency: number }> {
    const topicFreq = new Map<string, number>();

    for (const pattern of patterns) {
      if (pattern.topics) {
        for (const topic of pattern.topics) {
          topicFreq.set(topic, (topicFreq.get(topic) || 0) + 1);
        }
      }
    }

    return Array.from(topicFreq.entries())
      .map(([label, frequency]) => ({ label, frequency }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Predict next action
   */
  private predictNextAction(recentActions: string[]): string | null {
    // Find similar patterns in history
    const matches = this.patterns.filter(p => 
      recentActions.every(action => p.actions.includes(action))
    );

    if (matches.length === 0) return null;

    // Find most common next action
    const nextActions = new Map<string, number>();
    for (const match of matches) {
      // Find patterns that came after this
      const idx = this.patterns.indexOf(match);
      if (idx < this.patterns.length - 1) {
        const next = this.patterns[idx + 1];
        for (const action of next.actions) {
          nextActions.set(action, (nextActions.get(action) || 0) + 1);
        }
      }
    }

    if (nextActions.size === 0) return null;

    let maxAction = '';
    let maxCount = 0;
    for (const [action, count] of nextActions.entries()) {
      if (count > maxCount) {
        maxCount = count;
        maxAction = action;
      }
    }

    return maxAction;
  }

  /**
   * Add or update edge
   */
  private addOrUpdateEdge(source: string, target: string, type: CognitiveEdge['type'], weight: number): void {
    const edgeId = `${source}->${target}:${type}`;
    const existing = this.graph.edges.find(e => 
      e.source === source && e.target === target && e.type === type
    );

    if (existing) {
      existing.weight += weight;
    } else {
      this.graph.edges.push({
        source,
        target,
        type,
        weight,
      });
    }
  }

  /**
   * Clear all patterns and graph
   */
  clear(): void {
    this.patterns = [];
    this.graph = { nodes: [], edges: [] };
    this.nodeMap.clear();
  }
}

// Singleton instance
let personaLearningInstance: PersonaLearningService | null = null;

export function getPersonaLearningService(): PersonaLearningService {
  if (!personaLearningInstance) {
    personaLearningInstance = new PersonaLearningService();
  }
  return personaLearningInstance;
}

