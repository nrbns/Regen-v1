import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TopBar } from '../TopBar';
import { contextEngine } from '../../../core/contextEngine';
import { useTabsStore } from '../../../state/tabsStore';

describe('TopBar -> ContextEngine integration', () => {
  beforeEach(async () => {
    await contextEngine.clear();
    contextEngine.start();
    // Setup a single active tab
    useTabsStore.setState({ tabs: [{ id: 'tab-int-1', url: 'about:blank', title: 'New Tab' }], activeId: 'tab-int-1' });
  });

  afterEach(async () => {
    contextEngine.stop();
    await contextEngine.clear();
  });

  it('submitting an address persists a navigation context', async () => {
    render(<TopBar />);

    const input = screen.getByLabelText('Address bar') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'example.org' } });
    fireEvent.submit(input.closest('form')!);

    // Poll for persistence
    let found = false;
    const start = Date.now();
    while (Date.now() - start < 1000) {
      const list = await contextEngine.getContexts();
      if (list.some(l => l.url && l.url.includes('example.org'))) {
        found = true;
        break;
      }
      await new Promise(r => setTimeout(r, 50));
    }

    expect(found).toBe(true);
  });
});