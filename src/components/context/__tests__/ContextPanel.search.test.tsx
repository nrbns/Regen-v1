import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ContextPanel from '../ContextPanel';
import { vi } from 'vitest';
import { contextEngine } from '../../../core/contextEngine';

vi.mock('../../../core/contextEngine', () => ({
  contextEngine: {
    getContexts: vi.fn(async (limit = 10) =>
      [
        { id: 'c1', tabId: 't1', url: 'https://alpha.com', title: 'Alpha', timestamp: Date.now() },
        { id: 'c2', tabId: 't2', url: 'https://beta.com', title: 'Beta', timestamp: Date.now() },
      ].slice(-limit)
    ),
    clear: vi.fn(async () => {}),
  },
}));

vi.mock('../../../services/meiliIndexer', () => ({
  searchContexts: vi.fn(async (q: string) => {
    if (q.includes('alpha')) {
      return {
        hits: [{ id: 'c1', url: 'https://alpha.com', title: 'Alpha', timestamp: Date.now() }],
        estimatedTotalHits: 1,
        processingTimeMs: 1,
      };
    }
    return { hits: [], estimatedTotalHits: 0, processingTimeMs: 1 };
  }),
}));

describe('ContextPanel search', () => {
  it('uses Meili search when available and shows results', async () => {
    render(<ContextPanel />);

    const input = screen.getByPlaceholderText('Search contexts...');
    fireEvent.change(input, { target: { value: 'alpha' } });

    const searchBtn = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchBtn);

    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
  });

  it('falls back to local filter when Meili unavailable', async () => {
    // Make the meili mock throw
    const meili = await import('../../../services/meiliIndexer');
    (meili.searchContexts as any).mockImplementationOnce(async () => {
      throw new Error('meili down');
    });

    render(<ContextPanel />);
    const input = screen.getByPlaceholderText('Search contexts...');
    fireEvent.change(input, { target: { value: 'beta' } });
    const searchBtn = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchBtn);

    await waitFor(() => expect(screen.getByText('Beta')).toBeInTheDocument());
  });
});
