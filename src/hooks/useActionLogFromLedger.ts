/**
 * Hook to fetch ActionLog entries from Event Ledger
 *
 * This ensures ActionLog always shows:
 * - Confidence scores (mandatory)
 * - Sources (mandatory)
 * - Reasoning (mandatory)
 */

import { useEffect, useState } from 'react';
import { eventLedger } from '../core/eventLedger';
import type { ActionLogEntry } from '../components/realtime/ActionLog';

export function useActionLogFromLedger(jobId: string | null) {
  const [entries, setEntries] = useState<ActionLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!jobId) {
      setEntries([]);
      return;
    }

    let cancelled = false;

    async function loadEntries() {
      setLoading(true);
      setError(null);

      try {
        const actionLogEntries = await eventLedger.getActionLogEntries(jobId);
        if (!cancelled) {
          setEntries(actionLogEntries);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEntries();

    // Subscribe to new events
    const handleNewEvent = (event: CustomEvent) => {
      const entry = event.detail;
      if (entry.jobId === jobId) {
        loadEntries(); // Reload when new event arrives
      }
    };

    window.addEventListener('eventLedger:entry', handleNewEvent as EventListener);

    return () => {
      cancelled = true;
      window.removeEventListener('eventLedger:entry', handleNewEvent as EventListener);
    };
  }, [jobId]);

  return { entries, loading, error };
}
