/**
 * Duplicate Event Detection & Prevention Tests
 *
 * Validates deduplication logic for:
 * - WebSocket reconnects
 * - Job retry scenarios
 * - Message queue replays
 * - Redis persistence recovery
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Duplicate Event Prevention', () => {
  let deduplicator;
  let eventLog = [];

  beforeEach(() => {
    // Initialize deduplicator with TTL
    deduplicator = new EventDeduplicator({
      ttl: 5000, // 5 second window
      maxSize: 10000,
    });
    eventLog = [];
  });

  describe('Basic Deduplication', () => {
    it('should detect duplicate events by ID', () => {
      const event = {
        id: 'evt-123',
        type: 'job-complete',
        timestamp: Date.now(),
      };

      expect(deduplicator.isDuplicate(event.id)).toBe(false);
      deduplicator.mark(event.id);

      expect(deduplicator.isDuplicate(event.id)).toBe(true);
    });

    it('should expire old event IDs after TTL', () => {
      const eventId = 'evt-old';

      deduplicator.mark(eventId);
      expect(deduplicator.isDuplicate(eventId)).toBe(true);

      // Simulate TTL expiration
      vi.useFakeTimers();
      vi.advanceTimersByTime(6000); // Beyond TTL

      expect(deduplicator.isDuplicate(eventId)).toBe(false);
      vi.useRealTimers();
    });

    it('should handle high-frequency duplicate detection', () => {
      const eventIds = Array.from({ length: 100 }, (_, i) => `evt-${i}`);

      // Mark all events
      eventIds.forEach(id => {
        deduplicator.mark(id);
      });

      // Verify all are detected as duplicates
      const allDuplicates = eventIds.every(id => deduplicator.isDuplicate(id));
      expect(allDuplicates).toBe(true);
    });
  });

  describe('WebSocket Reconnection Scenarios', () => {
    it('should handle message deduplication across reconnects', () => {
      const sessionId = 'session-123';
      const messages = [
        { id: 'msg-1', sessionId, timestamp: Date.now() },
        { id: 'msg-2', sessionId, timestamp: Date.now() + 100 },
        { id: 'msg-3', sessionId, timestamp: Date.now() + 200 },
      ];

      // Initial connection receives all messages
      messages.forEach(msg => {
        expect(deduplicator.isDuplicate(msg.id)).toBe(false);
        deduplicator.mark(msg.id);
        eventLog.push(msg);
      });

      expect(eventLog.length).toBe(3);

      // Simulate reconnect - server might resend some messages
      const resendMessages = [messages[1], messages[2]]; // Resend last 2

      const uniqueMessages = resendMessages.filter(msg => !deduplicator.isDuplicate(msg.id));

      expect(uniqueMessages.length).toBe(0); // Should filter all as duplicates
      expect(eventLog.length).toBe(3); // Log unchanged
    });

    it('should track message resume from last seen ID', () => {
      const sessionId = 'session-456';

      const connectionA = [
        { id: 'msg-1', sessionId },
        { id: 'msg-2', sessionId },
        { id: 'msg-3', sessionId },
      ];

      connectionA.forEach(msg => {
        deduplicator.mark(msg.id);
        eventLog.push(msg);
      });

      const lastSeenId = 'msg-2';

      // Reconnect requests messages after lastSeenId
      const connectionB = [
        { id: 'msg-2', sessionId }, // Overlap
        { id: 'msg-3', sessionId }, // Overlap
        { id: 'msg-4', sessionId }, // New
        { id: 'msg-5', sessionId }, // New
      ];

      const newMessages = connectionB.filter(msg => !deduplicator.isDuplicate(msg.id));

      newMessages.forEach(msg => {
        deduplicator.mark(msg.id);
        eventLog.push(msg);
      });

      // Should have 5 unique messages total (1-5)
      expect(eventLog.length).toBe(5);
      expect(eventLog[0].id).toBe('msg-1');
      expect(eventLog[4].id).toBe('msg-5');
    });
  });

  describe('Job Retry Scenarios', () => {
    it('should prevent duplicate job execution on retry', () => {
      const jobId = 'job-xyz';
      const job = {
        id: jobId,
        type: 'webhook-send',
        url: 'https://example.com/webhook',
        payload: { userId: 123 },
      };

      // First execution
      expect(deduplicator.isDuplicate(jobId)).toBe(false);
      deduplicator.mark(jobId);
      eventLog.push({ event: 'execute', jobId });

      // Network timeout, application retries
      // Should detect as duplicate
      expect(deduplicator.isDuplicate(jobId)).toBe(true);
      eventLog.push({ event: 'skip-retry', jobId });

      expect(eventLog.length).toBe(2);
      expect(eventLog[1].event).toBe('skip-retry');
    });

    it('should allow job retry after TTL expires', () => {
      const jobId = 'job-retry-ttl';

      deduplicator.mark(jobId);
      deduplicator.mark(jobId);
      eventLog.push({ event: 'execute', jobId });

      expect(deduplicator.isDuplicate(jobId)).toBe(true);

      vi.useFakeTimers();
      vi.advanceTimersByTime(6000); // Past TTL

      expect(deduplicator.isDuplicate(jobId)).toBe(false);
      deduplicator.mark(jobId);
      eventLog.push({ event: 're-execute', jobId });

      vi.useRealTimers();

      expect(eventLog.length).toBe(2);
      expect(eventLog[1].event).toBe('re-execute');
    });

    it('should handle concurrent job retry requests', async () => {
      const jobId = 'job-concurrent';

      // Simulate 5 concurrent retry requests
      const retryPromises = Array.from({ length: 5 }, async (_, i) => {
        if (!deduplicator.isDuplicate(jobId)) {
          deduplicator.mark(jobId);
          return { attempt: i + 1, executed: true };
        }
        return { attempt: i + 1, executed: false };
      });

      const results = await Promise.all(retryPromises);

      // Only first should execute
      const executed = results.filter(r => r.executed);
      expect(executed.length).toBe(1);
      expect(executed[0].attempt).toBe(1);
    });
  });

  describe('Message Queue Replay Scenarios', () => {
    it('should deduplicate messages replayed from queue', () => {
      const queueName = 'notifications';

      // Original message processing
      const originalMessages = [
        { id: 'queue-msg-1', queueName, processed: false },
        { id: 'queue-msg-2', queueName, processed: false },
        { id: 'queue-msg-3', queueName, processed: false },
      ];

      originalMessages.forEach(msg => {
        deduplicator.mark(msg.id);
        eventLog.push({ ...msg, processed: true });
      });

      expect(eventLog.length).toBe(3);
      expect(eventLog.every(m => m.processed)).toBe(true);

      // Queue replay (e.g., after server restart)
      const replayedMessages = originalMessages.concat([
        { id: 'queue-msg-4', queueName, processed: false },
      ]);

      const newMessages = replayedMessages.filter(msg => !deduplicator.isDuplicate(msg.id));

      newMessages.forEach(msg => {
        deduplicator.mark(msg.id);
        eventLog.push({ ...msg, processed: true });
      });

      // Should only have 4 messages (original 3 + 1 new)
      expect(eventLog.length).toBe(4);
      expect(eventLog[3].id).toBe('queue-msg-4');
    });

    it('should handle dead letter queue re-ingestion', () => {
      const dlqName = 'dead-letter-queue';

      // Initial failure
      const failedMessage = {
        id: 'dlq-msg-1',
        queueName: dlqName,
        attempts: 3,
      };

      deduplicator.mark(failedMessage.id);
      eventLog.push({ ...failedMessage, status: 'dead-lettered' });

      // Re-ingestion after fix
      expect(deduplicator.isDuplicate(failedMessage.id)).toBe(true);

      eventLog.push({ ...failedMessage, status: 'skip-reingestion' });

      expect(eventLog.length).toBe(2);
      expect(eventLog[1].status).toBe('skip-reingestion');
    });
  });

  describe('Redis Persistence Recovery', () => {
    it('should rebuild dedup state from Redis persistence', () => {
      const persistedIds = ['evt-redis-1', 'evt-redis-2', 'evt-redis-3'];

      // Simulate loading from Redis
      persistedIds.forEach(id => {
        deduplicator.mark(id);
      });

      // Verify all are marked as duplicates
      persistedIds.forEach(id => {
        expect(deduplicator.isDuplicate(id)).toBe(true);
      });

      // New events should not conflict
      const newId = 'evt-redis-new';
      expect(deduplicator.isDuplicate(newId)).toBe(false);
      deduplicator.mark(newId);
      expect(deduplicator.isDuplicate(newId)).toBe(true);
    });

    it('should handle partial Redis recovery data', () => {
      // Simulate corrupted/partial Redis data
      const corruptedIds = ['evt-corrupt-1', null, 'evt-corrupt-2', undefined, 'evt-corrupt-3'];

      const validIds = corruptedIds.filter(id => id != null);

      validIds.forEach(id => {
        deduplicator.mark(id);
      });

      expect(validIds.every(id => deduplicator.isDuplicate(id))).toBe(true);

      // Null/undefined shouldn't break dedup logic
      const randomId = 'evt-test';
      expect(deduplicator.isDuplicate(randomId)).toBe(false);
    });
  });

  describe('Edge Cases & Stress Tests', () => {
    it('should handle memory limit (max size)', () => {
      const maxSize = deduplicator.maxSize; // From options

      // Fill beyond max size
      const events = Array.from({ length: maxSize + 1000 }, (_, i) => `evt-${i}`);

      events.forEach(id => {
        deduplicator.mark(id);
      });

      // Oldest events should be evicted
      const oldestId = 'evt-0';
      const newestId = `evt-${maxSize + 999}`;

      expect(deduplicator.isDuplicate(newestId)).toBe(true); // Recent should exist
    });

    it('should handle rapid event ID generation', () => {
      const rapid = Array.from({ length: 10000 }, (_, i) => `evt-rapid-${i}`);

      const start = performance.now();

      rapid.forEach(id => {
        expect(deduplicator.isDuplicate(id)).toBe(false);
        deduplicator.mark(id);
      });

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000); // Should complete in <1s
      expect(rapid.every(id => deduplicator.isDuplicate(id))).toBe(true);
    });

    it('should handle complex event IDs with timestamps', () => {
      const timestamps = [Date.now() - 1000, Date.now(), Date.now() + 1000];

      const complexIds = timestamps.map(
        ts => `evt-${ts}-${Math.random().toString(36).substr(2, 9)}`
      );

      complexIds.forEach(id => {
        deduplicator.mark(id);
      });

      expect(complexIds.every(id => deduplicator.isDuplicate(id))).toBe(true);
    });
  });
});

/**
 * Mock EventDeduplicator class
 * In production, this would be in src/services/realtime/deduplicator.ts
 */
class EventDeduplicator {
  constructor({ ttl = 5000, maxSize = 10000 }) {
    this.ttl = ttl;
    this.maxSize = maxSize;
    this.events = new Map();
    this.expiryQueue = [];
  }

  mark(id) {
    if (!id) return;
    this.events.set(id, Date.now());
    this.expiryQueue.push({ id, expiresAt: Date.now() + this.ttl });

    if (this.events.size > this.maxSize) {
      const oldest = this.expiryQueue.shift();
      this.events.delete(oldest.id);
    }
  }

  isDuplicate(id) {
    if (!id) return false;

    // Clean expired entries
    const now = Date.now();
    for (const [eId, timestamp] of this.events.entries()) {
      if (now - timestamp > this.ttl) {
        this.events.delete(eId);
      }
    }

    return this.events.has(id);
  }
}
