// Regen Personal Memory Engine
// Phase 2: Intent log, decision history, extracted facts, vector recall

export type IntentLogEntry = {
  id: string;
  userId: string;
  intent: string;
  timestamp: number;
  context?: Record<string, any>;
};

export type DecisionHistoryEntry = {
  id: string;
  userId: string;
  decision: string;
  reason?: string;
  timestamp: number;
  context?: Record<string, any>;
};

export type ExtractedFact = {
  id: string;
  userId: string;
  fact: string;
  source?: string;
  timestamp: number;
};

export type VectorMemoryEntry = {
  id: string;
  userId: string;
  embedding: number[];
  text: string;
  timestamp: number;
};

export class PersonalMemoryEngine {
  private intentLog: IntentLogEntry[] = [];
  private decisionHistory: DecisionHistoryEntry[] = [];
  private facts: ExtractedFact[] = [];
  private vectorMemory: VectorMemoryEntry[] = [];

  logIntent(entry: IntentLogEntry) {
    this.intentLog.push(entry);
  }

  logDecision(entry: DecisionHistoryEntry) {
    this.decisionHistory.push(entry);
  }

  addFact(fact: ExtractedFact) {
    this.facts.push(fact);
  }

  addVectorMemory(entry: VectorMemoryEntry) {
    this.vectorMemory.push(entry);
  }

  getIntentLog(userId: string) {
    return this.intentLog.filter(e => e.userId === userId);
  }

  getDecisionHistory(userId: string) {
    return this.decisionHistory.filter(e => e.userId === userId);
  }

  getFacts(userId: string) {
    return this.facts.filter(e => e.userId === userId);
  }

  getVectorMemory(userId: string) {
    return this.vectorMemory.filter(e => e.userId === userId);
  }

  // Example: recall by vector similarity (simple dot product)
  recallByVector(userId: string, queryEmbedding: number[], topK = 5) {
    return this.vectorMemory
      .filter(e => e.userId === userId)
      .map(e => ({
        ...e,
        similarity: dotProduct(e.embedding, queryEmbedding),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
}

function dotProduct(a: number[], b: number[]) {
  return a.reduce((sum, v, i) => sum + v * (b[i] || 0), 0);
}
