'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, WalletFormData } from '@/types/wallet';
import { logger } from '@/utils/logger';
import { parseErrorResponse } from '@/lib/wallets/errorHandling';
import { toast } from 'sonner';
import { API_ROUTES } from '@/config/api-routes';

interface UseWalletOperationsOptions {
  userId: string | undefined;
  profileId: string | undefined;
  setWallets: React.Dispatch<React.SetStateAction<Wallet[]>>;
}

interface DuplicateDialogState {
  isOpen: boolean;
  walletData: WalletFormData | null;
  existingWallets: Array<{ id: string; label: string; category: string }> | null;
}

const WALLET_AUTH_REDIRECT = '/auth?mode=login&from=/dashboard/wallets';

async function callWalletApi(
  url: string,
  options: RequestInit,
  router: ReturnType<typeof useRouter>,
  context: string
): Promise<unknown | null> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    logger.error(
      `Network error during ${context}`,
      { error: err instanceof Error ? err.message : String(err) },
      'WalletManagement'
    );
    toast.error('Network error. Please check your connection and try again.');
    return null;
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      logger.warn(`Auth required for ${context}`, { status: response.status }, 'WalletManagement');
      toast.error('Please log in to manage wallets');
      router.push(WALLET_AUTH_REDIRECT);
      return null;
    }
    const errorMessage = await parseErrorResponse(response);
    logger.error(`Failed: ${context}`, { status: response.status }, 'WalletManagement');
    throw new Error(errorMessage);
  }

  return response.json();
}

export function useWalletOperations({ userId, profileId, setWallets }: UseWalletOperationsOptions) {
  const router = useRouter();
  const [duplicateDialog, setDuplicateDialog] = useState<DuplicateDialogState>({
    isOpen: false,
    walletData: null,
    existingWallets: null,
  });

  const handleAddWallet = async (data: WalletFormData) => {
    if (!userId || !profileId) {
      logger.error('User or profile ID not available for wallet creation', {}, 'WalletManagement');
      toast.error('Authentication error. Please refresh the page and try again.');
      return;
    }

    if (!data.label?.trim()) {
      toast.error('Wallet name is required');
      return;
    }
    if (!data.address_or_xpub?.trim()) {
      toast.error('Wallet address is required');
      return;
    }
    if (!data.category) {
      toast.error('Wallet category is required');
      return;
    }

    try {
      const responseData = (await callWalletApi(
        API_ROUTES.WALLETS.BASE,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
          body: JSON.stringify({ ...data, profile_id: profileId }),
        },
        router,
        'wallet creation'
      )) as Record<string, unknown> | null;

      if (responseData === null) {
        return;
      }

      const inner = responseData?.data as Record<string, unknown> | undefined;
      const duplicateWarning = inner?.duplicateWarning as
        | { existingWallets: Array<{ id: string; label: string; category: string }> }
        | undefined;
      if (duplicateWarning) {
        setDuplicateDialog({
          isOpen: true,
          walletData: data,
          existingWallets: duplicateWarning.existingWallets,
        });
        return;
      }

      const newWallet = (inner?.wallet ?? inner) as Wallet | undefined;
      if (!newWallet?.id) {
        logger.error('Invalid wallet data returned', { newWallet, profileId }, 'WalletManagement');
        toast.error('Wallet creation failed: invalid data returned');
        return;
      }

      setWallets(prev => [...prev, newWallet]);
      toast.success('Wallet added successfully');
      logger.info(
        'Wallet added successfully',
        { walletId: newWallet.id, profileId },
        'WalletManagement'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add wallet';
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleConfirmDuplicateWallet = async () => {
    if (!duplicateDialog.walletData || !userId || !profileId) {
      return;
    }

    try {
      const responseData = (await callWalletApi(
        API_ROUTES.WALLETS.BASE,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...duplicateDialog.walletData,
            profile_id: profileId,
            force_duplicate: true,
          }),
        },
        router,
        'duplicate wallet creation'
      )) as Record<string, unknown> | null;

      if (responseData === null) {
        return;
      }

      const inner = responseData?.data as Record<string, unknown> | undefined;
      const newWallet = (inner?.wallet ?? inner) as Wallet;
      setWallets(prev => [newWallet, ...prev]);
      toast.success('Wallet added successfully');
      logger.info(
        'Wallet added with duplicate confirmation',
        { walletId: newWallet.id, profileId },
        'WalletManagement'
      );
      setDuplicateDialog({ isOpen: false, walletData: null, existingWallets: null });
    } catch (error) {
      toast.error(
        `Failed to add wallet: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
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
