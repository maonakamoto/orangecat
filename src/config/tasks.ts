/**
 * Task Management Configuration - Single Source of Truth
 *
 * All task-related constants, labels, and types.
 * Components should import from here instead of defining their own mappings.
 *
 * BENEFITS:
 * - Consistent task presentation across the app
 * - Easy to update labels/colors in one place
 * - Follows DRY and SSOT principles from CLAUDE.md
 *
 * Created: 2026-02-05
 */

import { BADGE_COLORS } from '@/config/badge-colors';

// ==================== TASK TYPES ====================

/**
 * Task types define how a task behaves
 * - one_time: Complete once, then done
 * - recurring_scheduled: Happens on a schedule (e.g., weekly cleaning)
 * - recurring_as_needed: Done when needed, no fixed schedule
 */
export const TASK_TYPES = {
  ONE_TIME: 'one_time',
  RECURRING_SCHEDULED: 'recurring_scheduled',
  RECURRING_AS_NEEDED: 'recurring_as_needed',
} as const;

export type TaskType = (typeof TASK_TYPES)[keyof typeof TASK_TYPES];

export const TASK_TYPE_OPTIONS = Object.values(TASK_TYPES);

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  one_time: 'One-time',
  recurring_scheduled: 'Recurring (scheduled)',
  recurring_as_needed: 'Recurring (as needed)',
};

// ==================== TASK STATUSES ====================

/**
 * Task statuses reflect the current state
 * - idle: Ready, no action needed
 * - needs_attention: Someone flagged it as needing attention
 * - requested: Someone specifically requested it to be done
 * - in_progress: Someone is working on it
 */
export const TASK_STATUSES = {
  IDLE: 'idle',
  NEEDS_ATTENTION: 'needs_attention',
  REQUESTED: 'requested',
  IN_PROGRESS: 'in_progress',
} as const;

export type TaskStatus = (typeof TASK_STATUSES)[keyof typeof TASK_STATUSES];

export const TASK_STATUS_OPTIONS = Object.values(TASK_STATUSES);

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  idle: 'Ready',
  needs_attention: 'Needs Attention',
  requested: 'Requested',
  in_progress: 'In Progress',
};

export interface TaskStatusInfo {
  label: string;
  className: string;
  description?: string;
}

const TASK_STATUS_CONFIG: Record<TaskStatus, TaskStatusInfo> = {
  idle: {
    label: 'Ready',
    className: BADGE_COLORS.neutral,
    description: 'Task is ready and waiting',
  },
  needs_attention: {
    label: 'Needs Attention',
    className: BADGE_COLORS.amber,
    description: 'Someone flagged this task as urgent',
  },
  requested: {
    label: 'Requested',
    className: BADGE_COLORS.info,
    description: 'Someone has been asked to complete this task',
  },
  in_progress: {
    label: 'In Progress',
    className: BADGE_COLORS.tiffany,
    description: 'Someone is currently working on this',
  },
};

// ==================== TASK CATEGORIES ====================

/**
 * Categories for organizing tasks
 */
export const TASK_CATEGORIES = {
  CLEANING: 'cleaning',
  MAINTENANCE: 'maintenance',
  ADMIN: 'admin',
  INVENTORY: 'inventory',
  IT: 'it',
  KITCHEN: 'kitchen',
  WORKSHOP: 'workshop',
  LOGISTICS: 'logistics',
  OTHER: 'other',
} as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[keyof typeof TASK_CATEGORIES];

export const TASK_CATEGORY_OPTIONS = Object.values(TASK_CATEGORIES);

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  cleaning: 'Cleaning',
  maintenance: 'Maintenance',
  admin: 'Administration',
  inventory: 'Inventory',
  it: 'IT',
  kitchen: 'Kitchen',
  workshop: 'Workshop',
  logistics: 'Logistics',
  other: 'Other',
};

// ==================== PRIORITIES ====================

/**
 * Task priority levels
 */
export const PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type Priority = (typeof PRIORITIES)[keyof typeof PRIORITIES];

export const PRIORITY_OPTIONS = Object.values(PRIORITIES);

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export interface PriorityInfo {
  label: string;
  className: string;
  order: number;
}

const PRIORITY_CONFIG: Record<Priority, PriorityInfo> = {
  low: {
    label: 'Low',
    className: BADGE_COLORS.muted,
    order: 1,
  },
  normal: {
    label: 'Normal',
    className: BADGE_COLORS.neutral,
    order: 2,
  },
  high: {
    label: 'High',
    className: BADGE_COLORS.orange,
    order: 3,
  },
  urgent: {
    label: 'Urgent',
    className: BADGE_COLORS.error,
    order: 4,
  },
};

const TASK_PROJECT_STATUSES = {
  PLANNING: 'planning',
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const TASK_PROJECT_STATUS_OPTIONS = Object.values(TASK_PROJECT_STATUSES);

export const REQUEST_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  COMPLETED: 'completed',
} as const;

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get status info for a task status
 */
export function getTaskStatusInfo(status: string | null | undefined): TaskStatusInfo {
  if (!status) {
    return {
      label: 'Unknown',
      className: BADGE_COLORS.neutral,
    };
  }

  const normalized = status.toLowerCase() as TaskStatus;
  return (
    TASK_STATUS_CONFIG[normalized] || {
      label: status.charAt(0).toUpperCase() + status.slice(1),
      className: BADGE_COLORS.neutral,
    }
  );
}

/**
 * Get priority info for a task priority
 */
export function getPriorityInfo(priority: string | null | undefined): PriorityInfo {
  if (!priority) {
    return PRIORITY_CONFIG.normal;
  }

  const normalized = priority.toLowerCase() as Priority;
  return PRIORITY_CONFIG[normalized] || PRIORITY_CONFIG.normal;
}

// ==================== DEFAULT VALUES ====================

export const TASK_DEFAULTS = {
  priority: PRIORITIES.NORMAL,
  status: TASK_STATUSES.IDLE,
  category: TASK_CATEGORIES.OTHER,
  task_type: TASK_TYPES.ONE_TIME,
} as const;

export const TASK_PROJECT_DEFAULTS = {
  status: TASK_PROJECT_STATUSES.PLANNING,
} as const;
