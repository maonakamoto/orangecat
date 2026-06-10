import { buildFullContextString } from '@/services/ai/context-string-builder';
import type { FullUserContext } from '@/services/ai/document-context-types';

describe('Cat Tier 1: runtime context block', () => {
  const ctx: FullUserContext = {
    profile: { name: 'Mao Nakamoto', username: 'mao' },
    documents: [],
    entities: [],
    tasks: [],
    wallets: [],
    conversations: [],
    inboundActivity: { recentSales: [], upcomingBookings: [] },
    memberGroups: [],
    paymentCapabilities: { hasNwcWallet: false, lightningAddress: null },
    runtime: {
      preferredCurrency: 'CHF',
      locale: 'de-CH',
      currentActor: { id: 'actor-1', type: 'individual', name: 'Mao Nakamoto' },
      lastVisitedPath: '/dashboard/projects/abc123',
    },
    stats: {
      totalProducts: 0,
      totalServices: 0,
      totalProjects: 0,
      totalCauses: 0,
      totalEvents: 0,
      totalAssets: 0,
      totalLoans: 0,
      totalInvestments: 0,
      totalResearch: 0,
      totalWishlists: 0,
      totalTasks: 0,
      urgentTasks: 0,
      totalWallets: 0,
    },
  };

  const str = buildFullContextString(ctx);

  it('emits a Current Session section at the top', () => {
    expect(str).toContain('## Current Session');
    expect(str.indexOf('## Current Session')).toBeLessThan(str.indexOf('## Current Date & Time'));
  });

  it('quotes the preferred currency', () => {
    expect(str).toContain('CHF');
  });

  it('quotes the locale', () => {
    expect(str).toContain('de-CH');
  });

  it('quotes the lastVisitedPath', () => {
    expect(str).toContain('/dashboard/projects/abc123');
  });

  it('shows the actor name and type', () => {
    expect(str).toMatch(/Acting as.+yourself.+Mao Nakamoto/);
  });

  it('falls back to en-US when locale is missing from runtime', () => {
    const stripped: FullUserContext = {
      ...ctx,
      runtime: { ...ctx.runtime, locale: '', currentActor: null, lastVisitedPath: undefined },
    };
    const s = buildFullContextString(stripped);
    // dates should format without throwing
    expect(s).toContain('## Current Date & Time');
  });
});
