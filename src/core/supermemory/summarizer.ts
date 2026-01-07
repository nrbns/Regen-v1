/**
 * Memory Summarizer
 * Automatically compresses and summarizes memory events
 * Runs nightly to create summaries of old events
 */

import { MemoryEvent } from './store';
import { superMemoryDB } from './db';

export interface MemorySummary {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  periodStart: number;
  periodEnd: number;
  summary: string;
  eventCount: number;
  eventIds: string[]; // IDs of events that were summarized
  tags: string[];
  createdAt: number;
}

// const SUMMARY_STORE = 'summaries'; // Unused for now

/**
 * Summarize events using AI (via backend)
 */
async function summarizeEventsWithAI(events: MemoryEvent[]): Promise<string> {
  try {
    // Group events by type
    const eventsByType = new Map<string, MemoryEvent[]>();
    for (const event of events) {
      const type = event.type;
      if (!eventsByType.has(type)) {
        eventsByType.set(type, []);
      }
      eventsByType.get(type)!.push(event);
    }

    // Build summary context
    const contextParts: string[] = [];
    for (const [type, typeEvents] of eventsByType.entries()) {
      contextParts.push(`\n${type} events (${typeEvents.length}):`);
      for (const event of typeEvents.slice(0, 10)) {
        // Limit to 10 per type
        const value = typeof event.value === 'string' ? event.value : JSON.stringify(event.value);
        const title = event.metadata?.title || event.metadata?.url || value;
        contextParts.push(`- ${title}`);
      }
      if (typeEvents.length > 10) {
        contextParts.push(`... and ${typeEvents.length - 10} more`);
      }
    }

    const context = contextParts.join('\n');

    // Call AI backend for summarization
    try {
      // Try OpenAI/Hugging Face/Ollama endpoint
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      // First try the /redix/ask endpoint
      const response = await fetch(`${apiUrl}/redix/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are a personal memory assistant. Summarize these memory events in 2-3 concise sentences, highlighting key activities, patterns, and insights:\n\n${context}\n\nProvide a natural, human-readable summary.`,
          stream: false,
          session_id: 'memory-summarizer',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const summary = data.response || data.text || data.answer || '';
        if (summary && summary.length > 20) {
          return summary;
        }
      }

      // Fallback: Try OpenAI endpoint directly
      try {
        const openaiResponse = await fetch(`${apiUrl}/openai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content:
                  'You are a personal memory assistant that creates concise, insightful summaries of user activities.',
              },
              {
                role: 'user',
                content: `Summarize these memory events in 2-3 sentences:\n\n${context}`,
              },
            ],
            model: 'gpt-4o-mini',
            temperature: 0.5,
          }),
        });

        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json();
          const summary = openaiData.response || openaiData.text || '';
          if (summary && summary.length > 20) {
            return summary;
          }
        }
      } catch (openaiError) {
        console.debug('[Summarizer] OpenAI endpoint failed:', openaiError);
      }
    } catch (error) {
      console.warn('[Summarizer] AI summarization failed, using fallback:', error);
    }

    // Fallback: Simple text summary
    return generateFallbackSummary(events);
  } catch (error) {
    console.error('[Summarizer] Summarization failed:', error);
    return generateFallbackSummary(events);
  }
}

/**
 * Generate a simple fallback summary without AI
 */
function generateFallbackSummary(events: MemoryEvent[]): string {
  const eventsByType = new Map<string, number>();
  const urls = new Set<string>();
  const queries = new Set<string>();

  for (const event of events) {
    eventsByType.set(event.type, (eventsByType.get(event.type) || 0) + 1);
    if (event.metadata?.url) {
      urls.add(event.metadata.url);
    }
    if (event.type === 'search' && typeof event.value === 'string') {
      queries.add(event.value);
    }
  }

  const parts: string[] = [];
  parts.push(`Summary of ${events.length} events:`);

  for (const [type, count] of eventsByType.entries()) {
    parts.push(`${count} ${type} events`);
  }

  if (urls.size > 0) {
    parts.push(`${urls.size} unique URLs visited`);
  }

  if (queries.size > 0) {
    parts.push(`${queries.size} search queries`);
  }

  return parts.join('. ') + '.';
}

/**
 * Compress events by creating a summary and removing old events
 */
export async function compressEvents(
  events: MemoryEvent[],
  summaryType: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<MemorySummary> {
  if (events.length === 0) {
    throw new Error('No events to compress');
  }

  // Sort events by timestamp
  const sortedEvents = [...events].sort((a, b) => a.ts - b.ts);
  const periodStart = sortedEvents[0].ts;
  const periodEnd = sortedEvents[sortedEvents.length - 1].ts;

  // Generate summary
  const summaryText = await summarizeEventsWithAI(sortedEvents);

  // Extract tags from events
  const allTags = new Set<string>();
  for (const event of sortedEvents) {
    if (event.metadata?.tags) {
      for (const tag of event.metadata.tags) {
        allTags.add(tag);
      }
    }
  }

  // Create summary record
  const summary: MemorySummary = {
    id: `summary-${periodStart}-${periodEnd}`,
    type: summaryType,
    periodStart,
    periodEnd,
    summary: summaryText,
    eventCount: sortedEvents.length,
    eventIds: sortedEvents.map(e => e.id),
    tags: Array.from(allTags),
    createdAt: Date.now(),
  };

  // Save summary to IndexedDB
  await saveSummary(summary);

  return summary;
}

/**
 * Save summary to IndexedDB
 */
async function saveSummary(summary: MemorySummary): Promise<void> {
  try {
    await superMemoryDB.init();
    const db = (superMemoryDB as any).db;
    if (!db) {
      throw new Error('Database not initialized');
    }

    // Use IndexedDB for summaries (add summaries store if needed)
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');

      // Store summary as a special event type
      const summaryEvent = {
        id: summary.id,
        type: 'summary' as any, // Special type for summaries
        value: summary.summary,
        metadata: {
          summaryType: summary.type,
          periodStart: summary.periodStart,
          periodEnd: summary.periodEnd,
          eventCount: summary.eventCount,
          eventIds: summary.eventIds,
          tags: summary.tags,
        },
        ts: summary.createdAt,
        score: 1.0, // High score for summaries
      };

      const request = store.put(summaryEvent);
      request.onsuccess = () => {
        // Also save to localStorage for quick access
        try {
          const summaries = JSON.parse(localStorage.getItem('sm-summaries') || '[]');
          summaries.push(summary);
          // Keep only last 100 summaries
          if (summaries.length > 100) {
            summaries.splice(0, summaries.length - 100);
          }
          localStorage.setItem('sm-summaries', JSON.stringify(summaries));
        } catch (e) {
          console.warn('[Summarizer] Failed to save to localStorage:', e);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[Summarizer] Failed to save summary:', error);
    // Fallback to localStorage
    try {
      const summaries = JSON.parse(localStorage.getItem('sm-summaries') || '[]');
      summaries.push(summary);
      if (summaries.length > 100) {
        summaries.splice(0, summaries.length - 100);
      }
      localStorage.setItem('sm-summaries', JSON.stringify(summaries));
    } catch (e) {
      console.error('[Summarizer] Failed to save summary to localStorage:', e);
    }
  }
}

/**
 * Get all summaries
 */
export async function getSummaries(limit?: number): Promise<MemorySummary[]> {
  try {
    const summaries = JSON.parse(localStorage.getItem('sm-summaries') || '[]');
    const sorted = summaries.sort(
      (a: MemorySummary, b: MemorySummary) => b.createdAt - a.createdAt
    );
    return limit ? sorted.slice(0, limit) : sorted;
  } catch (error) {
    console.error('[Summarizer] Failed to get summaries:', error);
    return [];
  }
}

/**
 * Run nightly summarization
 * Should be called once per day
 */
export async function runNightlySummarization(): Promise<{
  success: boolean;
  summariesCreated: number;
  eventsCompressed: number;
}> {
  try {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Get old events (older than 7 days, not pinned)
    const oldEvents = await superMemoryDB.getEvents({
      until: oneWeekAgo,
      limit: 1000,
    });

    // Filter out pinned events
    const eventsToCompress = oldEvents.filter(e => !e.metadata?.pinned);

    if (eventsToCompress.length === 0) {
      return { success: true, summariesCreated: 0, eventsCompressed: 0 };
    }

    // Group events by time period
    const dailyEvents: MemoryEvent[] = [];
    const weeklyEvents: MemoryEvent[] = [];
    const monthlyEvents: MemoryEvent[] = [];

    for (const event of eventsToCompress) {
      if (event.ts >= oneDayAgo) {
        // Shouldn't happen (we filtered until oneWeekAgo), but just in case
        continue;
      } else if (event.ts >= oneWeekAgo) {
        // Between 1 week and 1 day ago - compress to daily summary
        dailyEvents.push(event);
      } else if (event.ts >= oneMonthAgo) {
        // Between 1 month and 1 week ago - compress to weekly summary
        weeklyEvents.push(event);
      } else {
        // Older than 1 month - compress to monthly summary
        monthlyEvents.push(event);
      }
    }

    let summariesCreated = 0;
    let eventsCompressed = 0;

    // Compress daily events (group by day)
    if (dailyEvents.length > 0) {
      const eventsByDay = new Map<number, MemoryEvent[]>();
      for (const event of dailyEvents) {
        const dayStart = new Date(event.ts).setHours(0, 0, 0, 0);
        if (!eventsByDay.has(dayStart)) {
          eventsByDay.set(dayStart, []);
        }
        eventsByDay.get(dayStart)!.push(event);
      }

      for (const [dayStart, dayEvents] of eventsByDay.entries()) {
        // Compress if 5+ events (lowered threshold for better compression)
        if (dayEvents.length >= 5) {
          try {
            await compressEvents(dayEvents, 'daily');
            summariesCreated++;
            eventsCompressed += dayEvents.length;

            // Delete compressed events (keep summary)
            for (const event of dayEvents) {
              await superMemoryDB.deleteEvent(event.id);
            }
          } catch (error) {
            console.error(
              `[Summarizer] Failed to compress daily events for ${new Date(dayStart).toISOString()}:`,
              error
            );
          }
        }
      }
    }

    // Compress weekly events (group by week)
    if (weeklyEvents.length > 0) {
      const eventsByWeek = new Map<number, MemoryEvent[]>();
      for (const event of weeklyEvents) {
        const weekStart = new Date(event.ts);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
        weekStart.setHours(0, 0, 0, 0);
        const weekStartTs = weekStart.getTime();

        if (!eventsByWeek.has(weekStartTs)) {
          eventsByWeek.set(weekStartTs, []);
        }
        eventsByWeek.get(weekStartTs)!.push(event);
      }

      for (const [weekStart, weekEvents] of eventsByWeek.entries()) {
        // Compress if 10+ events (lowered threshold)
        if (weekEvents.length >= 10) {
          try {
            await compressEvents(weekEvents, 'weekly');
            summariesCreated++;
            eventsCompressed += weekEvents.length;

            // Delete compressed events
            for (const event of weekEvents) {
              await superMemoryDB.deleteEvent(event.id);
            }
          } catch (error) {
            console.error(
              `[Summarizer] Failed to compress weekly events for ${new Date(weekStart).toISOString()}:`,
              error
            );
          }
        }
      }
    }

    // Compress monthly events (group by month)
    if (monthlyEvents.length > 0) {
      const eventsByMonth = new Map<number, MemoryEvent[]>();
      for (const event of monthlyEvents) {
        const monthStart = new Date(event.ts);
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthStartTs = monthStart.getTime();

        if (!eventsByMonth.has(monthStartTs)) {
          eventsByMonth.set(monthStartTs, []);
        }
        eventsByMonth.get(monthStartTs)!.push(event);
      }

      for (const [monthStart, monthEvents] of eventsByMonth.entries()) {
        // Compress if 20+ events (lowered threshold)
        if (monthEvents.length >= 20) {
          try {
            await compressEvents(monthEvents, 'monthly');
            summariesCreated++;
            eventsCompressed += monthEvents.length;

            // Delete compressed events
            for (const event of monthEvents) {
              await superMemoryDB.deleteEvent(event.id);
            }
          } catch (error) {
            console.error(
              `[Summarizer] Failed to compress monthly events for ${new Date(monthStart).toISOString()}:`,
              error
            );
          }
        }
      }
    }

    return {
      success: true,
      summariesCreated,
      eventsCompressed,
    };
  } catch (error) {
    console.error('[Summarizer] Nightly summarization failed:', error);
    return {
      success: false,
      summariesCreated: 0,
      eventsCompressed: 0,
    };
  }
}

/**
 * Initialize nightly summarization scheduler
 * Runs automatically once per day, or can be triggered manually
 */
export function initNightlySummarization(): void {
  // Check if we should run summarization
  const lastRun = localStorage.getItem('sm-last-summary-run');
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  // Run if never run before, or if last run was more than 24 hours ago
  if (!lastRun || now - parseInt(lastRun, 10) > oneDayMs) {
    // Run summarization asynchronously (don't block app startup)
    setTimeout(() => {
      runNightlySummarization()
        .then(result => {
          console.log('[Summarizer] Nightly summarization completed:', result);
          localStorage.setItem('sm-last-summary-run', now.toString());

          // Emit event for UI to show notification if needed
          if (result.summariesCreated > 0) {
            window.dispatchEvent(
              new CustomEvent('memory-summarized', {
                detail: {
                  summariesCreated: result.summariesCreated,
                  eventsCompressed: result.eventsCompressed,
                },
              })
            );
          }
        })
        .catch(error => {
          console.error('[Summarizer] Nightly summarization error:', error);
        });
    }, 5000); // Wait 5 seconds after app startup

    // Schedule next run (24 hours from now)
    const nextRun = now + oneDayMs;
    const delay = nextRun - now;
    setTimeout(() => {
      initNightlySummarization();
    }, delay);
  } else {
    // Schedule next run
    const nextRun = parseInt(lastRun, 10) + oneDayMs;
    const delay = Math.max(0, nextRun - now);
    setTimeout(() => {
      initNightlySummarization();
    }, delay);
  }
}

/**
 * Manually trigger summarization (for testing or user-initiated compression)
 */
export async function triggerSummarization(): Promise<{
  success: boolean;
  summariesCreated: number;
  eventsCompressed: number;
}> {
  console.log('[Summarizer] Manual summarization triggered');
  const result = await runNightlySummarization();
  localStorage.setItem('sm-last-summary-run', Date.now().toString());
  return result;
}
