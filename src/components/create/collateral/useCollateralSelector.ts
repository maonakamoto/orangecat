'use client';

import { useState, useEffect, useMemo } from 'react';
import { logger } from '@/utils/logger';
import { DEFAULT_CURRENCY } from '@/config/currencies';
import { convertBtcTo } from '@/services/currency';
import { ENTITY_REGISTRY } from '@/config/entity-registry';
import type { CollateralItem } from './CollateralSelector';

const SATS_PER_BTC = 100_000_000;

interface UseCollateralSelectorParams {
  profileId?: string;
  selectedCollateral: CollateralItem[];
  onCollateralChange: (items: CollateralItem[]) => void;
  loanAmount?: number;
}

export function useCollateralSelector({
  profileId,
  selectedCollateral,
  onCollateralChange,
  loanAmount,
}: UseCollateralSelectorParams) {
  const [assets, setAssets] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!profileId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [assetsRes, walletsRes] = await Promise.all([
          fetch(ENTITY_REGISTRY.asset.apiEndpoint, { credentials: 'include' }),
          fetch(`/api/wallets?profile_id=${profileId}`, { credentials: 'include' }),
        ]);
        if (assetsRes.ok) {
          setAssets((await assetsRes.json()).data || []);
        }
        if (walletsRes.ok) {
          setWallets((await walletsRes.json()).data || []);
        }
      } catch (error) {
        logger.error('Failed to fetch collateral options', error, 'Collateral');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profileId]);

  const totalCollateral = useMemo(
    () => selectedCollateral.reduce((sum, item) => sum + item.value, 0),
    [selectedCollateral]
  );

  const coveragePercentage = useMemo(() => {
    if (!loanAmount || loanAmount === 0) {
      return null;
    }
    return Math.min(100, (totalCollateral / loanAmount) * 100);
  }, [totalCollateral, loanAmount]);

  const handleAddAsset = (asset: any) => {
    onCollateralChange([
      ...selectedCollateral,
      {
        id: asset.id,
        type: 'asset' as const,
        name: asset.title,
        value: asset.estimated_value || 0,
        currency: asset.currency || DEFAULT_CURRENCY,
        metadata: { verification_status: asset.verification_status },
      },
    ]);
    setShowAssetSelector(false);
  };

  const handleAddWallet = (wallet: any) => {
    const btcValue = wallet.balance_btc || 0;
    onCollateralChange([
      ...selectedCollateral,
      {
        id: wallet.id,
        type: 'wallet' as const,
        name: wallet.label,
        value: convertBtcTo(btcValue, DEFAULT_CURRENCY),
        currency: DEFAULT_CURRENCY,
        metadata: { balance_btc: btcValue },
      },
    ]);
    setShowWalletSelector(false);
  };

  const handleRemoveCollateral = (id: string) => {
    onCollateralChange(selectedCollateral.filter(item => item.id !== id));
  };

  const toggleAssetSelector = () => {
    setShowAssetSelector(prev => !prev);
    setShowWalletSelector(false);
  };

  const toggleWalletSelector = () => {
    setShowWalletSelector(prev => !prev);
    setShowAssetSelector(false);
  };

  return {
    assets,
    wallets,
    loading,
    showAssetSelector,
    showWalletSelector,
    totalCollateral,
    coveragePercentage,
    SATS_PER_BTC,
    handleAddAsset,
    handleAddWallet,
    handleRemoveCollateral,
    toggleAssetSelector,
    toggleWalletSelector,
  };
}
