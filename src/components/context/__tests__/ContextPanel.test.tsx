import React from 'react';
import { render, screen } from '@testing-library/react';
import ContextPanel from '../ContextPanel';
import { vi } from 'vitest';
import { contextEngine } from '../../../core/contextEngine';

vi.mock('../../../core/contextEngine', () => ({
  contextEngine: {
    getContexts: vi.fn(async (limit = 10) => {
      return [
        { id: 'c1', tabId: 't1', url: 'https://a.com', title: 'A', timestamp: Date.now() },
        { id: 'c2', tabId: 't2', url: 'https://b.com', title: 'B', timestamp: Date.now() },
      ].slice(-limit);
    }),
    clear: vi.fn(async () => {}),
  },
}));

describe('ContextPanel', () => {
  it('renders list of contexts', async () => {
    render(<ContextPanel />);

    // Wait for mocked contexts to render
    const link = await screen.findByText('A');
    expect(link).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});