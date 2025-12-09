/**
 * Extract bracketed actions from agent output, e.g. [SCRAPE https://...]
 */
export function parseAgentActions(output: string): string[] {
  if (!output) return [];
  const matches = output.match(/\[[^\]]+\]/g);
  return matches ?? [];
}

/**
 * Best-effort executor that maps agent actions to IPC calls.
 * This stays intentionally minimal to avoid breaking environments where IPC
 * methods are unavailable (web build).
 */
export async function executeAgentActions(actions: string[]): Promise<void> {
  if (!actions || actions.length === 0) return;
  for (const action of actions) {
    const upper = action.toUpperCase();
    if (upper.startsWith('[SCRAPE ') || upper.startsWith('[OPEN ')) {
      const url = extractPayload(action);
      if (!url) continue;
      try {
        const { ipc } = await import('../lib/ipc-typed');
        await ipc.tabs.create({ url, activate: true }).catch(async () => {
          // Fallback to navigate if create fails
          const tabs = await ipc.tabs.list().catch(() => []);
          const active = Array.isArray(tabs) ? tabs.find((t: any) => t.active) : null;
          if (active?.id) {
            await ipc.tabs.navigate(active.id, url);
          }
        });
      } catch (_e) {
        // Ignore if IPC not available (e.g., pure web build)
      }
    } else if (upper.startsWith('[TRADE ')) {
      // Trade actions are domain-specific; surface as a console hint for now.
      const payload = extractPayload(action);
      console.info('[Agent] Trade action requested:', payload);
    } else if (upper.startsWith('[SUMMARIZE')) {
      // No-op; summarization handled in-stream.
    }
  }
}

function extractPayload(action: string): string | null {
  const match = action.match(/\[.*?\s+(.*)\]/);
  if (!match || !match[1]) return null;
  return match[1].trim();
}

