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
});