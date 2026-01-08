import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnhancedRegenSidebar } from '../EnhancedRegenSidebar';
import { contextEngine } from '../../../core/contextEngine';
import { vi } from 'vitest';

vi.mock('../../../core/contextEngine', () => ({
  contextEngine: {
    getContexts: vi.fn(async (limit = 50) => {
      return [
        { id: 'c1', tabId: 't1', url: 'https://a.com', title: 'A', timestamp: Date.now() },
        { id: 'c2', tabId: 't2', url: 'https://b.com', title: 'B', timestamp: Date.now() },
      ].slice(-limit);
    }),
  },
}));

describe('EnhancedRegenSidebar contexts tab', () => {
  it('shows contexts when contexts tab is selected', async () => {
    render(<EnhancedRegenSidebar />);

    // Click the contexts tab button
    const btn = screen.getByRole('button', { name: /Contexts/i });
    fireEvent.click(btn);

    // Wait for mocked contexts to appear
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('searches contexts when query entered (uses Meili)', async () => {
    // Mock meili search
    const meili = await import('../../../services/meiliIndexer');
    (meili.searchContexts as any).mockImplementationOnce(async (q: string) => {
      return {
        hits: [{ id: 'c3', url: 'https://gamma.com', title: 'Gamma', timestamp: Date.now() }],
        estimatedTotalHits: 1,
        processingTimeMs: 1,
      };
    });

    render(<EnhancedRegenSidebar />);
    const btn = screen.getByRole('button', { name: /Contexts/i });
    fireEvent.click(btn);

    const input = screen.getByLabelText('Sidebar contexts search') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'gamma' } });

    const searchBtn = screen.getByRole('button', { name: /Search contexts/i });
    fireEvent.click(searchBtn);

    await waitFor(() => expect(screen.getByText('Gamma')).toBeInTheDocument());
  });
});
