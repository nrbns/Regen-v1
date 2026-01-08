import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { eventBus, EVENTS } from '../state/eventBus';
import { contextEngine } from '../contextEngine';

describe('ContextEngine', () => {
  beforeEach(async () => {
    // Ensure clean state
    await contextEngine.clear();
    contextEngine.start();
  });

  afterEach(async () => {
    contextEngine.stop();
    await contextEngine.clear();
  });

  it('persists navigation events to storage', async () => {
    const indexSpy = vi.spyOn(await import('../../services/meiliIndexer'), 'indexContext');

    eventBus.emit(EVENTS.TAB_NAVIGATED, {
      tabId: 't-1',
      url: 'https://example.com',
      tab: { title: 'Example' },
    });

    // Wait for async persistence
    await new Promise(resolve => setTimeout(resolve, 30));

    const list = await contextEngine.getContexts();
    expect(list.length).toBe(1);
    expect(list[0].tabId).toBe('t-1');
    expect(list[0].url).toBe('https://example.com');
    expect(list[0].title).toBe('Example');

    // indexContext should have been called (best-effort)
    expect(indexSpy).toHaveBeenCalled();
    indexSpy.mockRestore();
  });

  it('keeps only latest N entries when limit exceeded', async () => {
    // Add several entries
    for (let i = 0; i < 6; i++) {
      eventBus.emit(EVENTS.TAB_NAVIGATED, { tabId: `t-${i}`, url: `https://site${i}.com` });
    }

    // Wait for asynchronous persistence; poll for up to 500ms
    const start = Date.now();
    let all: any[] = [];
    while (Date.now() - start < 500) {
      all = await contextEngine.getContexts();
      if (all.length >= 6) break;
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    expect(all.length).toBe(6);

    const last3 = await contextEngine.getContexts(3);
    expect(last3.length).toBe(3);
    expect(last3[0].url).toBe('https://site3.com');
    expect(last3[2].url).toBe('https://site5.com');
  });
});
