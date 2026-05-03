import type { NostrAuthState } from '@/lib/nostr/types';

const STORAGE_KEY_NOSTR = 'orangecat_nostr_state';
export const STORAGE_KEY_NWC = 'orangecat_nwc_uri';

export function loadPersistedNostrState(): Partial<NostrAuthState> {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY_NOSTR);
    if (!stored) {
      return {};
    }
    return JSON.parse(stored) as Partial<NostrAuthState>;
  } catch {
    return {};
  }
}

export function persistNostrState(state: NostrAuthState): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(
      STORAGE_KEY_NOSTR,
      JSON.stringify({
        connected: state.connected,
        npub: state.npub,
        pubkey: state.pubkey,
        method: state.method,
      })
    );
  } catch {
    // localStorage may be full or disabled
  }
}

export function clearNostrStorage(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_NOSTR);
    localStorage.removeItem(STORAGE_KEY_NWC);
  }
}
