/**
 * CRON — SSOT for cron job configuration constants.
 */
export const CRON = {
  /** Max users processed per cron tick — keeps each invocation fast and bounded */
  BATCH_SIZE: 50,
} as const;
