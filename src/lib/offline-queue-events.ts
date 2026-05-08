// Lightweight event helpers for the offline queue lifecycle.
// Keep this React-agnostic so libs and hooks can both use it.

const UPDATED = 'offline-queue:updated';

export function queueUpdated(): void {
  if (typeof window === 'undefined') {
    return;
  }
  // New namespaced event
  window.dispatchEvent(new CustomEvent(UPDATED));
  // Back-compat for any legacy listeners
  window.dispatchEvent(new CustomEvent('offline-queue-updated'));
}
