/**
 * Tip service — resolve a person by username and generate a non-custodial
 * Bitcoin payment request against THEIR own wallet. Reuses the payment stack's
 * wallet resolution + invoice generation (SSOT) so a tip pays exactly like any
 * other payment on the platform: NWC > Lightning address > on-chain, zero fee,
 * OrangeCat never in the money path.
 */

import type { AnySupabaseClient } from '@/lib/supabase/types';
import { DATABASE_TABLES } from '@/config/database-tables';
import { resolveUserWallet } from '@/domain/payments/walletResolutionService';
import { generateInvoice } from '@/domain/payments/invoiceGenerationService';
import type { ResolvedWallet } from '@/domain/payments/types';
import { logger } from '@/utils/logger';

const METHOD_LABELS: Record<ResolvedWallet['method'], string> = {
  nwc: 'Lightning',
  lightning_address: 'Lightning',
  onchain: 'On-chain Bitcoin',
};

interface TipRecipient {
  userId: string;
  username: string;
  displayName: string;
}

async function resolveRecipient(
  supabase: AnySupabaseClient,
  username: string
): Promise<TipRecipient | null> {
  const { data } = await supabase
    .from(DATABASE_TABLES.PROFILES)
    .select('id, username, display_name:name')
    .eq('username', username)
    .maybeSingle();

  const row = data as { id?: string; username?: string; display_name?: string } | null;
  if (!row?.id || !row.username) {
    return null;
  }
  return { userId: row.id, username: row.username, displayName: row.display_name || row.username };
}

export interface TipReceiveInfo {
  canReceive: boolean;
  recipientName: string;
  methodLabel?: string;
}

/** Public, secret-free: can this person receive tips, and via what rail. */
export async function getTipReceiveInfo(
  supabase: AnySupabaseClient,
  username: string
): Promise<TipReceiveInfo | null> {
  const recipient = await resolveRecipient(supabase, username);
  if (!recipient) {
    return null;
  }
  const wallet = await resolveUserWallet(supabase, recipient.userId);
  return {
    canReceive: !!wallet,
    recipientName: recipient.displayName,
    methodLabel: wallet ? METHOD_LABELS[wallet.method] : undefined,
  };
}

export interface TipInvoice {
  qrData: string;
  bolt11: string | null;
  onchainAddress: string | null;
  methodLabel: string;
  recipientName: string;
  amountBtc: number;
  expiresInSeconds: number | null;
}

type TipInvoiceResult = { ok: true; invoice: TipInvoice } | { ok: false; error: string };

/** Build a payment request for `amountBtc` to the recipient's own wallet. */
export async function generateTipInvoice(
  supabase: AnySupabaseClient,
  username: string,
  amountBtc: number
): Promise<TipInvoiceResult> {
  const recipient = await resolveRecipient(supabase, username);
  if (!recipient) {
    return { ok: false, error: 'That person could not be found.' };
  }

  const wallet = await resolveUserWallet(supabase, recipient.userId);
  if (!wallet) {
    return {
      ok: false,
      error: `${recipient.displayName} hasn't set up a wallet to receive Bitcoin tips yet.`,
    };
  }

  try {
    const inv = await generateInvoice(
      wallet,
      amountBtc,
      `Tip for ${recipient.displayName} on OrangeCat`
    );
    const expiresInSeconds = inv.expires_at
      ? Math.max(0, Math.floor((new Date(inv.expires_at).getTime() - Date.now()) / 1000))
      : null;

    return {
      ok: true,
      invoice: {
        qrData: inv.qr_data,
        bolt11: inv.bolt11,
        onchainAddress: inv.onchain_address,
        methodLabel: METHOD_LABELS[wallet.method],
        recipientName: recipient.displayName,
        amountBtc,
        expiresInSeconds,
      },
    };
  } catch (err) {
    logger.error('Failed to generate tip invoice', { err: String(err), username }, 'Tips');
    return { ok: false, error: 'Could not create a tip request right now. Please try again.' };
  }
}
