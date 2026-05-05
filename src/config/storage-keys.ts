/**
 * Storage Keys Configuration
 *
 * SSOT for all localStorage/sessionStorage keys used in the application.
 * Centralizes key definitions to prevent typos and ensure consistency.
 *
 * Created: 2026-01-28
 * Last Modified: 2026-01-28
 * Last Modified Summary: Initial creation - centralized prefill keys
 */

import { EntityType } from './entity-registry';

/**
 * LocalStorage key generators and constants
 */
export const STORAGE_KEYS = {
  /**
   * Entity prefill data key - used for passing prefill data to create pages
   * @param entityType - The entity type (product, service, project, etc.)
   */
  ENTITY_PREFILL: (entityType: EntityType) => `${entityType}_prefill`,

  /**
   * User preferences
   */
  USER_CURRENCY: 'user_currency',
  USER_THEME: 'user_theme',
  USER_LOCALE: 'user_locale',

  /**
   * Draft/autosave keys
   */
  ENTITY_DRAFT: (entityType: EntityType) => `${entityType}_draft`,

  /**
   * UI state persistence
   */
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  LAST_VISITED_PATH: 'last_visited_path',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_STEP: 'onboarding_step',

  /**
   * Chat state
   */
  CHAT_HISTORY: 'chat_history',
  CHAT_DRAFT: 'chat_draft',
} as const;
