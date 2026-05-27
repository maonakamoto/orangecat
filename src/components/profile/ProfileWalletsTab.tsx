'use client';

import { useState, useEffect } from 'react';
import type { ScalableProfile } from '@/services/profile/types';
import { Wallet } from '@/types/wallet';
import { logger } from '@/utils/logger';
import ProfileWalletSection from '@/components/profile/ProfileWalletSection';
import { toast } from 'sonner';
import { API_ROUTES } from '@/config/api-routes';

interface ProfileWalletsTabProps {
  profile: ScalableProfile;
  isOwnProfile: boolean;
}

/**
 * ProfileWalletsTab Component
 *
 * Displays all wallet addresses and payment methods for the profile.
 * Supports both multi-wallet system and legacy addresses.
 *
 * Best Practices:
 * - DRY: Reuses existing wallet components
 * - Modular: Separate tab for wallet info
 * - Progressive: Lazy loaded on first click
 * - Minimal clicks: All wallet info in one place
 */
export default function ProfileWalletsTab({ profile, isOwnProfile }: ProfileWalletsTabProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);

  // Load wallets on mount
  useEffect(() => {
    const controller = new AbortController();
    const loadWallets = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_ROUTES.WALLETS.BASE}?profile_id=${profile.id}`, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) {
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (controller.signal.aborted) {
            return;
          }
          setWallets(data.data || []);
        } else {
          const errText = await response.text().catch(() => '');
          if (controller.signal.aborted) {
            return;
          }
          toast.error('Unable to load wallets', {
            description: errText || 'Please try again.',
          });
          setWallets([]);
        }
      } catch (error) {
        if ((error as { name?: string }).name === 'AbortError') {
          return;
        }
        logger.error('Failed to load wallets', error, 'ProfileWalletsTab');
        toast.error('Network error loading wallets');
        setWallets([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadWallets();
    return () => controller.abort();
  }, [profile.id]);

  return (
    <ProfileWalletSection
      wallets={wallets}
      loading={loading}
      isOwnProfile={isOwnProfile}
      legacyBitcoinAddress={profile.bitcoin_address}
      legacyLightningAddress={profile.lightning_address}
      legacyBalance={undefined}
    />
  );
}
