import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock googleapis to avoid real network/auth
vi.mock('googleapis', () => {
  return {
    google: {
      slides: vi.fn().mockReturnValue({
        presentations: {
          create: vi
            .fn()
            .mockResolvedValue({ data: { presentationId: 'PRES1', slides: [{}, {}] } }),
          batchUpdate: vi.fn().mockResolvedValue({ data: {} }),
        },
      }),
      auth: {
        OAuth2: vi.fn().mockImplementation(() => ({
          setCredentials: vi.fn(),
          generateAuthUrl: vi.fn().mockReturnValue('http://auth'),
          getToken: vi.fn().mockResolvedValue({ tokens: { access_token: 'x' } }),
        })),
      },
    },
  };
});

import { SlidesConnector } from '../../services/pptAgent/slidesConnector';

describe('SlidesConnector smoke', () => {
  let connector: SlidesConnector;

  beforeEach(() => {
    connector = new SlidesConnector();
    connector.setTokens({ access_token: 'abc', refresh_token: 'def' } as any);
  });

  it('creates a presentation', async () => {
    const created = await connector.createPresentation('Test Deck');
    expect(created.presentationId).toBe('PRES1');
    expect(created.slideCount).toBeGreaterThanOrEqual(1);
  });

  it('adds slides via batchUpdate', async () => {
    const res = await connector.addSlides('PRES1', [
      { type: 'title', title: 'Intro', bullets: [] },
      { type: 'content', title: 'Body', bullets: ['a', 'b'] },
    ] as any);
    expect(res).toBe(true);
  });
});
