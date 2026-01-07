/**
 * Tag extractor for SuperMemory events.
 * Lightweight keyword extraction for local-first tagging.
 */

import type { MemoryEvent } from './event-types';

const STOP_WORDS = new Set([
  'the','and','for','with','this','that','from','about','into','there','their','them',
  'your','have','more','will','what','when','where','which','using','used','been',
  'than','then','over','after','before','because','while','within','without','such',
  'also','only','even','much','many','some','any','each','most','very','like','just',
  'onto','upon','here','time','date','page','tab','mode','note','visit'
]);

const TAG_LIMIT = 6;

export function extractTagsFromText(text: string, limit: number = TAG_LIMIT): string[] {
  if (!text) return [];
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));

  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token]) => token);
}

export function extractTagsFromEvent(event: Omit<MemoryEvent, 'id' | 'ts' | 'score'>): string[] {
  const candidateTexts: string[] = [];
  if (typeof event.value === 'string') {
    candidateTexts.push(event.value);
  }
  if (typeof event.metadata?.title === 'string') {
    candidateTexts.push(event.metadata.title);
  }
  if (typeof event.metadata?.notePreview === 'string') {
    candidateTexts.push(event.metadata.notePreview);
  }
  if (typeof event.metadata?.url === 'string') {
    candidateTexts.push(event.metadata.url.replace(/^https?:\/\//, '').split(/[/?#]/)[0]);
  }

  const combined = candidateTexts.join(' ');
  return extractTagsFromText(combined);
}


