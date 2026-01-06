import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, vi } from 'vitest';

// Mock the hook to control returned data
vi.mock('../../../hooks/useSystemStatus', () => ({
  useSystemStatus: () => ({
    data: {
      redixAvailable: true,
      memoryUsage: { heapUsed: 4_000_000, heapTotal: 10_000_000 },
      uptime: 60_000,
    },
    isLoading: false,
  }),
}));

import { SystemBar } from '../SystemBar';

describe('SystemBar', () => {
  it('renders memory and Redix status', () => {
    render(<SystemBar />);

    // Memory should render as MB (rounded)
    expect(screen.getByText(/MB/)).toBeTruthy();

    // Redix indicator should show when available
    expect(screen.getByText(/Redix/)).toBeTruthy();
  });
});