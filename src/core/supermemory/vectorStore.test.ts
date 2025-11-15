/**
 * Vector Store Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { vectorStore, searchVectors, saveVector, getVector, deleteVector } from './vectorStore';
import type { Embedding } from './embedding';

describe('Vector Store', () => {
  beforeEach(async () => {
    // Clear store before each test
    await vectorStore.clear();
  });

  describe('save and get', () => {
    it('should save and retrieve embedding', async () => {
      const embedding: Embedding = {
        id: 'test-1',
        eventId: 'event-1',
        vector: [0.1, 0.2, 0.3, 0.4],
        text: 'Test text',
        metadata: { type: 'test' },
        timestamp: Date.now(),
      };

      await saveVector(embedding);
      const retrieved = await getVector('test-1');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(embedding.id);
      expect(retrieved?.text).toBe(embedding.text);
      expect(retrieved?.vector).toEqual(embedding.vector);
    });

    it('should return null for non-existent embedding', async () => {
      const retrieved = await getVector('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('search', () => {
    it('should find similar vectors', async () => {
      // Create test embeddings
      const embeddings: Embedding[] = [
        {
          id: 'emb-1',
          eventId: 'event-1',
          vector: [1, 0, 0, 0],
          text: 'First item',
          timestamp: Date.now(),
        },
        {
          id: 'emb-2',
          eventId: 'event-2',
          vector: [0, 1, 0, 0],
          text: 'Second item',
          timestamp: Date.now(),
        },
        {
          id: 'emb-3',
          eventId: 'event-3',
          vector: [0, 0, 1, 0],
          text: 'Third item',
          timestamp: Date.now(),
        },
      ];

      // Save embeddings
      for (const emb of embeddings) {
        await saveVector(emb);
      }

      // Search with query vector similar to first embedding
      const queryVector = [1, 0, 0, 0];
      const results = await searchVectors(queryVector, { maxVectors: 10, minSimilarity: 0.0 });

      expect(results.length).toBeGreaterThan(0);
      // First result should be most similar (should be emb-1 with similarity ~1.0)
      expect(results[0].embedding.id).toBe('emb-1');
      expect(results[0].similarity).toBeCloseTo(1.0, 1);
    });

    it('should filter by minimum similarity', async () => {
      const embedding: Embedding = {
        id: 'emb-1',
        eventId: 'event-1',
        vector: [1, 0, 0, 0],
        text: 'Test',
        timestamp: Date.now(),
      };

      await saveVector(embedding);

      // Search with orthogonal vector (similarity should be 0)
      const queryVector = [0, 1, 0, 0];
      const results = await searchVectors(queryVector, {
        maxVectors: 10,
        minSimilarity: 0.5, // High threshold
      });

      // Should filter out low similarity results
      expect(results.length).toBe(0);
    });
  });

  describe('delete', () => {
    it('should delete embedding', async () => {
      const embedding: Embedding = {
        id: 'test-delete',
        eventId: 'event-1',
        vector: [0.1, 0.2],
        text: 'To delete',
        timestamp: Date.now(),
      };

      await saveVector(embedding);
      const before = await getVector('test-delete');
      expect(before).not.toBeNull();

      const deleted = await deleteVector('test-delete');
      expect(deleted).toBe(true);

      const after = await getVector('test-delete');
      expect(after).toBeNull();
    });

    it('should return false when deleting non-existent embedding', async () => {
      const deleted = await deleteVector('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('count and stats', () => {
    it('should count embeddings correctly', async () => {
      const count1 = await vectorStore.count();
      expect(count1).toBe(0);

      const embedding: Embedding = {
        id: 'emb-1',
        eventId: 'event-1',
        vector: [0.1, 0.2],
        text: 'Test',
        timestamp: Date.now(),
      };

      await saveVector(embedding);

      const count2 = await vectorStore.count();
      expect(count2).toBe(1);
    });

    it('should get statistics', async () => {
      const embedding: Embedding = {
        id: 'emb-1',
        eventId: 'event-1',
        vector: [0.1, 0.2, 0.3],
        text: 'Test',
        timestamp: Date.now(),
      };

      await saveVector(embedding);

      const stats = await vectorStore.getStats();
      expect(stats.totalVectors).toBeGreaterThanOrEqual(1);
      expect(stats.cachedVectors).toBeGreaterThanOrEqual(1);
      expect(stats.avgVectorDimension).toBeGreaterThan(0);
    });
  });
});

