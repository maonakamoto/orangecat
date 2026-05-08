'use client';

import { useCallback, useEffect, useState } from 'react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useNostr } from '@/hooks/useNostr';
import { NWCClient } from '@/lib/nostr/nwc';
import { isValidNWCUri } from '@/lib/nostr';
import { logger } from '@/utils/logger';

export function useNostrConnectionCard() {
  const {
    connected,
    npub,
    profile,
    nwcConnected,
    loading,
    error,
    hasExtension,
    connectWithExtension,
    connectWithNpub,
    disconnect,
    saveNWCUri,
    getNWCUri,
    removeNWC,
  } = useNostr();

  const [showNpubInput, setShowNpubInput] = useState(false);
  const [npubInput, setNpubInput] = useState('');
  const [showNwcInput, setShowNwcInput] = useState(false);
  const [nwcInput, setNwcInput] = useState('');
  const [nwcError, setNwcError] = useState<string | null>(null);
  const { copied, copy: copyToClipboard } = useCopyToClipboard();
  const [balanceSats, setBalanceSats] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    const nwcUri = getNWCUri();
    if (!nwcUri || !nwcConnected) {
      return;
    }

    setBalanceLoading(true);
    const client = new NWCClient(nwcUri);
    try {
      await client.connect();
      const sats = await client.getBalance();
      setBalanceSats(sats);
    } catch (err) {
      logger.warn('Failed to fetch NWC balance', { error: err });
    } finally {
      client.disconnect();
      setBalanceLoading(false);
    }
  }, [getNWCUri, nwcConnected]);

  useEffect(() => {
    if (nwcConnected) {
      fetchBalance();
    } else {
      setBalanceSats(null);
    }
  }, [nwcConnected, fetchBalance]);

  const handleNpubConnect = () => {
    if (npubInput.trim()) {
      connectWithNpub(npubInput.trim());
      setShowNpubInput(false);
      setNpubInput('');
    }
  };

  const handleNwcConnect = () => {
    setNwcError(null);
    if (!isValidNWCUri(nwcInput.trim())) {
      setNwcError('Invalid NWC URI. It should start with nostr+walletconnect://');
      return;
    }
    saveNWCUri(nwcInput.trim());
    setShowNwcInput(false);
    setNwcInput('');
  };

  const handleCancelNwc = () => {
    setShowNwcInput(false);
    setNwcInput('');
    setNwcError(null);
  };

  const handleCancelNpub = () => {
    setShowNpubInput(false);
    setNpubInput('');
  };

  const handleCopyNpub = async () => {
    if (npub) {
      await copyToClipboard(npub);
    }
  };

  return {
    connected,
    npub,
    profile,
    nwcConnected,
    loading,
    error,
    hasExtension,
    connectWithExtension,
    disconnect,
    removeNWC,
    showNpubInput,
    setShowNpubInput,
    npubInput,
    setNpubInput,
    showNwcInput,
    setShowNwcInput,
    nwcInput,
    setNwcInput,
    nwcError,
    copied,
    balanceSats,
    balanceLoading,
    handleNpubConnect,
    handleNwcConnect,
    handleCancelNwc,
    handleCancelNpub,
    handleCopyNpub,
  };
}
