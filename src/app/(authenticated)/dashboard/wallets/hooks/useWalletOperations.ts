'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, WalletFormData } from '@/types/wallet';
import { toast } from 'sonner';
import { API_ROUTES } from '@/config/api-routes';
import {
  callWalletApi,
  addWallet,
  confirmDuplicateWallet,
  type DuplicateDialogState,
} from './walletApiUtils';

interface UseWalletOperationsOptions {
  userId: string | undefined;
  profileId: string | undefined;
  setWallets: React.Dispatch<React.SetStateAction<Wallet[]>>;
}

export function useWalletOperations({ userId, profileId, setWallets }: UseWalletOperationsOptions) {
  const router = useRouter();
  const [duplicateDialog, setDuplicateDialog] = useState<DuplicateDialogState>({
    isOpen: false,
    walletData: null,
    existingWallets: null,
  });

  const handleAddWallet = async (data: WalletFormData) => {
    await addWallet({
      data,
      userId: userId ?? '',
      profileId: profileId ?? '',
      router,
      setWallets,
      setDuplicateDialog,
    });
  };

  const handleConfirmDuplicateWallet = async () => {
    if (!duplicateDialog.walletData || !profileId) {
      return;
    }
    await confirmDuplicateWallet({
      walletData: duplicateDialog.walletData,
      profileId,
      router,
      setWallets,
      setDuplicateDialog,
    });
  };

  const handleCancelDuplicateWallet = () => {
    setDuplicateDialog({ isOpen: false, walletData: null, existingWallets: null });
  };

  const handleUpdateWallet = async (walletId: string, data: Partial<WalletFormData>) => {
    try {
      const responseData = (await callWalletApi(
        `${API_ROUTES.WALLETS.BASE}/${walletId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, profile_id: profileId }),
        },
        router,
        'wallet update'
      )) as Record<string, unknown> | null;

      if (responseData === null) {
        return;
      }

      const updatedWallet = (responseData?.data ??
        (responseData as Record<string, unknown>)?.wallet ??
        responseData) as Wallet;
      if (!updatedWallet) {
        throw new Error('Wallet update failed: no wallet data returned');
      }

      setWallets(prev => prev.map(w => (w.id === walletId ? updatedWallet : w)));
      toast.success('Wallet updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update wallet');
    }
  };

  const handleDeleteWallet = async (walletId: string) => {
    try {
      const result = await callWalletApi(
        `${API_ROUTES.WALLETS.BASE}/${walletId}`,
        { method: 'DELETE' },
        router,
        'wallet deletion'
      );
      if (result === null) {
        return;
      }
      setWallets(prev => prev.filter(w => w.id !== walletId));
      toast.success('Wallet deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete wallet');
    }
  };

  const handleRefreshWallet = async (walletId: string) => {
    try {
      const responseData = (await callWalletApi(
        `${API_ROUTES.WALLETS.BASE}/${walletId}/refresh`,
        { method: 'POST' },
        router,
        'wallet refresh'
      )) as Record<string, unknown> | null;

      if (responseData === null) {
        return;
      }

      const inner = responseData?.data as Record<string, unknown> | undefined;
      const refreshedWallet = (inner?.wallet ?? inner) as Wallet;
      setWallets(prev => prev.map(w => (w.id === walletId ? refreshedWallet : w)));
      toast.success('Wallet refreshed successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to refresh wallet');
      throw error;
    }
  };

  return {
    handleAddWallet,
    handleUpdateWallet,
    handleDeleteWallet,
    handleRefreshWallet,
    handleConfirmDuplicateWallet,
    handleCancelDuplicateWallet,
    duplicateDialog,
  };
}
