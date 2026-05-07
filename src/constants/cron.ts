/**
 * CRON — SSOT for cron job configuration constants.
 */
export const CRON = {
  /** Max users processed per cron tick — sized to fit within Vercel's 60s limit */
  BATCH_SIZE: 50,
} as const;
