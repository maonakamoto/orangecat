/**
 * tip-service — recipient resolution + non-custodial invoice generation. Mocks
 * the reused payment primitives so we test the tip orchestration in isolation:
 * unknown person, person without a wallet, and the happy path invoice shape.
 */

import { generateTipInvoice, getTipReceiveInfo } from '@/domain/tips/tip-service';
import { resolveUserWallet } from '@/domain/payments/walletResolutionService';
import { generateInvoice } from '@/domain/payments/invoiceGenerationService';

jest.mock('@/domain/payments/walletResolutionService', () => ({
  resolveUserWallet: jest.fn(),
}));
jest.mock('@/domain/payments/invoiceGenerationService', () => ({
  generateInvoice: jest.fn(),
}));

const mockResolveWallet = resolveUserWallet as jest.MockedFunction<typeof resolveUserWallet>;
const mockGenerateInvoice = generateInvoice as jest.MockedFunction<typeof generateInvoice>;

/** Minimal supabase stub whose profiles lookup resolves to `profile`. */
function supabaseWith(profile: Record<string, unknown> | null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: profile, error: null }),
        }),
      }),
    }),
  } as never;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getTipReceiveInfo', () => {
  it('returns null for an unknown username', async () => {
    expect(await getTipReceiveInfo(supabaseWith(null), 'ghost')).toBeNull();
    expect(mockResolveWallet).not.toHaveBeenCalled();
  });

  it('reports canReceive=false when the person has no wallet', async () => {
    mockResolveWallet.mockResolvedValue(null);
    const info = await getTipReceiveInfo(
      supabaseWith({ id: 'u1', username: 'alice', display_name: 'Alice' }),
      'alice'
    );
    expect(info).toEqual({ canReceive: false, recipientName: 'Alice', methodLabel: undefined });
  });

  it('reports the rail label when a wallet exists', async () => {
    mockResolveWallet.mockResolvedValue({ method: 'onchain', wallet_id: 'w1', onchain_address: 'bc1x' });
    const info = await getTipReceiveInfo(
      supabaseWith({ id: 'u1', username: 'bob', display_name: 'Bob' }),
      'bob'
    );
    expect(info).toEqual({ canReceive: true, recipientName: 'Bob', methodLabel: 'On-chain Bitcoin' });
  });
});

describe('generateTipInvoice', () => {
  it('errors when the person cannot be found', async () => {
    const r = await generateTipInvoice(supabaseWith(null), 'ghost', 0.0001);
    expect(r).toEqual({ ok: false, error: 'That person could not be found.' });
  });

  it('errors (no throw) when the recipient has no wallet', async () => {
    mockResolveWallet.mockResolvedValue(null);
    const r = await generateTipInvoice(
      supabaseWith({ id: 'u1', username: 'alice', display_name: 'Alice' }),
      'alice',
      0.0001
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/hasn't set up a wallet/);
  });

  it('returns a non-custodial invoice for the recipient wallet', async () => {
    mockResolveWallet.mockResolvedValue({
      method: 'lightning_address',
      wallet_id: 'w1',
      lightning_address: 'bob@ln.tld',
    });
    mockGenerateInvoice.mockResolvedValue({
      bolt11: 'lnbc1...',
      payment_hash: 'hash',
      onchain_address: null,
      lnurl_verify_url: null,
      qr_data: 'LNBC1...',
      expires_at: null,
    });

    const r = await generateTipInvoice(
      supabaseWith({ id: 'u1', username: 'bob', display_name: 'Bob' }),
      'bob',
      0.0005
    );

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.invoice).toMatchObject({
        qrData: 'LNBC1...',
        bolt11: 'lnbc1...',
        methodLabel: 'Lightning',
        recipientName: 'Bob',
        amountBtc: 0.0005,
      });
    }
    // The invoice is built against the recipient's own wallet — never a platform wallet.
    expect(mockGenerateInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ lightning_address: 'bob@ln.tld' }),
      0.0005,
      expect.stringContaining('Tip for Bob')
    );
  });
});
