import { redirect } from 'next/navigation';
import { ROUTES } from '@/config/routes';

/**
 * Legacy /onboarding entry point. The standard multi-step wizard was
 * removed on 2026-06-05 — IntelligentOnboarding at /onboarding/intelligent
 * is now the single canonical surface. Preserved as a permanent redirect
 * for any external bookmarks.
 */
export default function OnboardingPage() {
  redirect(ROUTES.ONBOARDING.INTELLIGENT);
}
