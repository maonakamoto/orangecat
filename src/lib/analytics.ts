/**
 * Analytics Service for OrangeCat
 *
 * Provides a unified interface for tracking user events.
 * Currently logs to console in development and persists to localStorage for debugging.
 * To add a real analytics provider, replace the console/localStorage logic below.
 */

import { logger } from '@/utils/logger';

// Event types for type safety
type AnalyticsEvent =
  // Registration funnel
  | 'page_view'
  | 'registration_started'
  | 'registration_form_submitted'
  | 'registration_success'
  | 'registration_error'
  | 'email_confirmation_sent'
  | 'email_confirmed'
  | 'login_started'
  | 'login_success'
  | 'login_error'
  // Onboarding funnel
  | 'onboarding_started'
  | 'onboarding_step_viewed'
  | 'onboarding_step_completed'
  | 'onboarding_skipped'
  | 'onboarding_completed'
  // Key actions
  | 'wallet_address_added'
  | 'project_created'
  | 'project_published'
  | 'project_draft_saved'
  | 'first_support_received'
  | 'profile_updated'
  | 'timeline_post_created'
  // Entity lifecycle
  | 'entity_created'
  | 'entity_published'
  // Retention events
  | 'session_started'
  | 'feature_used'
  | 'share_clicked';

interface AnalyticsProperties {
  [key: string]: string | number | boolean | undefined | null;
}

const isDev = process.env.NODE_ENV === 'development';

/** Track an analytics event */
export function trackEvent(event: AnalyticsEvent, properties?: AnalyticsProperties) {
  if (typeof window === 'undefined') {
    return;
  }

  const enrichedProperties = {
    ...properties,
    timestamp: new Date().toISOString(),
    url: window.location.pathname,
    referrer: document.referrer || undefined,
  };

  if (isDev) {
    logger.debug(`[${event}]`, enrichedProperties, 'analytics');
  }

  try {
    const events = JSON.parse(localStorage.getItem('orangecat_analytics') || '[]');
    events.push({ event, properties: enrichedProperties });
    if (events.length > 100) {
      events.shift();
    }
    localStorage.setItem('orangecat_analytics', JSON.stringify(events));
  } catch {
    // ignore storage errors
  }
}

/** Track page view */
export function trackPageView(pageName: string, properties?: AnalyticsProperties) {
  trackEvent('page_view', { page: pageName, ...properties });
}

/** Track registration funnel events */
export const registrationEvents = {
  started: (properties?: AnalyticsProperties) => trackEvent('registration_started', properties),
  formSubmitted: (properties?: AnalyticsProperties) =>
    trackEvent('registration_form_submitted', properties),
  success: (properties?: AnalyticsProperties) => trackEvent('registration_success', properties),
  error: (error: string, properties?: AnalyticsProperties) =>
    trackEvent('registration_error', { error, ...properties }),
  emailSent: (properties?: AnalyticsProperties) =>
    trackEvent('email_confirmation_sent', properties),
  emailConfirmed: (properties?: AnalyticsProperties) => trackEvent('email_confirmed', properties),
};

/** Track onboarding funnel events */
export const onboardingEvents = {
  started: (userId?: string) => trackEvent('onboarding_started', { userId }),
  stepViewed: (step: number, stepName: string, userId?: string) =>
    trackEvent('onboarding_step_viewed', { step, stepName, userId }),
  stepCompleted: (step: number, stepName: string, userId?: string) =>
    trackEvent('onboarding_step_completed', { step, stepName, userId }),
  skipped: (atStep: number, userId?: string) =>
    trackEvent('onboarding_skipped', { atStep, userId }),
  completed: (userId?: string) => trackEvent('onboarding_completed', { userId }),
};

/** Track entity lifecycle events (covers all entity types generically) */
export const entityEvents = {
  created: (entityType: string, entityId: string, userId?: string) =>
    trackEvent('entity_created', { entityType, entityId, userId }),
  published: (entityType: string, entityId: string, userId?: string) =>
    trackEvent('entity_published', { entityType, entityId, userId }),
};
