/**
 * Backwards-compatible shim around the SSOT `useIsDesktop` hook.
 * Prefer importing `useIsDesktop` directly from `@/hooks/useMediaQuery`.
 */
import { useIsDesktop } from '@/hooks/useMediaQuery';

export function useResponsiveLayout() {
  return { isDesktop: useIsDesktop() };
}
