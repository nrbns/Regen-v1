/**
 * Topic Clustering Service
 * Groups related pages/sources via embeddings
 */

import { getOllamaAdapter } from '../agent/ollama-adapter';

export interface Cluster {
  id: string;
  label: string;
  topics: string[];
  sources: Array<{
    url: string;
    title: string;
    similarity: number;
  }>;
  createdAt: number;
}

export interface Embedding {
  text: string;
  url?: string;
  vector: number[];
}

export class ClusteringService {
  private clusters: Cluster[] = [];
  private embeddings: Embedding[] = [];

  /**
   * Generate embedding for text using Ollama
   */
  async generateEmbedding(text: string, url?: string): Promise<number[]> {
    const ollama = getOllamaAdapter();
    const isAvailable = await ollama.checkAvailable();

    if (!isAvailable) {
      // Fallback: simple hash-based embedding
      return this.hashBasedEmbedding(text);
    }

    try {
      // Use Ollama's embedding endpoint
      const response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2',
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama embeddings error: ${response.statusText}`);
      }

      const data = await response.json() as { embedding: number[] };
      const embedding: Embedding = {
        text,
        url,
        vector: data.embedding,
      };
      this.embeddings.push(embedding);
      return data.embedding;
    } catch (error) {
      console.warn('[Clustering] Ollama embedding failed, using hash-based:', error);
      return this.hashBasedEmbedding(text);
    }
  }

  /**
   * Cluster sources by similarity
   */
  async clusterSources(sources: Array<{ url: string; title: string; text?: string }>, threshold = 0.7): Promise<Cluster[]> {
    // Generate embeddings for all sources
    const embeddings: Array<{ source: typeof sources[0]; vector: number[] }> = [];

    for (const source of sources) {
      const text = source.text || `${source.title} ${source.url}`;
      const vector = await this.generateEmbedding(text, source.url);
      embeddings.push({ source, vector });
    }

    // Simple k-means clustering (cosine similarity)
    const clusters: Cluster[] = [];
    const used = new Set<number>();

    for (let i = 0; i < embeddings.length; i++) {
      if (used.has(i)) continue;

      const cluster: Cluster = {
        id: `cluster_${Date.now()}_${i}`,
        label: embeddings[i].source.title.substring(0, 50),
        topics: [],
        sources: [],
        createdAt: Date.now(),
      };

      cluster.sources.push({
        url: embeddings[i].source.url,
        title: embeddings[i].source.title,
        similarity: 1.0,
      });

      // Find similar sources
      for (let j = i + 1; j < embeddings.length; j++) {
        if (used.has(j)) continue;

        const similarity = this.cosineSimilarity(embeddings[i].vector, embeddings[j].vector);
        if (similarity >= threshold) {
          cluster.sources.push({
            url: embeddings[j].source.url,
            title: embeddings[j].source.title,
            similarity,
          });
          used.add(j);
        }
      }

      if (cluster.sources.length > 0) {
        // Extract topics from cluster using LLM
        cluster.topics = await this.extractTopics(cluster.sources.map(s => s.title).join(', '));
        clusters.push(cluster);
        used.add(i);
      }
    }

    this.clusters = clusters;
    return clusters;
  }

  /**
   * Extract topics from cluster using LLM
   */
  private async extractTopics(text: string): Promise<string[]> {
    const ollama = getOllamaAdapter();
    const isAvailable = await ollama.checkAvailable();

    if (!isAvailable) {
      // Fallback: extract keywords
      const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
      return [...new Set(words)].slice(0, 5);
    }

    try {
      const response = await ollama.chat([
        {
          role: 'system',
          content: 'You are a topic extraction assistant. Extract 3-5 key topics from the given text. Return only a comma-separated list of topics.',
        },
        {
          role: 'user',
          content: text,
        },
      ]);

      return response.split(',').map(t => t.trim()).filter(Boolean);
    } catch {
      // Fallback
      const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
      return [...new Set(words)].slice(0, 5);
    }
  }

  /**
   * Compare two clusters
   */
  compareClusters(cluster1Id: string, cluster2Id: string): { similarity: number; commonTopics: string[]; differences: string[] } {
    const cluster1 = this.clusters.find(c => c.id === cluster1Id);
    const cluster2 = this.clusters.find(c => c.id === cluster2Id);

    if (!cluster1 || !cluster2) {
      throw new Error('Cluster not found');
    }

    const commonTopics = cluster1.topics.filter(t => cluster2.topics.includes(t));
    const allTopics = new Set([...cluster1.topics, ...cluster2.topics]);
    const differences = Array.from(allTopics).filter(t => !commonTopics.includes(t));

    // Calculate similarity based on topics and sources
    const topicSim = commonTopics.length / Math.max(cluster1.topics.length, cluster2.topics.length, 1);
    const sourceOverlap = cluster1.sources.filter(s1 => 
      cluster2.sources.some(s2 => s2.url === s1.url)
    ).length;
    const sourceSim = sourceOverlap / Math.max(cluster1.sources.length, cluster2.sources.length, 1);

    return {
      similarity: (topicSim + sourceSim) / 2,
      commonTopics,
      differences,
    };
  }

  /**
   * Get all clusters
   */
  getClusters(): Cluster[] {
    return [...this.clusters];
  }

  /**
   * Clear all clusters
   */
  clear(): void {
    this.clusters = [];
    this.embeddings = [];
  }

  /**
   * Hash-based embedding fallback
   */
  private hashBasedEmbedding(text: string): number[] {
    // Simple hash-based 32-dimensional vector
    const vector: number[] = new Array(32).fill(0);
    for (let i = 0; i < text.length; i++) {
      const hash = text.charCodeAt(i);
      vector[hash % 32] += hash / 255;
    }
    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return vector.map(v => magnitude > 0 ? v / magnitude : 0);
  }

  /**
   * Cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator > 0 ? dotProduct / denominator : 0;
  }
}

// Singleton instance
let clusteringInstance: ClusteringService | null = null;

export function getClusteringService(): ClusteringService {
  if (!clusteringInstance) {
    clusteringInstance = new ClusteringService();
  }
  return clusteringInstance;
}

