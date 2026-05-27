/**
 * useSellerPaymentMethods — Checks what payment methods a seller supports
 *
 * Used to show/disable the PaymentButton on entity pages.
 * Returns whether the seller has any wallet connected.
 */

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/browser';
import { DATABASE_TABLES } from '@/config/database-tables';

interface SellerPaymentInfo {
  hasWallet: boolean;
  hasNWC: boolean;
  hasLightningAddress: boolean;
  hasOnchain: boolean;
  loading: boolean;
}

export function useSellerPaymentMethods(sellerProfileId: string | null): SellerPaymentInfo {
  const [info, setInfo] = useState<SellerPaymentInfo>({
    hasWallet: false,
    hasNWC: false,
    hasLightningAddress: false,
    hasOnchain: false,
    loading: true,
  });

  useEffect(() => {
    if (!sellerProfileId) {
      setInfo(prev => ({ ...prev, loading: false }));
      return;
    }

    let cancelled = false;
    const profileId = sellerProfileId;

    async function check() {
      type WalletRow = {
        id: string;
        wallet_type: string | null;
        lightning_address: string | null;
        address_or_xpub: string | null;
      };
      const { data: rawWallets } = await supabase
        .from(DATABASE_TABLES.WALLETS)
        .select('id, wallet_type, lightning_address, address_or_xpub')
        .eq('profile_id', profileId!)
        .eq('is_active', true);
      if (cancelled) {
        return;
      }
      const wallets = (rawWallets || []) as WalletRow[];

      if (wallets.length === 0) {
        setInfo({
          hasWallet: false,
          hasNWC: false,
          hasLightningAddress: false,
          hasOnchain: false,
          loading: false,
        });
        return;
      }

      setInfo({
        hasWallet: true,
        hasNWC: wallets.some(w => w.wallet_type === 'nwc'),
        hasLightningAddress: wallets.some(w => !!w.lightning_address),
        hasOnchain: wallets.some(w => !!w.address_or_xpub),
        loading: false,
      });
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [sellerProfileId]);

  return info;
}
