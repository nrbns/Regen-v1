import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { evaluateSafety } from '../safety';

vi.mock('../../../lib/ipc-typed', () => ({
  ipc: {
    consent: {
      check: vi.fn(),
    },
  },
}));

let ipcMock: { ipc: { consent: { check: ReturnType<typeof vi.fn> } } };

describe('Agent safety', () => {
  beforeAll(async () => {
    ipcMock = await import('../../../lib/ipc-typed');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows low-risk tools without consent', async () => {
    const decision = await evaluateSafety(
      'summarize_text',
      { text: 'hello' },
      { requireConsent: true }
    );
    expect(decision.allowed).toBe(true);
    expect(decision.consentRequired).toBe(false);
  });

  it('blocks denied domains', async () => {
    const decision = await evaluateSafety(
      'scrape_page',
      { url: 'https://blocked.com/page' },
      { deniedDomains: ['blocked.com'] }
    );
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Domain');
  });

  it('requests consent for medium/high risk and respects denial', async () => {
    (ipcMock.ipc.consent.check as any).mockResolvedValue({ hasConsent: false });
    const decision = await evaluateSafety(
      'manage_tabs',
      { action: 'close' },
      { requireConsent: true }
    );
    expect(ipcMock.ipc.consent.check).toHaveBeenCalled();
    expect(decision.allowed).toBe(false);
    expect(decision.consentRequired).toBe(true);
    expect(decision.consentGranted).toBe(false);
  });
});
