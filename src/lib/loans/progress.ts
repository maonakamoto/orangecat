/**
 * Loan funding-progress calculation.
 *
 * Lives in a NON-client module so it can be called from server components (the
 * public + dashboard loan detail pages render server-side). It previously lived in
 * the `'use client'` useLoanList hook, which made `calculateProgress()` a client
 * reference — calling it from a server component threw "Attempted to call
 * calculateProgress() from the server but it's on the client" and crashed the page.
 */
export const calculateProgress = (original: number, remaining: number): number => {
  if (!original || original === 0) {
    return 0;
  }
  return ((original - remaining) / original) * 100;
};
