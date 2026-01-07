// Minimal single-action agent service: Summarize this tab

export async function summarizeTab(tabId: string): Promise<void> {
  try {
    const { ipc } = await import('../lib/ipc-typed');
    const tab = await ipc.tabs.get({ id: tabId }).catch(() => null);
    const url = tab?.url ?? '';
    const title = tab?.title ?? 'Untitled';
    let content = '';
    try {
      const html = await ipc.tabs.getContent({ id: tabId }).catch(() => '');
      content = typeof html === 'string' ? html : '';
    } catch {
      content = '';
    }

    const prompt = `Summarize this page in 6-8 bullet points.\nTitle: ${title}\nURL: ${url}\n` +
      (content ? `HTML snippet:\n${content.slice(0, 5000)}` : '');

    // Try to use an LLM client if present; otherwise fallback
    let summary = '';
    try {
      const maybe = await import('./LLMRouter').catch(() => null);
      const client = (maybe && (maybe as any).LLMRouter) ? (maybe as any).LLMRouter : null;
      if (client && typeof client.complete === 'function') {
        summary = await client.complete(prompt, { maxTokens: 400 }).catch(() => '');
      }
    } catch {}

    if (!summary) {
      summary = title ? `Summary: ${title}` : 'Summary unavailable. Try again from the page.';
    }

    // Emit UI event for renderer to show
    window.dispatchEvent(new CustomEvent('omnibrowser:tab_summary', {
      detail: { tabId, title, url, summary }
    }));
  } catch (error) {
    console.warn('[agentService] summarizeTab failed', error);
    window.dispatchEvent(new CustomEvent('omnibrowser:tab_summary_error', {
      detail: { tabId, error: String(error) }
    }));
  }
}
