'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { NostrAuthState, NostrProfile } from '@/lib/nostr/types';
import {
  hasNip07Extension,
  getPublicKeyFromExtension,
  hexToNpub,
  isValidNpub,
  decodeBech32,
  fetchProfile,
} from '@/lib/nostr';
import { logger } from '@/utils/logger';
import {
  loadPersistedNostrState,
  persistNostrState,
  clearNostrStorage,
  STORAGE_KEY_NWC,
} from './nostrStorage';

const INITIAL_STATE: NostrAuthState = {
  connected: false,
  npub: null,
  pubkey: null,
  profile: null,
  nwcConnected: false,
  method: null,
};

export function useNostr() {
  const [state, setState] = useState<NostrAuthState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) {
      return;
    }
    initialized.current = true;

    const persisted = loadPersistedNostrState();
    if (persisted.connected && persisted.pubkey) {
      setState(prev => ({ ...prev, ...persisted, profile: null }));

      fetchProfile(persisted.pubkey).then(profileData => {
        if (profileData) {
          setState(prev => ({ ...prev, profile: profileData as NostrProfile }));
        }
      });
    }
  }, []);

  const connectWithExtension = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!hasNip07Extension()) {
        throw new Error('No Nostr extension found. Install Alby or nos2x to connect.');
      }

      const pubkey = await getPublicKeyFromExtension();
      const npub = hexToNpub(pubkey);
      const profileData = await fetchProfile(pubkey);

      const newState: NostrAuthState = {
        connected: true,
        npub,
        pubkey,
        profile: (profileData as NostrProfile) ?? null,
        nwcConnected: !!localStorage.getItem(STORAGE_KEY_NWC),
        method: 'nip07',
      };

      setState(newState);
      persistNostrState(newState);
      logger.info('Nostr connected via NIP-07', { npub });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect with Nostr';
      setError(message);
      logger.warn('Nostr NIP-07 connection failed', { error: err });
    } finally {
      setLoading(false);
    }
  }, []);

  const connectWithNpub = useCallback(async (npubOrHex: string) => {
    setLoading(true);
    setError(null);

    try {
      let pubkey: string;
      let npub: string;

      if (isValidNpub(npubOrHex)) {
        const decoded = decodeBech32(npubOrHex);
        pubkey = decoded.hex;
        npub = npubOrHex;
      } else if (/^[0-9a-f]{64}$/.test(npubOrHex)) {
        pubkey = npubOrHex;
        npub = hexToNpub(npubOrHex);
      } else {
        throw new Error('Invalid npub or hex public key');
      }

      const profileData = await fetchProfile(pubkey);

      const newState: NostrAuthState = {
        connected: true,
        npub,
        pubkey,
        profile: (profileData as NostrProfile) ?? null,
        nwcConnected: false,
        method: null,
      };

      setState(newState);
      persistNostrState(newState);
      logger.info('Nostr connected via npub', { npub });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setState(INITIAL_STATE);
    clearNostrStorage();
    logger.info('Nostr disconnected');
  }, []);

  const saveNWCUri = useCallback((uri: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_NWC, uri);
    }
    setState(prev => ({ ...prev, nwcConnected: true }));
  }, []);

  const getNWCUri = useCallback((): string | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem(STORAGE_KEY_NWC);
  }, []);

  const removeNWC = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_NWC);
    }
    setState(prev => ({ ...prev, nwcConnected: false }));
  }, []);

  return {
    ...state,
    loading,
    error,
    hasExtension: typeof window !== 'undefined' && hasNip07Extension(),
    connectWithExtension,
    connectWithNpub,
    disconnect,
    saveNWCUri,
    getNWCUri,
    removeNWC,
  };
}
