export interface ResearchProvider {
  search(query: string): { title: string; url: string }[] | Promise<{ title: string; url: string }[]>;
}

export class MockResearchProvider implements ResearchProvider {
  search(query: string) {
    const seed = encodeURIComponent(query || 'omni');
    return [
      { title: `Result for ${query} #1`, url: `https://example.com/?q=${seed}&i=1` },
      { title: `Result for ${query} #2`, url: `https://example.com/?q=${seed}&i=2` },
      { title: `Result for ${query} #3`, url: `https://example.com/?q=${seed}&i=3` },
    ];
  }
}

export class TinyLLMProvider implements ResearchProvider {
  async search(query: string) {
    const res = await (window as any).research?.query?.(query);
    const cites = res?.citations || [];
    return cites.map((c: any) => ({ title: c.title || c.url, url: c.url }));
  }
}


