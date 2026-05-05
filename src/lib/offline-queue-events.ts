// Lightweight event helpers for the offline queue lifecycle.
// Keep this React-agnostic so libs and hooks can both use it.

type SyncProgressDetail = { processed: number; total: number };

const UPDATED = 'offline-queue:updated';
const SYNC_START = 'offline-queue:sync-start';
const SYNC_PROGRESS = 'offline-queue:sync-progress';
const SYNC_COMPLETE = 'offline-queue:sync-complete';

export function queueUpdated(): void {
  if (typeof window === 'undefined') {
    return;
  }
  // New namespaced event
  window.dispatchEvent(new CustomEvent(UPDATED));
  // Back-compat for any legacy listeners
  window.dispatchEvent(new CustomEvent('offline-queue-updated'));
}
